"""
webpush.py — AVISOS PUSH SIN LIBRERÍAS EXTRA
────────────────────────────────────────────
Para que el móvil reciba «Tu carta de hoy te espera» con la app cerrada, el
servidor manda un aviso al servicio push del navegador (Apple, Google,
Mozilla). Ese mensaje va CIFRADO de punta a punta con las claves que el móvil
generó al suscribirse (RFC 8291) y FIRMADO con la clave del servidor (VAPID,
RFC 8292), para que nadie más pueda mandar avisos en nombre de la app.

Se implementa aquí con `cryptography` (ya instalada por python-jose) en vez
de con pywebpush, que arrastra dependencias que no siempre compilan.

Las claves VAPID del servidor se generan solas la primera vez y se guardan en
la tabla server_keys: no hay que configurar nada en Render.
"""

import base64
import json
import logging
import os
import struct
import time
from urllib.parse import urlparse

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from jose import jwt
from sqlalchemy.exc import IntegrityError

from app import models

logger = logging.getLogger("webpush")


def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64u_dec(texto: str) -> bytes:
    texto = texto.strip()
    return base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))


def _punto(clave_publica) -> bytes:
    """Clave pública P-256 en formato «sin comprimir» (65 bytes, empieza por 0x04)."""
    return clave_publica.public_bytes(serialization.Encoding.X962,
                                      serialization.PublicFormat.UncompressedPoint)


def _hkdf(salt: bytes, ikm: bytes, info: bytes, longitud: int) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=longitud, salt=salt, info=info).derive(ikm)


def cifrar(p256dh: str, auth: str, mensaje: bytes, salt: bytes | None = None,
           clave_efimera=None) -> bytes:
    """Cifra un mensaje para un suscriptor (RFC 8291, codificación aes128gcm)."""
    ua_publica_bytes = b64u_dec(p256dh)
    secreto_auth = b64u_dec(auth)
    if len(ua_publica_bytes) != 65 or len(secreto_auth) < 16:
        raise ValueError("claves de suscripción mal formadas")
    ua_publica = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_publica_bytes)

    efimera = clave_efimera or ec.generate_private_key(ec.SECP256R1())
    as_publica_bytes = _punto(efimera.public_key())
    secreto_ecdh = efimera.exchange(ec.ECDH(), ua_publica)

    ikm = _hkdf(secreto_auth, secreto_ecdh,
                b"WebPush: info\x00" + ua_publica_bytes + as_publica_bytes, 32)
    salt = salt or os.urandom(16)
    cek = _hkdf(salt, ikm, b"Content-Encoding: aes128gcm\x00", 16)
    nonce = _hkdf(salt, ikm, b"Content-Encoding: nonce\x00", 12)

    # Un único registro: el mensaje + el delimitador 0x02 de «último registro»
    cifrado = AESGCM(cek).encrypt(nonce, mensaje + b"\x02", None)
    tam_registro = 4096
    cabecera = salt + struct.pack("!L", tam_registro) + bytes([len(as_publica_bytes)]) + as_publica_bytes
    return cabecera + cifrado


# ── Claves VAPID del servidor ─────────────────────────────

def claves_vapid(db) -> tuple[str, str]:
    """(clave privada PEM, clave pública base64url). Se crean la primera vez."""
    filas = {k.name: k.value for k in db.query(models.ServerKey)
             .filter(models.ServerKey.name.in_(["vapid_private", "vapid_public"])).all()}
    if "vapid_private" in filas and "vapid_public" in filas:
        return filas["vapid_private"], filas["vapid_public"]

    privada = ec.generate_private_key(ec.SECP256R1())
    pem = privada.private_bytes(serialization.Encoding.PEM,
                                serialization.PrivateFormat.PKCS8,
                                serialization.NoEncryption()).decode()
    publica = b64u(_punto(privada.public_key()))
    try:
        db.add(models.ServerKey(name="vapid_private", value=pem))
        db.add(models.ServerKey(name="vapid_public", value=publica))
        db.commit()
        return pem, publica
    except IntegrityError:
        db.rollback()                           # otro servidor las creó a la vez: se usan esas
        return claves_vapid(db)


def _cabecera_vapid(endpoint: str, pem: str, publica: str, contacto: str) -> str:
    destino = urlparse(endpoint)
    reclamaciones = {"aud": f"{destino.scheme}://{destino.netloc}",
                     "exp": int(time.time()) + 12 * 3600,
                     "sub": contacto}
    firma = jwt.encode(reclamaciones, pem, algorithm="ES256")
    return f"vapid t={firma}, k={publica}"


def enviar(db, sub: "models.PushSubscription", datos: dict, contacto: str) -> int:
    """
    Manda un aviso a una suscripción. Devuelve el código HTTP del servicio
    push (201 = entregado). 404/410 significan que la suscripción ya no vale.
    """
    pem, publica = claves_vapid(db)
    cuerpo = cifrar(sub.p256dh, sub.auth, json.dumps(datos, ensure_ascii=False).encode())
    cabeceras = {
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": str(6 * 3600),
        "Urgency": "normal",
        "Authorization": _cabecera_vapid(sub.endpoint, pem, publica, contacto),
    }
    r = httpx.post(sub.endpoint, content=cuerpo, headers=cabeceras, timeout=10)
    if r.status_code >= 400:
        logger.warning("Aviso push rechazado (%s): %s", r.status_code, r.text[:200])
    return r.status_code

/*
 * ornamentos/Santuario.jsx — la atmósfera de DENTRO de una estrella.
 * ─────────────────────────────────────────────────────────────────
 * Una capa fija, detrás del contenido y sin toques: la reliquia monumental de
 * la constelación (5–12 % de opacidad), una órbita que une la página con el
 * Mar, uno o dos cristales suspendidos, el motivo propio de la sección y muy
 * poco polvo de luz. Al cambiar de constelación la reliquia se funde con la
 * nueva; entre hermanas solo se desplaza un poco (la misma arquitectura,
 * otra sala).
 *
 * Composición: en móvil todo vive en los bordes y arriba (donde no hay
 * contenido); en pantallas anchas, en los márgenes a los lados de la columna.
 */
import React, { useEffect, useRef, useState } from "react";
import { identidad, ZONAS } from "./identidad";
import {
  RelicElement, OrbitalDecoration, SuspendedCrystal, LightDust, AquaticMoon, WaterArc, LiquidStar,
  AstralSeal, WaterDrop, HydroFiligree, semillaDe,
} from "./Ornamentos";

function Motivo({ id }) {
  switch (id.motivo) {
    case "cristales": return <SuspendedCrystal variante={id.orden % 2 ? "fragmento" : "cristal"} size={150} className="orn-motivo-pieza" />;
    case "estrellas": return <span className="orn-motivo-pieza orn-estrellas-grupo">
      <LiquidStar variante="secundaria" size={64} /><LiquidStar variante="pequena" size={30} /><LiquidStar variante="pequena" size={22} />
    </span>;
    case "sello": return <AstralSeal zona={id.zona} size={150} respira={false} className="orn-motivo-pieza orn-motivo-sello" />;
    case "arco": return <WaterArc variante="principal" size={260} className="orn-motivo-pieza" />;
    case "orbita": return <OrbitalDecoration variante="secundaria" size={170} className="orn-motivo-pieza" />;
    case "luna": return <AquaticMoon variante="principal" size={120} className="orn-motivo-pieza" />;
    case "gotas": return <span className="orn-motivo-pieza orn-gotas-grupo">
      <WaterDrop variante="cristalina" size={70} /><WaterDrop variante="lagrima" size={52} /><WaterDrop variante="alargada" size={44} />
    </span>;
    default: return null;
  }
}

export default function Santuario({ seccion }) {
  const id = identidad(seccion);
  // la reliquia anterior se queda un instante, desvaneciéndose, mientras llega la nueva
  const [salas, setSalas] = useState([{ zona: id.zona, clave: id.zona + ":0" }]);
  const cuenta = useRef(0);
  useEffect(() => {
    setSalas((l) => {
      if (l[l.length - 1].zona === id.zona) return l;
      cuenta.current += 1;
      return [...l.slice(-1).map((s) => ({ ...s, sale: true })), { zona: id.zona, clave: id.zona + ":" + cuenta.current }];
    });
  }, [id.zona]);
  useEffect(() => {
    if (salas.length < 2) return;
    const t = setTimeout(() => setSalas((l) => l.filter((s) => !s.sale)), 900);
    return () => clearTimeout(t);
  }, [salas]);

  // Prioridad: primero el contenido, después la ornamentación. La arquitectura
  // de fondo se monta un instante DESPUÉS de que la sección ya se ve (aparece con
  // un fundido lento, así que no se nota) y el fotograma de entrada queda ligero.
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let t;
    const r = requestAnimationFrame(() => { t = setTimeout(() => setListo(true), 320); });
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, []);

  const noche = seccion === "today" && (() => { const h = new Date().getHours(); return h >= 21 || h < 6; })();
  if (!listo) return <div className={"orn-santuario orn-z-" + id.zona} aria-hidden="true" />;
  return (
    <div className={"orn-santuario orn-z-" + id.zona} data-zona={id.zona} data-lado={id.lado} data-orden={id.orden % 3} aria-hidden="true">
      {salas.map((s) => {
        const tipo = ZONAS[s.zona]?.reliquia;
        return tipo ? (
          <div key={s.clave} className={"orn-sala" + (s.sale ? " sale" : "")} data-zona={s.zona}>
            <RelicElement tipo={tipo} size={640} className="orn-reliquia" />
            {/* una órbita incompleta alrededor de la reliquia: el cielo del Mar llega hasta aquí */}
            <OrbitalDecoration variante="principal" size={640} nodo={0} giro={id.lado === "izq" ? 12 : -12} className="orn-sala-orbita" />
          </div>
        ) : null;
      })}
      <div key={"m-" + seccion} className="orn-motivo">
        {(id.luna || noche) ? <AquaticMoon variante="principal" size={130} className="orn-motivo-pieza" /> : <Motivo id={id} />}
      </div>
      {id.zona !== "ajustes" && <SuspendedCrystal variante={id.orden % 3 === 2 ? "combinacion" : "cristal"} size={130} className="orn-cristal-margen" />}
      <HydroFiligree variante="esquina" size={150} className="orn-filigrana-margen" />
      <LightDust key={"p-" + id.zona} cantidad={8} semilla={semillaDe(seccion)} modo={id.polvo} className="orn-polvo-fondo" />
    </div>
  );
}

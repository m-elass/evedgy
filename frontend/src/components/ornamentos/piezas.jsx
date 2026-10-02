/*
 * ornamentos/piezas.jsx — las piezas básicas, para usar DENTRO de un <svg>.
 * ─────────────────────────────────────────────────────────────────────────
 * Cristal facetado, engaste dorado, destello, gota, huso, halo y eje. Todos
 * los ornamentos grandes (glifos, sellos, reliquias…) se componen con ellas,
 * así el sistema entero habla el mismo idioma: luz que sale de DENTRO del
 * cristal, facetas frías (blanco → hielo → azul → noche) y un filo de oro fino.
 *
 * `u` = unidades del viewBox por píxel de pantalla: así una línea de 0,8 px es
 * siempre de 0,8 px, se dibuje el ornamento grande o pequeño.
 * Clases `orn-d-*`: piezas que participan en la ceremonia «agua que dibuja».
 */
import React from "react";
import {
  rombo, tri, poli, lin, estrella4, destello, gota, gotaMitad, huso, husoMitad, lerp, P,
} from "./geometria";

const DIB = { pathLength: 1 };   // los trazos que se «dibujan» en la ceremonia

/* Cristal de Fontaine: rombo con cuatro facetas, diamante interior y núcleo de luz. */
export function Cristal({ x = 0, y = 0, w, h, k = 0.46, u = 1, nucleo = 1, interior = true, filo = 1, brillo = 1, className = "orn-d-cristal" }) {
  const { T, R, B, L, C } = rombo(x, y, w, h, k);
  const iw = w * 0.38, ih = h * 0.36;
  const I = rombo(C[0], C[1] - ih * k + ih / 2, iw, ih, k);
  return (
    <g className={className}>
      <path d={tri(T, L, C)} fill="url(#orn-f1)" />
      <path d={tri(T, R, C)} fill="url(#orn-f2)" />
      <path d={tri(B, L, C)} fill="url(#orn-f3)" />
      <path d={tri(B, R, C)} fill="url(#orn-f4)" />
      {interior && <>
        <path d={tri(I.T, I.L, I.B)} fill="url(#orn-fi)" opacity={0.8 * brillo} />
        <path d={tri(I.T, I.R, I.B)} className="orn-relleno-hielo" opacity={0.42 * brillo} />
      </>}
      {filo > 0 && <>
        <path d={poli([T, R, B, L])} className="orn-filo" strokeWidth={0.65 * u} opacity={0.85 * filo} />
        <path d={lin(T, B) + lin(L, R)} className="orn-arista" strokeWidth={0.5 * u} opacity={0.32 * filo} />
        <path d={lin(lerp(T, L, 0.1), lerp(T, L, 0.62))} className="orn-chispa-linea" strokeWidth={0.9 * u} opacity={0.75 * filo} />
      </>}
      {nucleo > 0 && <circle cx={C[0]} cy={C[1]} r={w * 0.34} fill="url(#orn-nucleo)" opacity={nucleo} />}
    </g>
  );
}

/* Engaste: la estrella de oro de lados cóncavos que abraza al cristal (con un velo de luz debajo). */
export function Engaste({ x = 0, y = 0, rx, arriba, abajo = arriba, cintura = 0.4, u = 1, opacidad = 0.9, velo = true, dibuja = true, className = "" }) {
  const d = estrella4(x, y, rx, arriba, cintura, abajo);
  return (
    <g className={className}>
      {velo && <path d={d} className="orn-oro-velo" strokeWidth={2.6 * u} />}
      <path d={d} className={"orn-oro" + (dibuja ? " orn-d-forma" : "")} strokeWidth={0.8 * u} opacity={opacidad} {...(dibuja ? DIB : {})} />
    </g>
  );
}

/* Destello de cuatro brazos (blanco frío u oro). */
export function Destello({ x, y, r, alto = 1, fino = 0.9, oro = false, halo = 0, className = "orn-d-chispa" }) {
  return (
    <g className={className}>
      {halo > 0 && <circle cx={x} cy={y} r={r * 1.1} fill={oro ? "url(#orn-halo-oro)" : "url(#orn-halo)"} opacity={halo} />}
      <path d={destello(x, y, r, alto, fino)} className={oro ? "orn-relleno-oro" : "orn-relleno-luz"} />
    </g>
  );
}

/* Gota de cristal facetada: punta arriba, panza abajo, con reflejo y núcleo. */
export function GotaCristal({ x = 0, y = 0, w, h, u = 1, nucleo = 0.9, filo = 1, className = "orn-d-cristal" }) {
  const g = gota(x, y, w, h);
  const a = w / 2, yc = y + h / 2 - a;
  return (
    <g className={className}>
      <path d={g.d} fill="url(#orn-f3)" />
      <path d={gotaMitad(x, y, w, h, -1)} fill="url(#orn-f1)" opacity="0.92" />
      <path d={gotaMitad(x, y, w * 0.55, h * 0.62, 1)} transform={`translate(0 ${h * 0.12})`} fill="url(#orn-f4)" opacity="0.55" />
      {filo > 0 && <>
        <path d={g.d} className="orn-filo" strokeWidth={0.6 * u} opacity={0.8 * filo} />
        <path d={`M${P(x - a * 0.55, yc - a * 0.2)}Q${P(x - a * 0.62, yc + a * 0.45)} ${P(x - a * 0.12, yc + a * 0.72)}`}
          className="orn-chispa-linea" strokeWidth={0.8 * u} opacity={0.7 * filo} />
      </>}
      {nucleo > 0 && <circle cx={x} cy={yc + a * 0.1} r={a * 0.62} fill="url(#orn-nucleo)" opacity={nucleo} />}
    </g>
  );
}

/* Huso de cristal (lente vertical) facetado. */
export function Huso({ x = 0, y = 0, w, h, u = 1, nucleo = 0.9, filo = 1, panza = 1, className = "orn-d-cristal" }) {
  return (
    <g className={className}>
      <path d={husoMitad(x, y, w, h, -1, panza)} fill="url(#orn-f1)" />
      <path d={husoMitad(x, y, w, h, 1, panza)} fill="url(#orn-f2)" />
      <path d={husoMitad(x, y + h * 0.18, w * 0.62, h * 0.55, 1, panza)} fill="url(#orn-f4)" opacity="0.6" />
      <path d={husoMitad(x, y - h * 0.06, w * 0.5, h * 0.5, -1, panza)} fill="url(#orn-fi)" opacity="0.55" />
      {filo > 0 && <>
        <path d={huso(x, y, w, h, panza)} className="orn-filo" strokeWidth={0.6 * u} opacity={0.8 * filo} />
        <path d={lin([x, y - h / 2], [x, y + h / 2])} className="orn-arista" strokeWidth={0.5 * u} opacity={0.35 * filo} />
      </>}
      {nucleo > 0 && <circle cx={x} cy={y} r={w * 0.45} fill="url(#orn-nucleo)" opacity={nucleo} />}
    </g>
  );
}

/* Estrella líquida facetada: una estrella de cuatro puntas con cuerpo de agua. */
export function EstrellaFacetada({ x = 0, y = 0, rx, arriba, abajo = arriba, cintura = 0.32, u = 1, nucleo = 1, className = "orn-d-cristal" }) {
  const T = [x, y - arriba], R = [x + rx, y], B = [x, y + abajo], L = [x - rx, y], C = [x, y];
  const ctl = (p, q) => { const m = lerp(p, q, 0.5); return lerp(m, C, cintura); };
  const cuad = (p, q) => `M${P(...C)}L${P(...p)}Q${P(...ctl(p, q))} ${P(...q)}Z`;
  return (
    <g className={className}>
      <path d={cuad(T, L)} fill="url(#orn-f1)" />
      <path d={cuad(T, R)} fill="url(#orn-f2)" />
      <path d={cuad(B, L)} fill="url(#orn-f3)" />
      <path d={cuad(B, R)} fill="url(#orn-f4)" />
      <path d={estrella4(x, y, rx, arriba, cintura, abajo)} className="orn-filo" strokeWidth={0.6 * u} opacity="0.8" />
      {nucleo > 0 && <circle cx={x} cy={y} r={Math.min(rx, arriba) * 0.62} fill="url(#orn-nucleo)" opacity={nucleo} />}
    </g>
  );
}

/* Halo de luz (degradado radial, sin filtros de desenfoque: barato en móvil). */
export function Halo({ x = 0, y = 0, r, tono = "", opacidad = 1, className = "orn-d-calma" }) {
  return <circle cx={x} cy={y} r={r} fill={`url(#${tono ? "orn-zh-" + tono : "orn-halo"})`} opacity={opacidad} className={className} />;
}

/* Eje: hilo vertical de oro (o de hielo) con huecos opcionales. */
export function Eje({ x = 0, y1, y2, u = 1, oro = true, opacidad = 0.8, dibuja = true, className = "" }) {
  return <path d={lin([x, y1], [x, y2])} className={(oro ? "orn-oro" : "orn-hielo") + (dibuja ? " orn-d-trazo" : "") + (className ? " " + className : "")}
    strokeWidth={0.7 * u} opacity={opacidad} {...(dibuja ? DIB : {})} />;
}

/* Cristal pequeño con su punta de luz (para ejes, sellos y divisores). */
export function Diamante({ x, y, w, h, u = 1, k = 0.5, chispa = true, className = "orn-d-cristal" }) {
  return (
    <g className={className}>
      <Cristal x={x} y={y} w={w} h={h} k={k} u={u} interior={w > 9} nucleo={0.8} className="" />
      {chispa && <Destello x={x} y={y - h * k - h * 0.12} r={w * 0.42} alto={1.5} className="" />}
    </g>
  );
}

export { DIB };

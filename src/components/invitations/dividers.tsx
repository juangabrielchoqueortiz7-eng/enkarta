'use client';

// Librería de separadores. Cada variante se dibuja en un viewBox de 240 de ancho
// y se tinta con UN solo color, así que la misma pieza sirve dentro de una
// plantilla (color de su paleta) y en el bloque `divider` del constructor (color
// del tema o el que elija el cliente).
//
// Dos reglas de acabado que son las que separan esto de un `<hr>` con un adorno:
//
// 1. Los filetes que flanquean un motivo NO son líneas de grosor constante:
//    nacen en punta en el extremo exterior y engordan hacia el centro (`flank`).
//    Una línea que termina de golpe se lee barata; una que se desvanece se lee
//    grabada. Es el mismo truco de la papelería fina.
// 2. Filetes al ~0.5 de opacidad y motivo central al ~0.85. A la misma opacidad
//    el conjunto se aplana y el adorno deja de ser el protagonista.

import React from 'react';
import { OrchidSprig } from './shared';

/** Filete de grosor constante (para los separadores que son solo línea). */
const rule = (c: string, x1: number, x2: number, y: number, o = 0.45, w = 1) => (
  <path d={`M${x1} ${y}H${x2}`} stroke={c} strokeWidth={w} strokeOpacity={o} strokeLinecap="round" />
);

/**
 * Filete afilado: punta en `xOut` (extremo exterior), grosor `w` en `xIn` (junto
 * al motivo). Se dibuja como relleno, no como trazo, porque un `stroke` no puede
 * variar de grosor a lo largo del recorrido.
 */
const flank = (c: string, xOut: number, xIn: number, y: number, w = 1.2, o = 0.5) => {
  const h = w / 2;
  const d = xIn - xOut;
  const a = +(xOut + d * 0.2).toFixed(2);
  const m = +(xOut + d * 0.6).toFixed(2);
  return (
    <path
      d={`M${xIn} ${y - h} C${m} ${y - h * 0.6} ${a} ${y - h * 0.1} ${xOut} ${y} C${a} ${y + h * 0.1} ${m} ${y + h * 0.6} ${xIn} ${y + h} Z`}
      fill={c} fillOpacity={o}
    />
  );
};

/** Par de filetes afilados simétricos alrededor del centro (x=120). */
const flanks = (c: string, xOut: number, xIn: number, y: number, w?: number, o?: number) => (
  <>
    {flank(c, xOut, xIn, y, w, o)}
    {flank(c, 240 - xOut, 240 - xIn, y, w, o)}
  </>
);

/** Rombo, perfilado o macizo. */
const rhomb = (c: string, x: number, y: number, r: number, filled = false, o = 0.85, sw = 1.1) => (
  <path
    d={`M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`}
    {...(filled ? { fill: c, fillOpacity: o } : { stroke: c, strokeWidth: sw, strokeOpacity: o })}
  />
);

/** Hoja (elipse girada) para las ramas. */
const leaf = (c: string, x: number, y: number, rot: number, s = 1, o = 0.8) => (
  <ellipse
    key={`${x}-${y}`} cx={x} cy={y} rx={(5.4 * s).toFixed(2)} ry={(2.1 * s).toFixed(2)}
    fill={c} fillOpacity={o} transform={`rotate(${rot} ${x} ${y})`}
  />
);

/** Pétalos repartidos en círculo, apuntando hacia fuera. */
const petals = (c: string, cx: number, cy: number, n: number, dist: number, rx: number, ry: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (360 / n) * i - 90;
    const rad = (a * Math.PI) / 180;
    const x = +(cx + Math.cos(rad) * dist).toFixed(2);
    const y = +(cy + Math.sin(rad) * dist).toFixed(2);
    return <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={c} fillOpacity={0.72} transform={`rotate(${a} ${x} ${y})`} />;
  });

/** Espeja el contenido sobre el eje vertical del viewBox (garantiza simetría). */
const mirror = (children: React.ReactNode) => (
  <g transform="translate(240,0) scale(-1,1)">{children}</g>
);

const svg = (h: number, children: React.ReactNode) => (
  <svg viewBox={`0 0 240 ${h}`} className="w-full h-auto" fill="none" aria-hidden>{children}</svg>
);

export interface DividerVariant {
  key: string;
  label: string;
  render: (color: string) => React.ReactNode;
}

export const DIVIDER_VARIANTS: DividerVariant[] = [
  {
    key: 'hairline', label: 'Filete',
    render: c => svg(20, rule(c, 16, 224, 10, 0.5)),
  },
  {
    key: 'taper', label: 'Filete afilado',
    // Punta en los dos extremos: el clásico de la papelería grabada.
    render: c => svg(20, (
      <path d="M10 10 C70 6.9 170 6.9 230 10 C170 13.1 70 13.1 10 10 Z" fill={c} fillOpacity={0.55} />
    )),
  },
  {
    key: 'double', label: 'Doble línea',
    render: c => svg(20, (
      <>
        <path d="M16 6.8 C76 5.2 164 5.2 224 6.8 C164 8.4 76 8.4 16 6.8 Z" fill={c} fillOpacity={0.5} />
        <path d="M66 13.4 C98 12.65 142 12.65 174 13.4 C142 14.15 98 14.15 66 13.4 Z" fill={c} fillOpacity={0.26} />
      </>
    )),
  },
  {
    key: 'dot', label: 'Punto',
    render: c => svg(20, (
      <>
        {flanks(c, 16, 106, 10)}
        <circle cx={120} cy={10} r={2.2} fill={c} fillOpacity={0.85} />
      </>
    )),
  },
  {
    key: 'diamond', label: 'Rombo',
    render: c => svg(20, (
      <>
        {flanks(c, 14, 96, 10)}
        <circle cx={103} cy={10} r={1.3} fill={c} fillOpacity={0.55} />
        {rhomb(c, 120, 10, 7)}
        <circle cx={137} cy={10} r={1.3} fill={c} fillOpacity={0.55} />
      </>
    )),
  },
  {
    key: 'chain', label: 'Cadena',
    render: c => svg(20, (
      <>
        {flanks(c, 14, 92, 10)}
        {rhomb(c, 102, 10, 3, true, 0.55)}
        {rhomb(c, 120, 10, 5.6)}
        {rhomb(c, 138, 10, 3, true, 0.55)}
      </>
    )),
  },
  {
    key: 'pearls', label: 'Perlas',
    render: c => svg(20, (
      <>
        {flanks(c, 12, 86, 10, 1, 0.4)}
        {[[95, 0.9], [104, 1.4], [112, 2], [120, 2.8], [128, 2], [136, 1.4], [145, 0.9]].map(([x, r]) => (
          <circle key={x} cx={x} cy={10} r={r} fill={c} fillOpacity={0.8} />
        ))}
      </>
    )),
  },
  {
    key: 'heart', label: 'Corazón',
    render: c => svg(20, (
      <>
        {flanks(c, 18, 106, 10)}
        {/* Escalado a 0.82: a tamaño natural el corazón salía macizo y ordinario. */}
        <g transform="translate(113.85,4.6) scale(0.82)">
          <path
            d="M7.5 13.2 C7.5 13.2 0.6 8.7 0.6 4.6 C0.6 2.3 2.3 0.8 4.4 0.8 C5.8 0.8 7 1.7 7.5 2.8 C8 1.7 9.2 0.8 10.6 0.8 C12.7 0.8 14.4 2.3 14.4 4.6 C14.4 8.7 7.5 13.2 7.5 13.2 Z"
            fill={c} fillOpacity={0.8}
          />
        </g>
      </>
    )),
  },
  {
    key: 'rings', label: 'Aros',
    render: c => svg(22, (
      <>
        {flanks(c, 18, 98, 11)}
        {/* Separados 8 con radio 5.2: tienen que solaparse o no son "aros". */}
        <circle cx={116} cy={11} r={5.2} stroke={c} strokeWidth={1.2} strokeOpacity={0.85} />
        <circle cx={124} cy={11} r={5.2} stroke={c} strokeWidth={1.2} strokeOpacity={0.85} />
      </>
    )),
  },
  {
    key: 'flourish', label: 'Floritura',
    render: c => {
      const half = (
        <>
          <path d="M8 11 C38 11 52 4.2 74 5.8 C90 7 99 10.2 112 11" stroke={c} strokeWidth={1.1} strokeOpacity={0.7} strokeLinecap="round" />
          <path d="M74 5.8 C82.6 8.4 79.6 12.8 70 12.5 C63.2 12.3 61.2 9.3 65 7.7" stroke={c} strokeWidth={0.9} strokeOpacity={0.5} strokeLinecap="round" />
        </>
      );
      return svg(22, (
        <>
          {half}
          {mirror(half)}
          <circle cx={120} cy={11} r={1.7} fill={c} fillOpacity={0.8} />
        </>
      ));
    },
  },
  {
    key: 'filigree', label: 'Filigrana',
    render: c => {
      const half = (
        <>
          <path d="M6 11 C34 11 46 4.2 66 5.4 C81 6.3 90 9 104 11" stroke={c} strokeWidth={1.1} strokeOpacity={0.7} strokeLinecap="round" />
          <path d="M66 5.4 C76.4 7.8 73.4 12.6 63.6 12.4 C57 12.2 55.2 9.2 59 7.6" stroke={c} strokeWidth={0.9} strokeOpacity={0.5} strokeLinecap="round" />
          <path d="M20 11 C29 13.8 40 14.2 49 12.4" stroke={c} strokeWidth={0.8} strokeOpacity={0.32} strokeLinecap="round" />
          <circle cx={110.5} cy={11} r={1.2} fill={c} fillOpacity={0.55} />
        </>
      );
      return svg(22, (
        <>
          {half}
          {mirror(half)}
          {rhomb(c, 120, 11, 4.2, false, 0.8, 1)}
        </>
      ));
    },
  },
  {
    key: 'deco', label: 'Art déco',
    render: c => {
      const half = (
        <>
          {flank(c, 12, 92, 11, 1.2, 0.5)}
          {flank(c, 34, 84, 15.8, 0.9, 0.28)}
          <path d="M100 8.2V13.8" stroke={c} strokeWidth={0.9} strokeOpacity={0.55} strokeLinecap="round" />
        </>
      );
      return svg(22, (
        <>
          {half}
          {mirror(half)}
          {rhomb(c, 120, 11, 7.8)}
          {rhomb(c, 120, 11, 3.6, true, 0.7)}
        </>
      ));
    },
  },
  {
    key: 'laurel', label: 'Laurel',
    render: c => {
      // La rama va de x=114 (centro) a x=44: antes llegaba solo a 65 y los
      // tercios exteriores quedaban vacíos, así que las dos ramas flotaban en
      // medio de la nada. Las hojas se reparten muestreando la propia curva,
      // que es lo que las deja a distancias parejas.
      const at = (t: number): [number, number] => {
        const u = 1 - t;
        return [
          +(u * u * u * 114 + 3 * u * u * t * 92 + 3 * u * t * t * 66 + t * t * t * 44).toFixed(2),
          +(u * u * u * 17 + 3 * u * u * t * 18 + 3 * u * t * t * 15.4 + t * t * t * 9.6).toFixed(2),
        ];
      };
      const half = (
        <>
          <path d="M114 17 C92 18 66 15.4 44 9.6" stroke={c} strokeWidth={1.1} strokeOpacity={0.6} strokeLinecap="round" />
          {[[0.08, -26, 1], [0.28, -30, 0.94], [0.48, -34, 0.87], [0.68, -40, 0.78], [0.87, -48, 0.66]].map(([t, rot, s]) => {
            const [x, y] = at(t as number);
            return leaf(c, x, +(y - 2.5).toFixed(2), rot as number, s as number);
          })}
          {[[0.17, 24, 0.84], [0.38, 20, 0.76], [0.59, 16, 0.68]].map(([t, rot, s]) => {
            const [x, y] = at(t as number);
            return leaf(c, x, +(y + 2.7).toFixed(2), rot as number, s as number, 0.55);
          })}
        </>
      );
      return svg(27, <>{half}{mirror(half)}</>);
    },
  },
  {
    key: 'sprig', label: 'Ramita',
    // Hojas ALTERNAS y separadas del tallo: enfrentadas de dos en dos y pegadas
    // al eje formaban un triángulo y se leía como un abeto, no como una ramita.
    // Cuatro hojas grandes y abiertas (±24°) en vez de cinco pequeñas y cerradas.
    render: c => svg(30, (
      <>
        {flanks(c, 14, 104, 24)}
        <path d="M120 24 C120.5 18 119.5 12 120 7" stroke={c} strokeWidth={1} strokeOpacity={0.55} strokeLinecap="round" />
        {([[21, -1, 1], [17.6, 1, 0.92], [14.2, -1, 0.82], [10.8, 1, 0.7]] as [number, number, number][])
          .map(([y, dir, s], i) => leaf(c, +(120 + dir * 6.2 * s).toFixed(2), y, dir * 24, s, i % 2 ? 0.62 : 0.8))}
        <circle cx={120} cy={6.2} r={1.3} fill={c} fillOpacity={0.75} />
      </>
    )),
  },
  {
    key: 'bloom', label: 'Flor',
    render: c => svg(32, (
      <>
        {flanks(c, 14, 94, 16)}
        {leaf(c, 101, 16, 12, 0.78, 0.55)}
        {petals(c, 120, 16, 5, 6.4, 5.2, 3)}
        <circle cx={120} cy={16} r={2} fill={c} fillOpacity={0.9} />
        {leaf(c, 139, 16, -12, 0.78, 0.55)}
      </>
    )),
  },
  {
    key: 'wave', label: 'Onda',
    // Seis medias ondas de 36: número par, así la curva queda equilibrada a
    // ambos lados del centro en vez de terminar en un tramo aplanado.
    render: c => svg(20, (
      <path
        d="M12 10 C24 5.5 36 5.5 48 10 C60 14.5 72 14.5 84 10 C96 5.5 108 5.5 120 10 C132 14.5 144 14.5 156 10 C168 5.5 180 5.5 192 10 C204 14.5 216 14.5 228 10"
        stroke={c} strokeWidth={1.1} strokeOpacity={0.5} strokeLinecap="round"
      />
    )),
  },
  {
    key: 'orchid', label: 'Orquídea',
    render: c => <OrchidSprig color={c} className="w-full h-auto" />,
  },
];

/** Estilos antiguos del bloque `divider` → variante equivalente. */
const ALIASES: Record<string, string> = { art: 'orchid', line: 'hairline' };

export const DEFAULT_DIVIDER = 'diamond';

export function dividerVariant(key?: string): DividerVariant {
  const k = ALIASES[key ?? ''] ?? key;
  return DIVIDER_VARIANTS.find(v => v.key === k) ?? DIVIDER_VARIANTS.find(v => v.key === DEFAULT_DIVIDER)!;
}

/**
 * Separador tematizado. `width` es el ancho máximo en px (el dibujo escala solo).
 */
export function InvitationDivider({ variant, color, width = 220, className = '', style }: {
  variant?: string;
  color: string;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`mx-auto ${className}`} style={{ width: '100%', maxWidth: width, ...style }}>
      {dividerVariant(variant).render(color)}
    </div>
  );
}

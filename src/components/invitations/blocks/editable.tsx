'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

// Edición de texto en línea para el preview del editor. Un bloque envuelve sus
// textos en <Editable k="propKey" value={...}/>; en modo edición se vuelven
// `contentEditable` y al perder el foco guardan el valor en esa prop. En modo
// lectura renderizan texto normal.
//
// Patrón clave: el contenido se fija con dangerouslySetInnerHTML (no controlado)
// y solo se confirma en onBlur → no hay re-render por tecla → el cursor no salta.

import React, { createContext, useContext } from 'react';

interface BlockEdit {
  editing: boolean;
  onEdit: (key: string, value: string) => void;
}

const Ctx = createContext<BlockEdit>({ editing: false, onEdit: () => {} });
export const BlockEditProvider = Ctx.Provider;
export const useBlockEdit = () => useContext(Ctx);

// Datos de la invitación disponibles para los bloques (p. ej. el slug para el RSVP).
interface BlockData { slug?: string }
const DataCtx = createContext<BlockData>({});
export const BlockDataProvider = DataCtx.Provider;
export const useBlockData = () => useContext(DataCtx);

function esc(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function Editable({
  k, value, as: Tag = 'span', className, style,
}: {
  k: string;
  value: string;
  as?: any;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ed = useBlockEdit();
  if (!ed.editing) {
    return <Tag className={className} style={style}>{value}</Tag>;
  }
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      data-edit-key={k}
      className={`${className ?? ''} outline-none focus:ring-1 focus:ring-amber-400/70 rounded-sm`}
      style={{ ...style, cursor: 'text' }}
      onPointerDown={(e: any) => e.stopPropagation()}
      onClick={(e: any) => e.stopPropagation()}
      onBlur={(e: any) => {
        const txt = (e.currentTarget.textContent ?? '').trim();
        if (txt !== value) ed.onEdit(k, txt);
      }}
      dangerouslySetInnerHTML={{ __html: esc(value) }}
    />
  );
}

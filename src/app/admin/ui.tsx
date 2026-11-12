'use client';

import React, { useSyncExternalStore } from 'react';
import { CABANAS, diaSemanaCorto, etiquetaCanal, hoyChile, msDe, nombreMes, sumarDias, type BarraLinea, claseCanal } from '@/lib/panelUtils';

export const fmtCLP = (n: number) => '$' + Math.round(Number(n)).toLocaleString('es-CL');

// Fecha de hoy en Chile tomada del navegador (el panel solo se dibuja ya con sesión, en el cliente).
export function useHoy(): string {
  return useSyncExternalStore(() => () => {}, hoyChile, () => '');
}

export function Cabecera({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children?: React.ReactNode }) {
  return (
    <div className="head">
      <div>
        <h1>{titulo}</h1>
        {ayuda && <p>{ayuda}</p>}
      </div>
      {children && <div className="acts">{children}</div>}
    </div>
  );
}

export function Chip({ canal }: { canal: string }) {
  return <span className={`chip ${claseCanal(canal)}`}>{etiquetaCanal(canal)}</span>;
}

export function Leyenda() {
  return (
    <div className="legend">
      <span><i className="dot" style={{ background: '#1f4a3a' }} />Web</span>
      <span><i className="dot" style={{ background: '#c2482f' }} />Airbnb</span>
      <span><i className="dot" style={{ background: '#2d5a94' }} />Booking</span>
      <span><i className="dot" style={{ background: '#5b5f66' }} />Otro</span>
      <span><i className="dot" style={{ background: '#f6dcaa', border: '1.5px dashed #b87a21' }} />Pagando ahora</span>
    </div>
  );
}

const INICIAL_DIA = 'DLMMJVS';

// Línea de tiempo de ocupación de las dos Tiny: 28 días desde `desde` (un lunes), una fila por cabaña.
export function LineaTiempo({ barras, desde, hoy }: { barras: BarraLinea[]; desde: string; hoy: string }) {
  const DIAS = 28;
  const dias = Array.from({ length: DIAS }, (_, i) => sumarDias(desde, i));

  // Cabecera de meses: un tramo por cada mes que aparece en la ventana
  const tramos: { mes: string; inicio: number; largo: number }[] = [];
  dias.forEach((d, i) => {
    const mes = nombreMes(d);
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.largo += 1;
    else tramos.push({ mes, inicio: i, largo: 1 });
  });

  return (
    <div className="tl-wrap">
      <div className="tl">
        <div />
        {tramos.map((t) => (
          <div key={t.mes + t.inicio} className="mo" style={{ gridColumn: `${t.inicio + 2} / span ${t.largo}` }}>
            {t.mes.charAt(0).toUpperCase() + t.mes.slice(1)}
          </div>
        ))}
        <div />
        {dias.map((d) => {
          const dow = new Date(msDe(d)).getUTCDay();
          const clase = d === hoy ? 'd today' : dow === 5 || dow === 6 ? 'd we' : 'd';
          return (
            <div key={d} className={clase} title={`${diaSemanaCorto(d)} ${Number(d.slice(8, 10))}`}>
              {INICIAL_DIA[dow]}
              <b>{Number(d.slice(8, 10))}</b>
            </div>
          );
        })}
        {CABANAS.map((c) => (
          <React.Fragment key={c.id}>
            <div className="rl">{c.label}<small>Tiny House</small></div>
            <div className="lane">
              {barras
                .filter((b) => b.cabana === c.id)
                .map((b) => (
                  <div key={b.clave} className={`bar ${b.clase}`} style={{ gridColumn: `${b.inicioCol} / span ${b.span}`, gridRow: 1 }} title={`${b.titulo}, ${b.detalle}`}>
                    <span>{b.titulo}</span>
                    <small>{b.detalle}</small>
                  </div>
                ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export const ICONOS: Record<string, React.ReactNode> = {
  resumen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
  ),
  reservas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></svg>
  ),
  calendario: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  precios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="8" cy="8" r="1.2" /></svg>
  ),
  ajustes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
  ),
};

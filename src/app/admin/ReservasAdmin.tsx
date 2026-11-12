'use client';

import React, { useMemo, useState } from 'react';
import { dentroDeRetencion, fechaCompleta, nombreCabana, plural, rangoCorto, type ReservaPanel } from '@/lib/panelUtils';
import type { DatosPanel } from './useDatosPanel';
import { Cabecera, fmtCLP } from './ui';

type Filtro = 'todas' | 'pagada' | 'pendiente' | 'sin_pagar' | 'rechazada';
type Situacion = Exclude<Filtro, 'todas'>;

const ETIQUETA: Record<Situacion, { texto: string; clase: string }> = {
  pagada: { texto: 'Pagada', clase: 'ok' },
  pendiente: { texto: 'Pagando ahora', clase: 'wait' },
  sin_pagar: { texto: 'No se pagó', clase: 'no' },
  rechazada: { texto: 'Rechazada', clase: 'bad' },
};

const FILTROS: { id: Filtro; titulo: string }[] = [
  { id: 'pagada', titulo: 'Pagadas' },
  { id: 'pendiente', titulo: 'Pagando ahora' },
  { id: 'sin_pagar', titulo: 'No se pagaron' },
  { id: 'rechazada', titulo: 'Rechazadas' },
  { id: 'todas', titulo: 'Todas' },
];

const fmtCreada = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
};

function personas(r: ReservaPanel) {
  if (r.adultos === null || r.adultos === undefined) return '—';
  const p = [plural(r.adultos, 'adulto', 'adultos')];
  if (r.ninos) p.push(plural(r.ninos, 'niño', 'niños'));
  if (r.bebes) p.push(plural(r.bebes, 'bebé', 'bebés'));
  if (r.mascotas) p.push(plural(r.mascotas, 'mascota', 'mascotas'));
  return p.join(', ');
}

// Una reserva "pendiente" se separa en dos: todavía dentro del tiempo para pagar, o ya vencida (no se pagó).
function situacion(r: ReservaPanel, vigenteDesde: string): Situacion {
  if (r.estado === 'pagada') return 'pagada';
  if (r.estado === 'rechazada') return 'rechazada';
  return dentroDeRetencion(r.created_at, vigenteDesde) ? 'pendiente' : 'sin_pagar';
}

// Reservas hechas en el sitio y su estado de pago. Solo muestra; no cambia nada.
export default function ReservasAdmin({ datos }: { datos: DatosPanel }) {
  const { reservas, vigenteDesde, retencionMinutos } = datos;
  const [filtro, setFiltro] = useState<Filtro>('pagada');
  const [elegidaId, setElegidaId] = useState<string | null>(null);

  const conteo = useMemo(() => {
    const c: Record<Filtro, number> = { todas: reservas.length, pagada: 0, pendiente: 0, sin_pagar: 0, rechazada: 0 };
    for (const r of reservas) c[situacion(r, vigenteDesde)] += 1;
    return c;
  }, [reservas, vigenteDesde]);

  const lista = useMemo(() => (filtro === 'todas' ? reservas : reservas.filter((r) => situacion(r, vigenteDesde) === filtro)), [reservas, filtro, vigenteDesde]);
  const elegida = lista.find((r) => r.id === elegidaId) ?? lista[0] ?? null;
  const est = elegida ? ETIQUETA[situacion(elegida, vigenteDesde)] : null;

  return (
    <>
      <Cabecera titulo="Reservas" ayuda="Las hechas en la página. Las de Airbnb y Booking se bloquean en Calendario.">
        <button type="button" className="btn" onClick={datos.recargar}>Actualizar</button>
      </Cabecera>

      {datos.error && <div className="alert bad" role="alert"><b>{datos.error}</b></div>}

      <div className="seg" role="group" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={filtro === f.id ? 'on' : ''} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.titulo}<i>{conteo[f.id]}</i>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <section className="panel"><div className="sub">No hay reservas en esta lista.</div></section>
      ) : (
        <div className="split">
          <section className="panel" style={{ padding: '8px 12px' }} aria-label="Lista de reservas">
            <div className="tbl-wrap" style={{ maxHeight: 640, overflowY: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th>Estado</th><th>Fechas</th><th>Cabaña</th><th>Huésped</th><th>Personas</th><th style={{ textAlign: 'right' }}>Total</th></tr>
                </thead>
                <tbody>
                  {lista.map((r) => {
                    const e = ETIQUETA[situacion(r, vigenteDesde)];
                    return (
                      <tr key={r.id} className={elegida?.id === r.id ? 'sel' : ''} onClick={() => setElegidaId(r.id)} style={{ cursor: 'pointer' }}>
                        <td><span className={`chip ${e.clase}`}>{e.texto}</span></td>
                        <td>{rangoCorto(r.fecha_inicio, r.fecha_fin)}<small>{plural(r.noches, 'noche', 'noches')}</small></td>
                        <td>{nombreCabana(r.cabana_id)}</td>
                        <td>
                          <button type="button" className="link" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'left' }} onClick={() => setElegidaId(r.id)} aria-label={`Ver el detalle de la reserva de ${r.huesped_nombre || 'sin nombre'}`}>
                            {r.huesped_nombre || 'Sin nombre'}
                          </button>
                          <small>{r.huesped_telefono || ''}</small>
                        </td>
                        <td>{personas(r)}</td>
                        <td className="num">{fmtCLP(r.precio_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="rcards">
              {lista.map((r) => {
                const e = ETIQUETA[situacion(r, vigenteDesde)];
                return (
                  <button type="button" key={r.id} className={`rcard ${elegida?.id === r.id ? 'sel' : ''}`} onClick={() => setElegidaId(r.id)}>
                    <span className="l1"><b>{r.huesped_nombre || 'Sin nombre'}</b><span className="tot">{fmtCLP(r.precio_total)}</span></span>
                    <small>{nombreCabana(r.cabana_id)}, {rangoCorto(r.fecha_inicio, r.fecha_fin)}, {personas(r)}</small>
                    <span><span className={`chip ${e.clase}`}>{e.texto}</span></span>
                  </button>
                );
              })}
            </div>
          </section>

          {elegida && est && (
            <aside className="panel drawer" aria-label="Detalle de la reserva">
              <span className={`chip ${est.clase}`}>{est.texto}</span>
              <h2 style={{ marginTop: 10 }}>{elegida.huesped_nombre || 'Sin nombre'}</h2>
              <div style={{ color: 'var(--mute)', fontSize: 14 }}>Tiny House {nombreCabana(elegida.cabana_id)}, {plural(elegida.noches, 'noche', 'noches')}</div>
              <hr />
              <dl className="kv">
                <dt>Llegada</dt><dd>{fechaCompleta(elegida.fecha_inicio).replace(/^./, (c) => c.toUpperCase())}</dd>
                <dt>Salida</dt><dd>{fechaCompleta(elegida.fecha_fin).replace(/^./, (c) => c.toUpperCase())}</dd>
                <dt>Personas</dt><dd>{personas(elegida)}</dd>
                {elegida.codigo_descuento && (<><dt>Código</dt><dd>{elegida.codigo_descuento}</dd></>)}
                <dt>{elegida.estado === 'pagada' ? 'Total pagado' : 'Total'}</dt><dd>{fmtCLP(elegida.precio_total)}</dd>
              </dl>
              <hr />
              <dl className="kv">
                <dt>Celular</dt><dd>{elegida.huesped_telefono || '—'}</dd>
                <dt>Correo</dt><dd style={{ overflowWrap: 'anywhere' }}>{elegida.huesped_email || '—'}</dd>
              </dl>
              <hr />
              <dl className="kv">
                <dt>Pago</dt>
                <dd>
                  {elegida.estado === 'pagada' && 'Confirmado por Flow'}
                  {elegida.estado === 'rechazada' && 'Rechazado por Flow'}
                  {elegida.estado === 'pendiente' && (est.clase === 'wait' ? `En curso: tiene ${retencionMinutos} minutos para pagar` : 'No se completó el pago')}
                </dd>
                <dt>N.º de reserva</dt><dd>{elegida.id.slice(0, 8).toUpperCase()}</dd>
                <dt>Creada</dt><dd>{fmtCreada(elegida.created_at)}</dd>
              </dl>
            </aside>
          )}
        </div>
      )}
    </>
  );
}

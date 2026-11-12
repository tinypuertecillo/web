'use client';

import React, { useMemo, useState } from 'react';
import { dentroDeRetencion, etiquetaCanal, fechaCompleta, msDe, nombreCabana, plural, rangoCorto, type Bloqueo, type CabanaId, type ReservaPanel } from '@/lib/panelUtils';
import type { DatosPanel } from './useDatosPanel';
import { Cabecera, Chip, fmtCLP } from './ui';

type Situacion = 'pagada' | 'pendiente' | 'sin_pagar' | 'rechazada';
type Filtro = 'todas' | 'otros' | Situacion;

// Una fila de la lista: reserva hecha en la web, o reserva manual (Airbnb, Booking, otro) que se ingresó en Calendario.
type Fila = {
  id: string;
  origen: 'web' | 'manual';
  cabana_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  noches: number;
  nombre: string | null;
  tel: string | null;
  email: string | null;
  canal: string;
  notas: string | null;
  pers: string;
  total: number | null;
  raw: Bloqueo | null;
  sit: Situacion | null;
  web: ReservaPanel | null;
};

const DIA = 86400000;

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
  { id: 'otros', titulo: 'Airbnb, Booking y otros' },
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

function personasManual(b: Bloqueo) {
  if (b.adultos === null || b.adultos === undefined) return '—';
  const p = [plural(b.adultos, 'adulto', 'adultos')];
  if (b.ninos) p.push(plural(b.ninos, 'niño', 'niños'));
  if (b.bebes) p.push(plural(b.bebes, 'bebé', 'bebés'));
  if (b.mascotas) p.push(plural(b.mascotas, 'mascota', 'mascotas'));
  return p.join(', ');
}

// Una reserva "pendiente" se separa en dos: todavía dentro del tiempo para pagar, o ya vencida (no se pagó).
function situacion(r: ReservaPanel, vigenteDesde: string): Situacion {
  if (r.estado === 'pagada') return 'pagada';
  if (r.estado === 'rechazada') return 'rechazada';
  return dentroDeRetencion(r.created_at, vigenteDesde) ? 'pendiente' : 'sin_pagar';
}

const nochesEntre = (a: string, b: string) => Math.max(1, Math.round((msDe(b) - msDe(a)) / DIA));

// Todas las reservas: las pagadas en la web y las que se ingresaron a mano (Airbnb, Booking u otro).
export default function ReservasAdmin({ datos }: { datos: DatosPanel }) {
  const { reservas, bloqueos, vigenteDesde, retencionMinutos } = datos;
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [f, setF] = useState({ cabana: 'naciente' as CabanaId, desde: '', hasta: '', canal: 'airbnb', nombre: '', tel: '', email: '', notas: '', adultos: '', ninos: '', bebes: '', mascotas: '', valor: '' });

  const filas = useMemo<Fila[]>(() => {
    const web: Fila[] = reservas.map((r) => ({
      id: r.id, origen: 'web', cabana_id: r.cabana_id, fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, noches: r.noches,
      nombre: r.huesped_nombre, tel: r.huesped_telefono, email: r.huesped_email, canal: 'web', notas: null, pers: personas(r), total: r.precio_total, raw: null, sit: situacion(r, vigenteDesde), web: r,
    }));
    // Los bloqueos de canal "web" son el calendario de una reserva pagada: ya aparecen arriba
    const manual: Fila[] = bloqueos.filter((b: Bloqueo) => b.canal !== 'web').map((b) => ({
      id: b.id, origen: 'manual', cabana_id: b.cabana_id, fecha_inicio: b.fecha_inicio, fecha_fin: b.fecha_fin, noches: nochesEntre(b.fecha_inicio, b.fecha_fin),
      nombre: b.huesped_nombre, tel: b.huesped_telefono, email: b.huesped_email, canal: b.canal, notas: b.notas, pers: personasManual(b), total: b.precio_total ?? null, raw: b, sit: null, web: null,
    }));
    return [...web, ...manual].sort((a, b) => (a.fecha_inicio < b.fecha_inicio ? 1 : a.fecha_inicio > b.fecha_inicio ? -1 : 0));
  }, [reservas, bloqueos, vigenteDesde]);

  const conteo = useMemo(() => {
    const c: Record<Filtro, number> = { todas: filas.length, otros: 0, pagada: 0, pendiente: 0, sin_pagar: 0, rechazada: 0 };
    for (const x of filas) {
      if (x.origen === 'manual') c.otros += 1;
      else if (x.sit) c[x.sit] += 1;
    }
    return c;
  }, [filas]);

  const lista = useMemo(() => {
    if (filtro === 'todas') return filas;
    if (filtro === 'otros') return filas.filter((x) => x.origen === 'manual');
    return filas.filter((x) => x.sit === filtro);
  }, [filas, filtro]);
  const elegida = lista.find((x) => x.id === elegidaId) ?? lista[0] ?? null;
  const est = elegida?.sit ? ETIQUETA[elegida.sit] : null;
  const enCurso = elegida?.sit === 'pendiente';

  function elegir(id: string) {
    setElegidaId(id);
    setEditando(false);
    setMsg(null);
  }

  function empezarEdicion(x: Fila) {
    setF({
      cabana: (x.cabana_id === 'poniente' ? 'poniente' : 'naciente') as CabanaId,
      desde: x.fecha_inicio, hasta: x.fecha_fin, canal: x.canal === 'web' ? 'airbnb' : x.canal,
      nombre: x.nombre ?? '', tel: x.tel ?? '', email: x.email ?? '', notas: x.notas ?? '',
      adultos: x.raw?.adultos != null ? String(x.raw.adultos) : '', ninos: x.raw?.ninos != null ? String(x.raw.ninos) : '',
      bebes: x.raw?.bebes != null ? String(x.raw.bebes) : '', mascotas: x.raw?.mascotas != null ? String(x.raw.mascotas) : '',
      valor: x.raw?.precio_total != null ? String(x.raw.precio_total) : '',
    });
    setMsg(null);
    setEditando(true);
  }

  async function guardar(x: Fila) {
    setGuardando(true);
    setMsg(null);
    try {
      const esManual = x.origen === 'manual';
      const res = await fetch(esManual ? '/api/admin/bloqueos' : '/api/admin/reservas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(esManual
          ? { id: x.id, cabanaId: f.cabana, fechaInicio: f.desde, fechaFin: f.hasta, canal: f.canal, huespedNombre: f.nombre, huespedTelefono: f.tel, huespedEmail: f.email, notas: f.notas, adultos: f.adultos, ninos: f.ninos, bebes: f.bebes, mascotas: f.mascotas, precioTotal: f.valor }
          : { id: x.id, huespedNombre: f.nombre, huespedTelefono: f.tel, huespedEmail: f.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || 'No se pudo guardar el cambio.' });
      } else {
        setMsg({ ok: true, text: 'Cambios guardados.' });
        setEditando(false);
        datos.recargar();
      }
    } catch {
      setMsg({ ok: false, text: 'No se pudo conectar. Intenta de nuevo.' });
    }
    setGuardando(false);
  }

  async function eliminar(x: Fila) {
    const quien = `${x.nombre || 'Sin nombre'} (${rangoCorto(x.fecha_inicio, x.fecha_fin)})`;
    const pagada = x.sit === 'pagada';
    const pregunta = pagada
      ? `La reserva de ${quien} está PAGADA. Si la eliminas se borra del registro y sus fechas quedan libres, pero el pago no se devuelve solo. Esto no se puede deshacer. ¿Eliminarla?`
      : `¿Eliminar la reserva de ${quien}? Sus fechas quedarán libres. Esto no se puede deshacer.`;
    if (!confirm(pregunta)) return;
    setMsg(null);
    try {
      const url = x.origen === 'manual' ? `/api/admin/bloqueos?id=${encodeURIComponent(x.id)}` : `/api/admin/reservas?id=${encodeURIComponent(x.id)}${pagada ? '&confirmarPagada=1' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || 'No se pudo eliminar la reserva.' });
        return;
      }
      setMsg({ ok: true, text: 'Reserva eliminada.' });
      setEditando(false);
      datos.recargar();
    } catch {
      setMsg({ ok: false, text: 'No se pudo conectar. Intenta de nuevo.' });
    }
  }

  const estado = (x: Fila) => (x.sit ? <span className={`chip ${ETIQUETA[x.sit].clase}`}>{ETIQUETA[x.sit].texto}</span> : <Chip canal={x.canal} />);
  const personasDe = (x: Fila) => x.pers;

  return (
    <>
      <Cabecera titulo="Reservas" ayuda="Todas: las de la página y las de Airbnb, Booking u otros canales. Elige una para verla o editarla.">
        <button type="button" className="btn" onClick={datos.recargar}>Actualizar</button>
      </Cabecera>

      {datos.error && <div className="alert bad" role="alert"><b>{datos.error}</b></div>}
      {msg && !elegida && <div className={msg.ok ? 'msg-ok' : 'alert bad'} role="status">{msg.ok ? msg.text : <b>{msg.text}</b>}</div>}

      <div className="seg" role="group" aria-label="Filtrar por estado">
        {FILTROS.map((fl) => (
          <button key={fl.id} type="button" className={filtro === fl.id ? 'on' : ''} aria-pressed={filtro === fl.id} onClick={() => setFiltro(fl.id)}>
            {fl.titulo}<i>{conteo[fl.id]}</i>
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
                  <tr><th>Estado</th><th>Fechas</th><th>Cabaña</th><th>Huésped</th><th>Personas</th><th style={{ textAlign: 'right' }}>Total</th><th aria-label="Acciones" /></tr>
                </thead>
                <tbody>
                  {lista.map((x) => (
                    <tr key={x.id} className={elegida?.id === x.id ? 'sel' : ''} onClick={() => elegir(x.id)} style={{ cursor: 'pointer' }}>
                      <td>{estado(x)}</td>
                      <td>{rangoCorto(x.fecha_inicio, x.fecha_fin)}<small>{plural(x.noches, 'noche', 'noches')}</small></td>
                      <td>{nombreCabana(x.cabana_id)}</td>
                      <td>
                        <button type="button" className="link" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'left' }} onClick={() => elegir(x.id)} aria-label={`Ver el detalle de la reserva de ${x.nombre || 'sin nombre'}`}>
                          {x.nombre || 'Sin nombre'}
                        </button>
                        <small>{x.tel || ''}</small>
                      </td>
                      <td>{personasDe(x)}</td>
                      <td className="num">{x.total !== null ? fmtCLP(x.total) : '—'}</td>
                      <td style={{ width: 80, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {x.sit !== 'pendiente' && (
                          <>
                            <button type="button" className="icon-btn" title="Editar reserva" aria-label={`Editar la reserva de ${x.nombre || 'sin nombre'}`} onClick={(ev) => { ev.stopPropagation(); setElegidaId(x.id); empezarEdicion(x); }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                            </button>
                            <button type="button" className="icon-btn" title="Eliminar reserva" aria-label={`Eliminar la reserva de ${x.nombre || 'sin nombre'}`} onClick={(ev) => { ev.stopPropagation(); eliminar(x); }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rcards">
              {lista.map((x) => (
                <button type="button" key={x.id} className={`rcard ${elegida?.id === x.id ? 'sel' : ''}`} onClick={() => elegir(x.id)}>
                  <span className="l1"><b>{x.nombre || 'Sin nombre'}</b><span className="tot">{x.total !== null ? fmtCLP(x.total) : etiquetaCanal(x.canal)}</span></span>
                  <small>{nombreCabana(x.cabana_id)}, {rangoCorto(x.fecha_inicio, x.fecha_fin)}{x.pers !== '—' ? `, ${x.pers}` : ''}</small>
                  <span>{estado(x)}</span>
                </button>
              ))}
            </div>
          </section>

          {elegida && (
            <aside className="panel drawer" aria-label="Detalle de la reserva">
              {estado(elegida)}
                <>
                  <h2 style={{ marginTop: 10 }}>{elegida.nombre || 'Sin nombre'}</h2>
                  <div style={{ color: 'var(--mute)', fontSize: 14 }}>Tiny House {nombreCabana(elegida.cabana_id)}, {plural(elegida.noches, 'noche', 'noches')}</div>
                  <hr />
                  <dl className="kv">
                    <dt>Llegada</dt><dd>{fechaCompleta(elegida.fecha_inicio).replace(/^./, (c) => c.toUpperCase())}</dd>
                    <dt>Salida</dt><dd>{fechaCompleta(elegida.fecha_fin).replace(/^./, (c) => c.toUpperCase())}</dd>
                    {elegida.web && (<><dt>Personas</dt><dd>{personas(elegida.web)}</dd></>)}
                    {elegida.web?.codigo_descuento && (<><dt>Código</dt><dd>{elegida.web.codigo_descuento}</dd></>)}
                    {elegida.web && (<><dt>{elegida.web.estado === 'pagada' ? 'Total pagado' : 'Total'}</dt><dd>{fmtCLP(elegida.web.precio_total)}</dd></>)}
                    {!elegida.web && (<><dt>Personas</dt><dd>{elegida.pers}</dd><dt>Canal</dt><dd>{etiquetaCanal(elegida.canal)}</dd><dt>Valor</dt><dd>{elegida.total !== null ? fmtCLP(elegida.total) : '—'}</dd></>)}
                  </dl>
                  <hr />
                  <dl className="kv">
                    <dt>Celular</dt><dd>{elegida.tel || '—'}</dd>
                    <dt>Correo</dt><dd style={{ overflowWrap: 'anywhere' }}>{elegida.email || '—'}</dd>
                    {elegida.notas && (<><dt>Notas</dt><dd>{elegida.notas}</dd></>)}
                  </dl>
                  {elegida.web && est && (
                    <>
                      <hr />
                      <dl className="kv">
                        <dt>Pago</dt>
                        <dd>
                          {elegida.web.estado === 'pagada' && 'Confirmado por Flow'}
                          {elegida.web.estado === 'rechazada' && 'Rechazado por Flow'}
                          {elegida.web.estado === 'pendiente' && (est.clase === 'wait' ? `En curso: tiene ${retencionMinutos} minutos para pagar` : 'No se completó el pago')}
                        </dd>
                        <dt>N.º de reserva</dt><dd>{elegida.id.slice(0, 8).toUpperCase()}</dd>
                        <dt>Creada</dt><dd>{fmtCreada(elegida.web.created_at)}</dd>
                      </dl>
                    </>
                  )}
                  {msg && <div className={msg.ok ? 'msg-ok' : 'msg-err'} role="status" style={{ marginTop: 12 }}>{msg.text}</div>}
                  {!enCurso && (
                    <>
                      <hr />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="btn" onClick={() => empezarEdicion(elegida)}>Editar</button>
                        <button type="button" className="btn danger" onClick={() => eliminar(elegida)}>Eliminar</button>
                      </div>
                    </>
                  )}
                </>
            </aside>
          )}

          {elegida && editando && (
            <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditando(false); setMsg(null); } }}>
              <form className="modal" role="dialog" aria-modal="true" aria-labelledby="e-titulo" onSubmit={(e) => { e.preventDefault(); guardar(elegida); }} onKeyDown={(e) => { if (e.key === 'Escape') { setEditando(false); setMsg(null); } }}>
                <div className="modal-cab">
                  <div>
                    <h2 id="e-titulo">Editar reserva</h2>
                    <div className="sub">{elegida.nombre || 'Sin nombre'}, Tiny House {nombreCabana(elegida.cabana_id)}</div>
                  </div>
                  <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => { setEditando(false); setMsg(null); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
                <div className="modal-cuerpo">
                  {elegida.origen === 'manual' ? (
                    <>
                      <div className="field">
                        <span id="e-cab" style={{ fontWeight: 600, fontSize: 13 }}>Cabaña</span>
                        <div className="seg" role="group" aria-labelledby="e-cab">
                          {(['naciente', 'poniente'] as CabanaId[]).map((c) => (
                            <button key={c} type="button" className={f.cabana === c ? 'on' : ''} aria-pressed={f.cabana === c} onClick={() => setF({ ...f, cabana: c })}>{nombreCabana(c)}</button>
                          ))}
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor="e-canal">Canal</label>
                        <div className="inp"><select id="e-canal" value={f.canal} onChange={(e) => setF({ ...f, canal: e.target.value })}><option value="airbnb">Airbnb</option><option value="booking">Booking</option><option value="otro">Otro</option></select></div>
                      </div>
                      <div className="field"><label htmlFor="e-desde">Llegada</label><div className="inp"><input id="e-desde" type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></div></div>
                      <div className="field"><label htmlFor="e-hasta">Salida</label><div className="inp"><input id="e-hasta" type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></div></div>
                    </>
                  ) : (
                    <div className="sub modal-ancho">Las fechas y el pago de una reserva hecha en la web no se cambian. Aquí corriges los datos del huésped.</div>
                  )}
                  {elegida.origen === 'manual' && (
                    <>
                      <div className="field"><label htmlFor="e-adu">Adultos</label><div className="inp"><input id="e-adu" type="number" min="0" inputMode="numeric" value={f.adultos} onChange={(e) => setF({ ...f, adultos: e.target.value })} /></div></div>
                      <div className="field"><label htmlFor="e-nin">Niños</label><div className="inp"><input id="e-nin" type="number" min="0" inputMode="numeric" value={f.ninos} onChange={(e) => setF({ ...f, ninos: e.target.value })} /></div></div>
                      <div className="field"><label htmlFor="e-beb">Bebés</label><div className="inp"><input id="e-beb" type="number" min="0" inputMode="numeric" value={f.bebes} onChange={(e) => setF({ ...f, bebes: e.target.value })} /></div></div>
                      <div className="field"><label htmlFor="e-mas">Mascotas</label><div className="inp"><input id="e-mas" type="number" min="0" inputMode="numeric" value={f.mascotas} onChange={(e) => setF({ ...f, mascotas: e.target.value })} /></div></div>
                      <div className="field modal-ancho"><label htmlFor="e-valor">Valor de la reserva (CLP)</label><div className="inp"><span>$</span><input id="e-valor" type="number" min="0" inputMode="numeric" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="Lo que pagó el huésped" /></div></div>
                    </>
                  )}
                  <div className="field"><label htmlFor="e-nom">Nombre del huésped</label><div className="inp"><input id="e-nom" type="text" autoFocus value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div></div>
                  <div className="field"><label htmlFor="e-cel">Celular</label><div className="inp"><input id="e-cel" type="tel" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} /></div></div>
                  <div className="field"><label htmlFor="e-mail">Correo</label><div className="inp"><input id="e-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div></div>
                  {elegida.origen === 'manual' && (
                    <div className="field"><label htmlFor="e-notas">Notas</label><div className="inp"><input id="e-notas" type="text" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} placeholder="Ej: reserva por Booking" /></div></div>
                  )}
                </div>
                <div className="modal-pie">
                  {msg && !msg.ok ? <span className="msg-err" role="alert">{msg.text}</span> : <span />}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn" onClick={() => { setEditando(false); setMsg(null); }}>Cancelar</button>
                    <button type="submit" className="btn pri" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}

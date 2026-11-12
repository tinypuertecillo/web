'use client';

import React, { useMemo, useState } from 'react';
import { barrasLinea, lunesDe, nombreCabana, pagosEnCurso, rangoFechas, type CabanaId } from '@/lib/panelUtils';
import type { DatosPanel } from './useDatosPanel';
import { Cabecera, Chip, Leyenda, LineaTiempo, useHoy } from './ui';

type Msg = { ok: boolean; text: string } | null;

// Calendario: ocupación de las dos Tiny y bloqueo de fechas para reservas de Airbnb, Booking u otros medios.
export default function CalendarioAdmin({ datos }: { datos: DatosPanel }) {
  const hoy = useHoy();
  const { bloqueos, reservas, vigenteDesde, retencionMinutos, cargadoEn } = datos;

  const [cabana, setCabana] = useState<CabanaId>('naciente');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [canal, setCanal] = useState('airbnb');
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [notas, setNotas] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [guardando, setGuardando] = useState(false);

  const barras = useMemo(() => {
    if (!hoy) return [];
    return barrasLinea(bloqueos, pagosEnCurso(reservas, vigenteDesde, retencionMinutos, cargadoEn), lunesDe(hoy), 28);
  }, [hoy, bloqueos, reservas, vigenteDesde, retencionMinutos, cargadoEn]);

  // Las fechas pasadas quedan al final: arriba lo que viene
  const lista = useMemo(() => {
    const futuras = bloqueos.filter((b) => b.fecha_fin >= hoy);
    const pasadas = bloqueos.filter((b) => b.fecha_fin < hoy);
    return { futuras, pasadas: pasadas.reverse() };
  }, [bloqueos, hoy]);

  async function bloquear(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!desde || !hasta) {
      setMsg({ ok: false, text: 'Elige la fecha de inicio y la de fin.' });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/bloqueos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cabanaId: cabana, fechaInicio: desde, fechaFin: hasta, canal, huespedNombre: nombre, huespedTelefono: celular, huespedEmail: correo, notas }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || 'No se pudo bloquear la fecha.' });
      } else {
        setDesde('');
        setHasta('');
        setNombre('');
        setCelular('');
        setCorreo('');
        setNotas('');
        setMsg({ ok: true, text: 'Fechas bloqueadas.' });
        datos.recargar();
      }
    } catch {
      setMsg({ ok: false, text: 'No se pudo conectar. Intenta de nuevo.' });
    }
    setGuardando(false);
  }

  async function desbloquear(id: string, esWeb: boolean, etiqueta: string) {
    const pregunta = esWeb
      ? `Esta es una reserva pagada por la web (${etiqueta}). Si la desbloqueas, esas fechas quedarán libres para otros huéspedes, pero el pago no se devuelve solo. ¿Seguro?`
      : `¿Desbloquear ${etiqueta}?`;
    if (!confirm(pregunta)) return;
    const res = await fetch(`/api/admin/bloqueos?id=${encodeURIComponent(id)}${esWeb ? '&confirmarWeb=1' : ''}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: data.error || 'No se pudo desbloquear.' });
      return;
    }
    setMsg({ ok: true, text: 'Fechas desbloqueadas.' });
    datos.recargar();
  }

  if (!hoy) return <div className="skel" aria-hidden="true" />;

  return (
    <>
      <Cabecera titulo="Calendario" ayuda="Qué días están ocupados. Bloquea aquí las reservas de Airbnb, Booking u otros canales.">
        <button type="button" className="btn" onClick={datos.recargar}>Actualizar</button>
      </Cabecera>

      {datos.error && <div className="alert bad" role="alert"><b>{datos.error}</b></div>}

      <section className="panel" aria-label="Ocupación de las dos Tiny">
        <div className="pan-head">
          <div><h2>Próximas 4 semanas</h2></div>
          <Leyenda />
        </div>
        <LineaTiempo barras={barras} desde={lunesDe(hoy)} hoy={hoy} />
      </section>

      <div className="two wl">
        <form className="panel" onSubmit={bloquear} aria-label="Bloquear fechas">
          <h2>Bloquear fechas</h2>
          <div className="sub" style={{ marginBottom: 16 }}>Solo las fechas son obligatorias.</div>
          <div className="stk">
            <div className="field">
              <span id="l-cab" style={{ fontWeight: 600, fontSize: 14 }}>Cabaña</span>
              <div className="seg" role="group" aria-labelledby="l-cab">
                {(['naciente', 'poniente'] as CabanaId[]).map((c) => (
                  <button key={c} type="button" className={cabana === c ? 'on' : ''} aria-pressed={cabana === c} onClick={() => setCabana(c)}>Tiny House {nombreCabana(c)}</button>
                ))}
              </div>
            </div>
            <div className="fields">
              <div className="field"><label htmlFor="b-desde">Desde</label><div className="inp"><input id="b-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div></div>
              <div className="field"><label htmlFor="b-hasta">Hasta</label><div className="inp"><input id="b-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div></div>
            </div>
            <div className="field">
              <label htmlFor="b-canal">Canal</label>
              <div className="inp">
                <select id="b-canal" value={canal} onChange={(e) => setCanal(e.target.value)}>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="field"><label htmlFor="b-nom">Nombre del huésped (opcional)</label><div className="inp"><input id="b-nom" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div></div>
            <div className="fields">
              <div className="field"><label htmlFor="b-cel">Celular (opcional)</label><div className="inp"><input id="b-cel" type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} /></div></div>
              <div className="field"><label htmlFor="b-mail">Correo (opcional)</label><div className="inp"><input id="b-mail" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></div></div>
            </div>
            <div className="field"><label htmlFor="b-notas">Notas (opcional)</label><div className="inp"><input id="b-notas" type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: reserva por Airbnb" /></div></div>
            <div className="foot">
              <button type="submit" className="btn pri" disabled={guardando}>{guardando ? 'Bloqueando…' : 'Bloquear fechas'}</button>
              {msg && <span className={msg.ok ? 'msg-ok' : 'msg-err'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</span>}
            </div>
          </div>
        </form>

        <section className="panel" aria-label="Fechas bloqueadas">
          <h2>Fechas bloqueadas</h2>
          <div className="sub" style={{ marginBottom: 12 }}>Liberar una reserva pagada por la web pide confirmación.</div>
          {lista.futuras.length === 0 && <div className="sub">No hay fechas bloqueadas por venir.</div>}
          <div className="list" style={{ maxHeight: 640, overflowY: 'auto' }}>
            {lista.futuras.map((b) => {
              const esWeb = b.canal === 'web';
              const etiqueta = `${nombreCabana(b.cabana_id)}, ${rangoFechas(b.fecha_inicio, b.fecha_fin)}`;
              return (
                <div className="item" key={b.id}>
                  <div>
                    <b>{etiqueta}</b>
                    <small>{[b.huesped_nombre, b.huesped_telefono, b.huesped_email].filter(Boolean).join(', ') || 'Sin datos del huésped'}{b.notas ? ` · ${b.notas}` : ''}</small>
                  </div>
                  <div className="acts">
                    <Chip canal={b.canal} />
                    {esWeb && <span className="chip ok">Pagada</span>}
                    <button type="button" className="btn sm danger" onClick={() => desbloquear(b.id, esWeb, etiqueta)}>Desbloquear</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

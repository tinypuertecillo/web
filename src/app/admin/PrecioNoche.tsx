'use client';

import React, { useState } from 'react';
import { calcularPrecioConConfig, type DescuentoNoches, type ExtrasHuespedes } from '@/lib/pricingCore';
import { fmtCLP } from './ui';

type Msg = { ok: boolean; text: string } | null;

type Props = {
  precioNoche: number | null;
  precioFinSemana: number | null;
  descuentos: DescuentoNoches[];
  extras: ExtrasHuespedes | undefined;
  onGuardado: () => void;
};

// Precio base por noche (domingo a jueves) y de viernes y sábado, igual para las dos cabañas.
// El padre lo vuelve a crear (key) cuando cambian los valores guardados, así los campos parten siempre de lo guardado.
export default function PrecioNoche({ precioNoche, precioFinSemana, descuentos, extras, onGuardado }: Props) {
  const [semana, setSemana] = useState(precioNoche === null ? '' : String(precioNoche));
  const [finde, setFinde] = useState(precioFinSemana ? String(precioFinSemana) : '');
  const [msg, setMsg] = useState<Msg>(null);
  const [guardando, setGuardando] = useState(false);

  const limpio = (v: string) => v.replace(/[.\s]/g, '');
  const valorSemana = Number(limpio(semana));
  const valorFinde = finde.trim() === '' ? null : Number(limpio(finde));

  // Vista previa: 2 noches de lunes a miércoles, 1 adulto, con el precio que está escrito y tus descuentos por noches
  const previa = Number.isInteger(valorSemana) && valorSemana > 0
    ? calcularPrecioConConfig('2030-01-07', '2030-01-09', { precioBase: valorSemana, descuentos, precioFinSemana: null, tarifas: [], extras })
    : null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!Number.isInteger(valorSemana) || valorSemana <= 0) {
      setMsg({ ok: false, text: 'Escribe un precio de domingo a jueves válido: número entero, sin decimales.' });
      return;
    }
    if (valorFinde !== null && (!Number.isInteger(valorFinde) || valorFinde <= 0)) {
      setMsg({ ok: false, text: 'Escribe un precio de viernes y sábado válido, o déjalo vacío.' });
      return;
    }
    setGuardando(true);
    try {
      const [res, resFin] = await Promise.all([
        fetch('/api/admin/precios/base', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ precioNoche: valorSemana }) }),
        fetch('/api/admin/precios/ajustes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ precioFinSemana: valorFinde }) }),
      ]);
      if (!res.ok || !resFin.ok) {
        const data = await (res.ok ? resFin : res).json().catch(() => ({}));
        setMsg({ ok: false, text: data.error || 'No se pudieron guardar los precios.' });
      } else {
        setMsg({ ok: true, text: 'Precios guardados para las dos cabañas.' });
        onGuardado();
      }
    } catch {
      setMsg({ ok: false, text: 'No se pudo conectar. Intenta de nuevo.' });
    }
    setGuardando(false);
  }

  return (
    <>
      <form className="panel" onSubmit={guardar} aria-label="Precio por noche">
        <h2>Precio por noche</h2>
        <div className="sub" style={{ marginBottom: 18 }}>Igual para las dos cabañas.</div>
        <div className="fields">
          <div className="field">
            <label htmlFor="p-semana">Domingo a jueves</label>
            <div className="inp"><span>$</span><input id="p-semana" type="text" inputMode="numeric" value={semana} onChange={(e) => setSemana(e.target.value)} /></div>
            
          </div>
          <div className="field">
            <label htmlFor="p-finde">Viernes y sábado</label>
            <div className="inp"><span>$</span><input id="p-finde" type="text" inputMode="numeric" value={finde} onChange={(e) => setFinde(e.target.value)} placeholder="Igual al de domingo a jueves" /></div>
            <small>Vacío = igual que entre semana.</small>
          </div>
        </div>
        <div className="foot">
          <button type="submit" className="btn pri" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar precios'}</button>
          {msg && <span className={msg.ok ? 'msg-ok' : 'msg-err'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</span>}
        </div>
      </form>

      <aside className="preview" aria-label="Vista previa para el huésped">
        <h2>Así lo verá el huésped</h2>
        {previa ? (
          <>
            <div className="sub" style={{ marginBottom: 12 }}>2 noches entre semana, 1 adulto.</div>
            <div className="pl"><span>2 noches</span><span>{fmtCLP(previa.subtotalNoches)}</span></div>
            {previa.descuento > 0 && <div className="pl"><span>Descuento por 2 noches ({previa.descuentoPct} %)</span><span>−{fmtCLP(previa.descuento)}</span></div>}
            <div className="pl tot"><span>Total a pagar</span><span>{fmtCLP(previa.total)}</span></div>
            {valorFinde !== null && Number.isInteger(valorFinde) && valorFinde > 0 && <div className="note">Viernes y sábado: {fmtCLP(valorFinde)} por noche.</div>}
          </>
        ) : (
          <div className="sub">Escribe el precio por noche para ver cuánto pagaría el huésped.</div>
        )}
      </aside>
    </>
  );
}

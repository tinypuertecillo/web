'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { EXTRAS_POR_DEFECTO, type Capacidad, type ExtrasHuespedes, type TipoHuesped } from '@/lib/pricingCore';

const INPUT = 'border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]';
const LABEL = 'text-[11px] uppercase tracking-wide text-secondary font-bold';
const CARD = 'w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4 mb-10';
const BTN = 'rounded-lg py-3.5 px-6 text-[15px] font-semibold bg-[#163428] text-white hover:opacity-90 transition-opacity disabled:opacity-50';

const TIPOS: { tipo: TipoHuesped; titulo: string; detalle: string }[] = [
  { tipo: 'adulto', titulo: 'Adulto adicional', detalle: 'Desde el 2º adulto' },
  { tipo: 'nino', titulo: 'Niño', detalle: 'De 2 a 12 años' },
  { tipo: 'bebe', titulo: 'Bebé', detalle: 'Menos de 2 años' },
  { tipo: 'mascota', titulo: 'Mascota', detalle: 'Por mascota' },
];

const CABANAS = [
  { id: 'naciente', label: 'Naciente' },
  { id: 'poniente', label: 'Poniente' },
] as const;

type Cabana = (typeof CABANAS)[number]['id'];
type Msg = { ok: boolean; text: string } | null;

type ExtrasForm = Record<TipoHuesped, { tipo: 'porcentaje' | 'monto'; valor: string }>;
type CapForm = Record<Cabana, { maxHuespedes: string; maxMascotas: string }>;

const aForm = (e: ExtrasHuespedes): ExtrasForm => {
  const f = {} as ExtrasForm;
  for (const { tipo } of TIPOS) f[tipo] = { tipo: e[tipo].tipo, valor: e[tipo].valor ? String(e[tipo].valor) : '' };
  return f;
};

const capAForm = (c: Record<Cabana, Capacidad>): CapForm => ({
  naciente: { maxHuespedes: String(c.naciente.maxHuespedes), maxMascotas: String(c.naciente.maxMascotas) },
  poniente: { maxHuespedes: String(c.poniente.maxHuespedes), maxMascotas: String(c.poniente.maxMascotas) },
});

export default function HuespedesAdmin({ precioBase, descuentoPct }: { precioBase: number | null; descuentoPct: number }) {
  const [extras, setExtras] = useState<ExtrasForm>(aForm(EXTRAS_POR_DEFECTO));
  const [cap, setCap] = useState<CapForm>({ naciente: { maxHuespedes: '4', maxMascotas: '1' }, poniente: { maxHuespedes: '4', maxMascotas: '1' } });
  const [msg, setMsg] = useState<Msg>(null);
  const [guardando, setGuardando] = useState(false);

  const fetchTodo = useCallback(async () => {
    const [a, c] = await Promise.all([fetch('/api/admin/precios/ajustes'), fetch('/api/admin/precios/capacidad')]);
    return {
      extras: a.ok ? ((await a.json()).extras as ExtrasHuespedes | undefined) : undefined,
      capacidad: c.ok ? ((await c.json()).capacidad as Record<Cabana, Capacidad>) : undefined,
    };
  }, []);

  useEffect(() => {
    fetchTodo().then((d) => {
      if (d.extras) setExtras(aForm(d.extras));
      if (d.capacidad) setCap(capAForm(d.capacidad));
    });
  }, [fetchTodo]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setGuardando(true);

    // El PUT de ajustes también guarda descuento y fin de semana, así que se leen los actuales primero.
    const actual = await fetch('/api/admin/precios/ajustes').then((r) => (r.ok ? r.json() : null));
    if (!actual) {
      setGuardando(false);
      setMsg({ ok: false, text: 'No se pudo leer la configuración actual' });
      return;
    }

    const r1 = await fetch('/api/admin/precios/ajustes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descuentoPct: actual.descuentoPct,
        precioFinSemana: actual.precioFinSemana,
        extras: Object.fromEntries(TIPOS.map(({ tipo }) => [tipo, { tipo: extras[tipo].tipo, valor: Number(extras[tipo].valor || 0) }])),
      }),
    });
    const d1 = await r1.json().catch(() => ({}));
    if (!r1.ok) {
      setGuardando(false);
      setMsg({ ok: false, text: d1.error || 'No se pudieron guardar los adicionales' });
      return;
    }

    const r2 = await fetch('/api/admin/precios/capacidad', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capacidad: Object.fromEntries(
          CABANAS.map(({ id }) => [id, { maxHuespedes: Number(cap[id].maxHuespedes), maxMascotas: Number(cap[id].maxMascotas || 0) }])
        ),
      }),
    });
    const d2 = await r2.json().catch(() => ({}));
    setGuardando(false);
    if (!r2.ok) {
      setMsg({ ok: false, text: d2.error || 'No se pudo guardar la capacidad' });
      return;
    }
    setMsg({ ok: true, text: 'Guardado para ambas cabañas' });
  }

  // Ejemplo con el precio base actual para que se vea cuánto suma cada adicional
  const base = precioBase ?? 0;
  const ejemplo = (tipo: TipoHuesped) => {
    const v = Number(extras[tipo].valor || 0);
    const monto = extras[tipo].tipo === 'porcentaje' ? Math.round((base * v) / 100) : Math.round(v);
    return `+$${monto.toLocaleString('es-CL')} por noche`;
  };

  return (
    <form onSubmit={guardar} className={CARD}>
      <div>
        <h2 className="font-serif text-xl text-[#001f14]">Huéspedes adicionales y capacidad</h2>
        <div className="text-[11px] text-[#8a8a8a] mt-1">
          El precio por noche corresponde a 1 adulto. Cada adicional suma su monto por noche; puede ser un % del precio de esa noche o un valor fijo. Déjalo en 0 si no se cobra.
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {TIPOS.map(({ tipo, titulo, detalle }) => (
          <div key={tipo} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 sm:items-end">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#001f14]">{titulo}</span>
              <span className="text-xs text-[#8a8a8a]">{detalle}</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Tipo de cobro</label>
              <select value={extras[tipo].tipo} onChange={(e) => setExtras({ ...extras, [tipo]: { ...extras[tipo], tipo: e.target.value as 'porcentaje' | 'monto' } })} className={INPUT}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Valor fijo (CLP)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>{extras[tipo].tipo === 'porcentaje' ? 'Porcentaje' : 'Monto por noche'}</label>
              <input type="number" min={0} step={extras[tipo].tipo === 'porcentaje' ? 'any' : 1} inputMode="decimal" value={extras[tipo].valor} onChange={(e) => setExtras({ ...extras, [tipo]: { ...extras[tipo], valor: e.target.value } })} placeholder="0" className={INPUT} />
            </div>
            <div className="text-xs text-[#3a3a3a] pb-2">{base > 0 ? ejemplo(tipo) : ''}</div>
          </div>
        ))}
      </div>

      <div className="h-px bg-[#eee7da]" />
      <div className="text-sm font-semibold text-[#001f14]">Capacidad máxima por cabaña</div>
      <div className="text-[11px] text-[#8a8a8a] -mt-2">Los huéspedes cuentan adultos y niños; los bebés no cuentan.</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CABANAS.map(({ id, label }) => (
          <div key={id} className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-[#001f14]">Tiny House {label}</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Huéspedes</label>
                <input type="number" min={1} step={1} inputMode="numeric" value={cap[id].maxHuespedes} onChange={(e) => setCap({ ...cap, [id]: { ...cap[id], maxHuespedes: e.target.value } })} className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Mascotas</label>
                <input type="number" min={0} step={1} inputMode="numeric" value={cap[id].maxMascotas} onChange={(e) => setCap({ ...cap, [id]: { ...cap[id], maxMascotas: e.target.value } })} className={INPUT} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-[#8a8a8a]">
        Ejemplo: con precio por noche de ${base.toLocaleString('es-CL')} y 2 adultos, el total por noche = precio + adicional de 1 adulto
        {descuentoPct > 0 ? `; después se aplica el descuento de ${descuentoPct}% sobre todo` : ''}.
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <button type="submit" disabled={guardando} className={BTN}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        {msg && <div className={`text-sm ${msg.ok ? 'text-[#163428]' : 'text-red-600'}`}>{msg.text}</div>}
      </div>
    </form>
  );
}

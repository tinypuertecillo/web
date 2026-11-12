'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { calcularPrecioConConfig, EXTRAS_POR_DEFECTO, type Capacidad, type DescuentoNoches, type ExtrasHuespedes, type TipoHuesped } from '@/lib/pricingCore';
import { fmtCLP } from './ui';

const TIPOS: { tipo: TipoHuesped; titulo: string; detalle: string }[] = [
  { tipo: 'adulto', titulo: 'Adulto adicional', detalle: 'Desde el 2.º adulto' },
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
type CapCampos = { maxHuespedes: string; maxAdultos: string; maxNinos: string; maxBebes: string; maxMascotas: string };
type CapForm = Record<Cabana, CapCampos>;

const aForm = (e: ExtrasHuespedes): ExtrasForm => {
  const f = {} as ExtrasForm;
  for (const { tipo } of TIPOS) f[tipo] = { tipo: e[tipo].tipo, valor: e[tipo].valor ? String(e[tipo].valor) : '' };
  return f;
};

const capCampos = (c: Capacidad): CapCampos => ({
  maxHuespedes: String(c.maxHuespedes),
  maxAdultos: String(c.maxAdultos),
  maxNinos: String(c.maxNinos),
  maxBebes: String(c.maxBebes),
  maxMascotas: String(c.maxMascotas),
});

const capAForm = (c: Record<Cabana, Capacidad>): CapForm => ({
  naciente: capCampos(c.naciente),
  poniente: capCampos(c.poniente),
});

const CAP_CAMPOS: { campo: keyof CapCampos; label: string; min: number }[] = [
  { campo: 'maxHuespedes', label: 'Huéspedes', min: 1 },
  { campo: 'maxAdultos', label: 'Adultos', min: 1 },
  { campo: 'maxNinos', label: 'Niños', min: 0 },
  { campo: 'maxBebes', label: 'Bebés', min: 0 },
  { campo: 'maxMascotas', label: 'Mascotas', min: 0 },
];

// parte: 'cobros' = lo que suma cada huésped adicional; 'capacidad' = máximos por cabaña. Las dos se guardan juntas.
export default function HuespedesAdmin({ precioBase, parte }: { precioBase: number | null; parte: 'cobros' | 'capacidad' }) {
  const [extras, setExtras] = useState<ExtrasForm>(aForm(EXTRAS_POR_DEFECTO));
  const [cap, setCap] = useState<CapForm>({
    naciente: { maxHuespedes: '4', maxAdultos: '3', maxNinos: '1', maxBebes: '10', maxMascotas: '1' },
    poniente: { maxHuespedes: '4', maxAdultos: '3', maxNinos: '1', maxBebes: '10', maxMascotas: '1' },
  });
  const [descuentos, setDescuentos] = useState<DescuentoNoches[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [guardando, setGuardando] = useState(false);

  const fetchTodo = useCallback(async () => {
    const [a, c] = await Promise.all([fetch('/api/admin/precios/ajustes'), fetch('/api/admin/precios/capacidad')]);
    const ajustes = a.ok ? await a.json() : null;
    return {
      extras: ajustes ? (ajustes.extras as ExtrasHuespedes | undefined) : undefined,
      descuentos: ajustes ? ((ajustes.descuentos ?? []) as DescuentoNoches[]) : [],
      capacidad: c.ok ? ((await c.json()).capacidad as Record<Cabana, Capacidad>) : undefined,
    };
  }, []);

  useEffect(() => {
    fetchTodo().then((d) => {
      if (d.extras) setExtras(aForm(d.extras));
      setDescuentos(d.descuentos);
      if (d.capacidad) setCap(capAForm(d.capacidad));
    });
  }, [fetchTodo]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setGuardando(true);

    // El PUT de ajustes también guarda descuentos y fin de semana, así que se leen los actuales primero.
    const actual = await fetch('/api/admin/precios/ajustes').then((r) => (r.ok ? r.json() : null));
    if (!actual) {
      setGuardando(false);
      setMsg({ ok: false, text: 'No se pudo leer la configuración actual. Intenta de nuevo.' });
      return;
    }

    const r1 = await fetch('/api/admin/precios/ajustes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descuentos: actual.descuentos,
        precioFinSemana: actual.precioFinSemana,
        extras: Object.fromEntries(TIPOS.map(({ tipo }) => [tipo, { tipo: extras[tipo].tipo, valor: Number(extras[tipo].valor || 0) }])),
      }),
    });
    const d1 = await r1.json().catch(() => ({}));
    if (!r1.ok) {
      setGuardando(false);
      setMsg({ ok: false, text: d1.error || 'No se pudieron guardar los cobros.' });
      return;
    }

    const r2 = await fetch('/api/admin/precios/capacidad', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capacidad: Object.fromEntries(
          CABANAS.map(({ id }) => [id, Object.fromEntries(CAP_CAMPOS.map(({ campo }) => [campo, Number(cap[id][campo] || 0)]))])
        ),
      }),
    });
    const d2 = await r2.json().catch(() => ({}));
    setGuardando(false);
    if (!r2.ok) {
      setMsg({ ok: false, text: d2.error || 'No se pudo guardar la capacidad.' });
      return;
    }
    setMsg({ ok: true, text: parte === 'cobros' ? 'Cobros guardados.' : 'Capacidad guardada.' });
  }

  // Lo que suma cada tipo por noche con el precio base actual
  const base = precioBase ?? 0;
  const sumaPorNoche = (tipo: TipoHuesped) => {
    const v = Number(extras[tipo].valor || 0);
    const monto = extras[tipo].tipo === 'porcentaje' ? Math.round((base * v) / 100) : Math.round(v);
    return monto > 0 ? `+${fmtCLP(monto)}` : '—';
  };

  // Vista previa: 2 noches (lunes a miércoles), 2 adultos y 1 mascota, con lo que está escrito en el formulario
  const vistaPrevia = (() => {
    if (!base) return null;
    const extrasNum = Object.fromEntries(TIPOS.map(({ tipo }) => [tipo, { tipo: extras[tipo].tipo, valor: Number(extras[tipo].valor || 0) }])) as ExtrasHuespedes;
    return calcularPrecioConConfig('2030-01-07', '2030-01-09', { precioBase: base, descuentos, precioFinSemana: null, tarifas: [], extras: extrasNum }, { adultos: 2, ninos: 0, bebes: 0, mascotas: 1 });
  })();
  const montoDe = (tipo: TipoHuesped) => vistaPrevia?.extrasDetalle.find((e) => e.tipo === tipo)?.monto ?? 0;

  return (
    <>
      <form className="panel" onSubmit={guardar} aria-label={parte === 'cobros' ? 'Cobros por huésped' : 'Capacidad por cabaña'}>
        <h2>{parte === 'cobros' ? 'Cobros por huésped' : 'Capacidad por cabaña'}</h2>
        <div className="sub" style={{ marginBottom: 16 }}>
          {parte === 'cobros' ? 'El precio por noche cubre a 1 adulto. Cada extra se suma por noche.' : 'Máximo de personas y mascotas que acepta cada Tiny.'}
        </div>

        {parte === 'cobros' && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Quién</th><th>Cobro</th><th>Valor</th><th className="nw" style={{ textAlign: 'right' }}>Suma por noche</th></tr>
              </thead>
              <tbody>
                {TIPOS.map(({ tipo, titulo, detalle }) => (
                  <tr key={tipo}>
                    <td><b>{titulo}</b><small>{detalle}</small></td>
                    <td style={{ minWidth: 150 }}>
                      <select aria-label={`Tipo de cobro: ${titulo}`} value={extras[tipo].tipo} onChange={(e) => setExtras({ ...extras, [tipo]: { ...extras[tipo], tipo: e.target.value as 'porcentaje' | 'monto' } })}>
                        <option value="porcentaje">Porcentaje (%)</option>
                        <option value="monto">Valor fijo ($)</option>
                      </select>
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <input aria-label={`Valor: ${titulo}`} type="number" min={0} step={extras[tipo].tipo === 'porcentaje' ? 'any' : 1} inputMode="decimal" value={extras[tipo].valor} onChange={(e) => setExtras({ ...extras, [tipo]: { ...extras[tipo], valor: e.target.value } })} placeholder="0" />
                    </td>
                    <td className="num nw">{base > 0 ? sumaPorNoche(tipo) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {parte === 'capacidad' && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Cabaña</th>{CAP_CAMPOS.map((c) => <th key={c.campo}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {CABANAS.map(({ id, label }) => (
                    <tr key={id}>
                      <td className="nw"><b>Tiny {label}</b></td>
                      {CAP_CAMPOS.map(({ campo, label: etiqueta, min }) => (
                        <td key={campo} style={{ minWidth: 90 }}>
                          <input aria-label={`${etiqueta} en ${label}`} type="number" min={min} step={1} inputMode="numeric" value={cap[id][campo]} onChange={(e) => setCap({ ...cap, [id]: { ...cap[id], [campo]: e.target.value } })} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nota" style={{ marginTop: 10 }}>Huéspedes cuenta adultos y niños juntos. Los bebés no suman.</p>
          </>
        )}

        <div className="foot">
          <button type="submit" className="btn pri" disabled={guardando}>{guardando ? 'Guardando…' : parte === 'cobros' ? 'Guardar cobros' : 'Guardar capacidad'}</button>
          {msg && <span className={msg.ok ? 'msg-ok' : 'msg-err'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</span>}
        </div>
      </form>

      {parte === 'cobros' && vistaPrevia && (
        <aside className="preview" aria-label="Vista previa para el huésped">
          <h2>Así lo verá el huésped</h2>
          <div className="sub" style={{ marginBottom: 12 }}>2 noches, 2 adultos y 1 mascota.</div>
          <div className="pl"><span>2 noches</span><span>{fmtCLP(vistaPrevia.subtotalNoches)}</span></div>
          {montoDe('adulto') > 0 && <div className="pl"><span>Adulto adicional</span><span>{fmtCLP(montoDe('adulto'))}</span></div>}
          {montoDe('mascota') > 0 && <div className="pl"><span>Mascota</span><span>{fmtCLP(montoDe('mascota'))}</span></div>}
          {vistaPrevia.descuento > 0 && <div className="pl"><span>Descuento por 2 noches ({vistaPrevia.descuentoPct} %)</span><span>−{fmtCLP(vistaPrevia.descuento)}</span></div>}
          <div className="pl tot"><span>Total a pagar</span><span>{fmtCLP(vistaPrevia.total)}</span></div>
        </aside>
      )}
    </>
  );
}

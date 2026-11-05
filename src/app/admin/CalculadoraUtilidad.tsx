'use client';

import React, { useEffect, useState } from 'react';

const INPUT = 'border-0 border-b-2 border-[#dcd0bf] py-1.5 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14] w-full';
const LABEL = 'text-[10px] uppercase tracking-wide text-secondary font-bold';
const CARD = 'w-full bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-3';

const fmtCLP = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CL');
const fmtPct = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + '%';

type TipoCosto = 'noche' | 'reserva' | 'pct';
type Costo = { id: number; concepto: string; tipo: TipoCosto; valor: string };

type Guardado = { precio: string; noches: string; iva: string; renta: string; costos: Costo[]; descuento: string; meta: string };

const CLAVE = 'tp_calculadora_utilidad';

// Lo escrito se recuerda solo en este navegador (no se guarda en el sitio ni en la base de datos).
function leerGuardado(): Guardado {
  const vacio: Guardado = { precio: '', noches: '2', iva: '19', renta: '', costos: [], descuento: '', meta: '' };
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return vacio;
    const g = JSON.parse(raw) as Partial<Guardado>;
    return {
      precio: typeof g.precio === 'string' ? g.precio : '',
      noches: typeof g.noches === 'string' ? g.noches : '2',
      iva: typeof g.iva === 'string' ? g.iva : '19',
      renta: typeof g.renta === 'string' ? g.renta : '',
      costos: Array.isArray(g.costos) ? g.costos.filter((c) => c && typeof c.concepto === 'string') : [],
      descuento: typeof g.descuento === 'string' ? g.descuento : '',
      meta: typeof g.meta === 'string' ? g.meta : '',
    };
  } catch {
    return vacio;
  }
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Calculadora de ganancia neta: arriendo (con IVA) menos IVA, costos e impuesto a la renta.
// Sirve para decidir descuentos sabiendo cuánto queda de verdad.
export default function CalculadoraUtilidad({ precioBase }: { precioBase: number | null }) {
  const [inicial] = useState(leerGuardado);
  const [precio, setPrecio] = useState(inicial.precio);
  const [noches, setNoches] = useState(inicial.noches);
  const [iva, setIva] = useState(inicial.iva);
  const [renta, setRenta] = useState(inicial.renta);
  const [costos, setCostos] = useState<Costo[]>(inicial.costos);
  const [descuento, setDescuento] = useState(inicial.descuento);
  const [meta, setMeta] = useState(inicial.meta);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify({ precio, noches, iva, renta, costos, descuento, meta }));
    } catch {
      // sin almacenamiento disponible: la calculadora funciona igual
    }
  }, [precio, noches, iva, renta, costos, descuento, meta]);

  const precioNoche = precio !== '' ? num(precio) : precioBase ?? 0;
  const n = Math.max(1, Math.floor(num(noches)) || 1);
  const ingreso = precioNoche * n; // lo que paga el huésped, con IVA
  const ivaPct = Math.min(100, num(iva));
  const rentaPct = Math.min(99, num(renta));

  const montoFijo = (c: Costo) => (c.tipo === 'noche' ? num(c.valor) * n : c.tipo === 'reserva' ? num(c.valor) : 0);
  const costosFijos = costos.reduce((a, c) => a + montoFijo(c), 0);
  const pctCostos = costos.reduce((a, c) => a + (c.tipo === 'pct' ? num(c.valor) : 0), 0) / 100;

  // Resultado con un descuento d (%) sobre el arriendo. Los costos en % se calculan sobre lo que paga el huésped.
  const resultado = (d: number) => {
    const bruto = ingreso * (1 - d / 100);
    const neto = bruto / (1 + ivaPct / 100);
    const ivaPagar = bruto - neto;
    const costosTotal = costosFijos + bruto * pctCostos;
    const antesRenta = neto - costosTotal;
    const impRenta = antesRenta > 0 ? (antesRenta * rentaPct) / 100 : 0;
    const ganancia = antesRenta - impRenta;
    return { bruto, neto, ivaPagar, costosTotal, impRenta, ganancia, margen: neto > 0 ? (ganancia / neto) * 100 : 0 };
  };

  const r0 = resultado(0);
  const d = Math.min(99.9, num(descuento));
  const rd = resultado(d);

  // Descuento máximo que deja al menos la ganancia neta deseada:
  // bruto × (1/(1+IVA) − %costos) − costosFijos = ganancia antes de renta necesaria
  const metaNeta = num(meta);
  const necesaria = rentaPct > 0 && metaNeta > 0 ? metaNeta / (1 - rentaPct / 100) : metaNeta;
  const factor = 1 / (1 + ivaPct / 100) - pctCostos;
  const maxDescuento = ingreso > 0 && factor > 0 ? 100 * (1 - (costosFijos + necesaria) / (ingreso * factor)) : null;
  const maxMostrado = maxDescuento === null ? null : Math.min(99.9, maxDescuento);

  const agregar = () => setCostos((l) => [...l, { id: Date.now() + l.length, concepto: '', tipo: 'noche', valor: '' }]);
  const cambiar = (id: number, campo: keyof Costo, valor: string) => setCostos((l) => l.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  const quitar = (id: number) => setCostos((l) => l.filter((c) => c.id !== id));
  const montoDeCosto = (c: Costo) => (c.tipo === 'pct' ? ingreso * (num(c.valor) / 100) : montoFijo(c));

  const color = (v: number) => (v >= 0 ? 'text-[#163428]' : 'text-red-600');

  return (
    <div className={CARD}>
      <div>
        <h2 className="font-serif text-lg text-[#001f14]">Calculadora de ganancia neta</h2>
        <div className="text-[11px] text-[#8a8a8a] mt-0.5">
          Descuenta IVA, costos e impuesto a la renta. No cambia los precios del sitio; lo que escribes queda solo en este navegador.
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
          <label className={LABEL}>Arriendo por noche</label>
          <input type="number" min={0} step={1} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder={precioBase ? String(precioBase) : 'CLP'} className={INPUT} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className={LABEL}>Noches</label>
          <input type="number" min={1} step={1} inputMode="numeric" value={noches} onChange={(e) => setNoches(e.target.value)} className={INPUT} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className={LABEL}>IVA incluido (%)</label>
          <input type="number" min={0} max={100} step="any" inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} placeholder="19" className={INPUT} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className={LABEL}>Renta (% utilidad)</label>
          <input type="number" min={0} max={99} step="any" inputMode="decimal" value={renta} onChange={(e) => setRenta(e.target.value)} placeholder="Opcional" className={INPUT} />
        </div>
      </div>
      {precio !== '' && precioBase !== null && (
        <button type="button" onClick={() => setPrecio('')} className="text-[11px] underline text-[#8a8a8a] text-left -mt-1">Usar el precio base del sitio ({fmtCLP(precioBase)})</button>
      )}

      <div className="flex flex-col gap-1.5">
        <div className={LABEL}>Costos</div>
        {costos.length === 0 && <div className="text-xs text-[#8a8a8a]">Aún no hay costos. Agrega los tuyos (limpieza, lavado, gas, comisiones…).</div>}
        {costos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-secondary">
                  <th className="font-bold pb-1 pr-2">Concepto</th>
                  <th className="font-bold pb-1 pr-2 w-36">Tipo</th>
                  <th className="font-bold pb-1 pr-2 w-24">Valor</th>
                  <th className="font-bold pb-1 pr-2 text-right w-24">En la estadía</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {costos.map((c) => (
                  <tr key={c.id} className="border-t border-[#eee7da]">
                    <td className="py-1 pr-2"><input type="text" value={c.concepto} onChange={(e) => cambiar(c.id, 'concepto', e.target.value)} placeholder="Ej: Limpieza" className={INPUT} /></td>
                    <td className="py-1 pr-2">
                      <select value={c.tipo} onChange={(e) => cambiar(c.id, 'tipo', e.target.value)} className={INPUT}>
                        <option value="noche">$ por noche</option>
                        <option value="reserva">$ por reserva</option>
                        <option value="pct">% del arriendo</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2"><input type="number" min={0} step="any" inputMode="decimal" value={c.valor} onChange={(e) => cambiar(c.id, 'valor', e.target.value)} placeholder={c.tipo === 'pct' ? '%' : 'CLP'} className={INPUT} /></td>
                    <td className="py-1 pr-2 text-right font-semibold text-[#3a3a3a]">{fmtCLP(montoDeCosto(c))}</td>
                    <td className="py-1 text-right"><button type="button" onClick={() => quitar(c.id)} className="text-xs text-red-600 underline font-semibold">Quitar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div>
          <button type="button" onClick={agregar} className="rounded-lg py-2 px-4 text-sm font-semibold bg-[#eee7da] text-[#3a3a3a] hover:bg-[#e5dbcd]">+ Agregar costo</button>
        </div>
      </div>

      <div className="bg-[#f8f4ec] rounded-xl p-4 flex flex-col gap-1.5 text-sm text-[#3a3a3a]">
        <div className="flex justify-between"><span>Arriendo cobrado ({n} {n === 1 ? 'noche' : 'noches'}, con IVA)</span><span className="font-semibold">{fmtCLP(r0.bruto)}</span></div>
        <div className="flex justify-between"><span>− IVA a pagar ({fmtPct(ivaPct)})</span><span className="font-semibold">{fmtCLP(r0.ivaPagar)}</span></div>
        <div className="flex justify-between"><span>= Arriendo neto (sin IVA)</span><span className="font-semibold">{fmtCLP(r0.neto)}</span></div>
        <div className="flex justify-between"><span>− Costos</span><span className="font-semibold">{fmtCLP(r0.costosTotal)}</span></div>
        {rentaPct > 0 && <div className="flex justify-between"><span>− Impuesto a la renta ({fmtPct(rentaPct)})</span><span className="font-semibold">{fmtCLP(r0.impRenta)}</span></div>}
        <div className="h-px bg-[#e5dbcd] my-0.5" />
        <div className="flex justify-between items-baseline">
          <span className="font-serif text-base text-[#001f14]">Ganancia neta</span>
          <span className={`font-serif text-xl font-semibold ${color(r0.ganancia)}`}>{fmtCLP(r0.ganancia)}</span>
        </div>
        <div className="flex justify-between text-xs text-[#8a8a8a]">
          <span>Margen neto sobre el arriendo sin IVA</span>
          <span className={`font-semibold ${color(r0.margen)}`}>{fmtPct(r0.margen)}</span>
        </div>
        <div className="flex justify-between text-xs text-[#8a8a8a]"><span>Ganancia neta por noche</span><span className="font-semibold">{fmtCLP(r0.ganancia / n)}</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div className="border border-[#eee7da] rounded-xl p-4 flex flex-col gap-2">
          <div className="font-serif text-base text-[#001f14]">¿Y si doy un descuento?</div>
          <div className="flex flex-col gap-0.5">
            <label className={LABEL}>Descuento a probar (%)</label>
            <input type="number" min={0} max={99} step="any" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="Ej: 10" className={INPUT} />
          </div>
          {d > 0 && (
            <div className="text-xs text-[#3a3a3a] flex flex-col gap-1">
              <div className="flex justify-between"><span>Arriendo con descuento</span><span className="font-semibold">{fmtCLP(rd.bruto)}</span></div>
              <div className="flex justify-between"><span>Ganancia neta</span><span className={`font-semibold ${color(rd.ganancia)}`}>{fmtCLP(rd.ganancia)}</span></div>
              <div className="flex justify-between"><span>Margen neto</span><span className={`font-semibold ${color(rd.margen)}`}>{fmtPct(rd.margen)}</span></div>
              <div className="flex justify-between"><span>Dejas de ganar</span><span className="font-semibold">{fmtCLP(r0.ganancia - rd.ganancia)}</span></div>
            </div>
          )}
        </div>

        <div className="border border-[#eee7da] rounded-xl p-4 flex flex-col gap-2">
          <div className="font-serif text-base text-[#001f14]">Descuento máximo</div>
          <div className="flex flex-col gap-0.5">
            <label className={LABEL}>Ganancia neta mínima (CLP)</label>
            <input type="number" min={0} step={1} inputMode="numeric" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Vacío = no perder" className={INPUT} />
          </div>
          {maxMostrado === null ? (
            <div className="text-xs text-[#8a8a8a]">Escribe el arriendo y los costos para calcularlo.</div>
          ) : maxMostrado <= 0 ? (
            <div className="text-xs text-red-600 font-semibold">Con estos costos no hay espacio para dar descuento y ganar eso.</div>
          ) : (
            <div className="text-xs text-[#3a3a3a]">
              Hasta <span className="font-serif text-xl font-semibold text-[#163428]">{fmtPct(maxMostrado)}</span> y ganas {fmtCLP(metaNeta)} netos o más.
              <div className="text-[11px] text-[#8a8a8a] mt-0.5">Arriendo final: {fmtCLP(ingreso * (1 - maxMostrado / 100))}.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';

const INPUT = 'border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14] w-full';
const LABEL = 'text-[11px] uppercase tracking-wide text-secondary font-bold';
const CARD = 'w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4';

const fmtCLP = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CL');

type TipoCosto = 'noche' | 'reserva' | 'pct';
type Costo = { id: number; concepto: string; tipo: TipoCosto; valor: string };

type Guardado = { precio: string; noches: string; costos: Costo[]; descuento: string; meta: string };

const CLAVE = 'tp_calculadora_utilidad';

// Lo escrito se recuerda solo en este navegador (no se guarda en el sitio ni en la base de datos).
function leerGuardado(): Guardado {
  const vacio: Guardado = { precio: '', noches: '2', costos: [], descuento: '', meta: '' };
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return vacio;
    const g = JSON.parse(raw) as Partial<Guardado>;
    return {
      precio: typeof g.precio === 'string' ? g.precio : '',
      noches: typeof g.noches === 'string' ? g.noches : '2',
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

// Calculadora simple de utilidad: arriendo menos costos, para decidir descuentos sabiendo cuánto se gana.
export default function CalculadoraUtilidad({ visible, precioBase }: { visible: boolean; precioBase: number | null }) {
  const [inicial] = useState(leerGuardado);
  const [precio, setPrecio] = useState(inicial.precio);
  const [noches, setNoches] = useState(inicial.noches);
  const [costos, setCostos] = useState<Costo[]>(inicial.costos);
  const [descuento, setDescuento] = useState(inicial.descuento);
  const [meta, setMeta] = useState(inicial.meta);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify({ precio, noches, costos, descuento, meta }));
    } catch {
      // sin almacenamiento disponible: la calculadora funciona igual
    }
  }, [precio, noches, costos, descuento, meta]);

  const precioNoche = precio !== '' ? num(precio) : precioBase ?? 0;
  const n = Math.max(1, Math.floor(num(noches)) || 1);
  const ingreso = precioNoche * n;

  const montoFijo = (c: Costo) => (c.tipo === 'noche' ? num(c.valor) * n : c.tipo === 'reserva' ? num(c.valor) : 0);
  const costosFijos = costos.reduce((a, c) => a + montoFijo(c), 0);
  const pctCostos = costos.reduce((a, c) => a + (c.tipo === 'pct' ? num(c.valor) : 0), 0) / 100;

  // Utilidad con un descuento d (%) sobre el arriendo: los costos en % se calculan sobre el arriendo ya descontado.
  const utilidadCon = (d: number) => {
    const ing = ingreso * (1 - d / 100);
    return ing - costosFijos - ing * pctCostos;
  };
  const montoDeCosto = (c: Costo, d = 0) => (c.tipo === 'pct' ? ingreso * (1 - d / 100) * (num(c.valor) / 100) : montoFijo(c));

  const utilidad = utilidadCon(0);
  const margen = ingreso > 0 ? (utilidad / ingreso) * 100 : 0;

  const d = Math.min(99.9, num(descuento));
  const ingresoConDescuento = ingreso * (1 - d / 100);
  const utilidadConDescuento = utilidadCon(d);
  const margenConDescuento = ingresoConDescuento > 0 ? (utilidadConDescuento / ingresoConDescuento) * 100 : 0;

  // Descuento máximo que deja al menos la utilidad mínima deseada: (1 − d) × ingreso × (1 − %costos) − costosFijos = meta
  const base = ingreso * (1 - pctCostos);
  const maxDescuento = base > 0 && ingreso > 0 ? 100 * (1 - (costosFijos + num(meta)) / base) : null;

  const agregar = () => setCostos((l) => [...l, { id: Date.now() + l.length, concepto: '', tipo: 'noche', valor: '' }]);
  const cambiar = (id: number, campo: keyof Costo, valor: string) => setCostos((l) => l.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  const quitar = (id: number) => setCostos((l) => l.filter((c) => c.id !== id));

  const verde = 'text-[#163428]';
  const rojo = 'text-red-600';

  return (
    <div className={`${CARD} ${visible ? 'mt-8' : 'hidden'}`}>
      <div>
        <h2 className="font-serif text-xl text-[#001f14]">Calculadora de utilidad</h2>
        <div className="text-[11px] text-[#8a8a8a] mt-1">
          Escribe el arriendo y tus costos para ver cuánto ganas, y cuánto descuento puedes dar sin perder. Es solo una calculadora: no cambia los precios del sitio y lo que escribes queda guardado solo en este navegador.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Arriendo por noche (CLP)</label>
          <input type="number" min={0} step={1} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder={precioBase ? `Precio base del sitio: ${precioBase}` : 'Ej: 100000'} className={INPUT} />
          {precio !== '' && precioBase !== null && (
            <button type="button" onClick={() => setPrecio('')} className="text-[11px] underline text-[#8a8a8a] text-left">Usar el precio base del sitio ({fmtCLP(precioBase)})</button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Noches de la estadía</label>
          <input type="number" min={1} step={1} inputMode="numeric" value={noches} onChange={(e) => setNoches(e.target.value)} className={INPUT} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className={LABEL}>Costos</div>
        {costos.length === 0 && <div className="text-sm text-[#8a8a8a]">Aún no hay costos. Agrega los tuyos (ej.: limpieza, lavandería, comisión de la plataforma, comisión de Flow, luz y agua).</div>}
        {costos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-secondary">
                  <th className="font-bold pb-2 pr-3">Concepto</th>
                  <th className="font-bold pb-2 pr-3">Tipo de costo</th>
                  <th className="font-bold pb-2 pr-3 w-32">Valor</th>
                  <th className="font-bold pb-2 pr-3 text-right w-36">En esta estadía</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {costos.map((c) => (
                  <tr key={c.id} className="border-t border-[#eee7da]">
                    <td className="py-2 pr-3">
                      <input type="text" value={c.concepto} onChange={(e) => cambiar(c.id, 'concepto', e.target.value)} placeholder="Ej: Limpieza" className={INPUT} />
                    </td>
                    <td className="py-2 pr-3">
                      <select value={c.tipo} onChange={(e) => cambiar(c.id, 'tipo', e.target.value)} className={INPUT}>
                        <option value="noche">$ por noche</option>
                        <option value="reserva">$ por reserva</option>
                        <option value="pct">% del arriendo</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min={0} step="any" inputMode="decimal" value={c.valor} onChange={(e) => cambiar(c.id, 'valor', e.target.value)} placeholder={c.tipo === 'pct' ? '%' : 'CLP'} className={INPUT} />
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold text-[#3a3a3a]">{fmtCLP(montoDeCosto(c))}</td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => quitar(c.id)} className="text-xs text-red-600 underline font-semibold">Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div>
          <button type="button" onClick={agregar} className="rounded-lg py-2.5 px-5 text-sm font-semibold bg-[#eee7da] text-[#3a3a3a] hover:bg-[#e5dbcd]">+ Agregar costo</button>
        </div>
      </div>

      <div className="h-px bg-[#eee7da]" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#f8f4ec] rounded-xl p-4 flex flex-col gap-1">
          <span className={LABEL}>Arriendo ({n} {n === 1 ? 'noche' : 'noches'})</span>
          <span className="font-serif text-xl text-[#001f14]">{fmtCLP(ingreso)}</span>
        </div>
        <div className="bg-[#f8f4ec] rounded-xl p-4 flex flex-col gap-1">
          <span className={LABEL}>Costos totales</span>
          <span className="font-serif text-xl text-[#001f14]">{fmtCLP(costosFijos + ingreso * pctCostos)}</span>
        </div>
        <div className="bg-[#f8f4ec] rounded-xl p-4 flex flex-col gap-1">
          <span className={LABEL}>Utilidad</span>
          <span className={`font-serif text-xl font-semibold ${utilidad >= 0 ? verde : rojo}`}>{fmtCLP(utilidad)}</span>
        </div>
        <div className="bg-[#f8f4ec] rounded-xl p-4 flex flex-col gap-1">
          <span className={LABEL}>Margen</span>
          <span className={`font-serif text-xl font-semibold ${margen >= 0 ? verde : rojo}`}>{margen.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</span>
          <span className="text-[11px] text-[#8a8a8a]">{fmtCLP(utilidad / n)} por noche</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="border border-[#eee7da] rounded-xl p-5 flex flex-col gap-3">
          <div className="font-serif text-lg text-[#001f14]">¿Y si doy un descuento?</div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Descuento a probar (%)</label>
            <input type="number" min={0} max={99} step="any" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="Ej: 10" className={INPUT} />
          </div>
          {d > 0 && (
            <div className="text-sm text-[#3a3a3a] flex flex-col gap-1">
              <div className="flex justify-between"><span>Arriendo con descuento</span><span className="font-semibold">{fmtCLP(ingresoConDescuento)}</span></div>
              <div className="flex justify-between"><span>Utilidad</span><span className={`font-semibold ${utilidadConDescuento >= 0 ? verde : rojo}`}>{fmtCLP(utilidadConDescuento)}</span></div>
              <div className="flex justify-between"><span>Margen</span><span className={`font-semibold ${margenConDescuento >= 0 ? verde : rojo}`}>{margenConDescuento.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</span></div>
              <div className="flex justify-between"><span>Pierdes frente a no dar descuento</span><span className="font-semibold">{fmtCLP(utilidad - utilidadConDescuento)}</span></div>
            </div>
          )}
        </div>

        <div className="border border-[#eee7da] rounded-xl p-5 flex flex-col gap-3">
          <div className="font-serif text-lg text-[#001f14]">Descuento máximo que puedo dar</div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Utilidad mínima que quiero ganar (CLP)</label>
            <input type="number" min={0} step={1} inputMode="numeric" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Vacío = no perder (utilidad 0)" className={INPUT} />
          </div>
          {maxDescuento === null ? (
            <div className="text-sm text-[#8a8a8a]">Escribe el arriendo y los costos para calcularlo.</div>
          ) : maxDescuento <= 0 ? (
            <div className="text-sm text-red-600 font-semibold">Con estos costos no hay espacio para dar descuento y ganar eso.</div>
          ) : (
            <div className="text-sm text-[#3a3a3a]">
              Puedes dar hasta <span className="font-serif text-2xl font-semibold text-[#163428]">{Math.min(99.9, maxDescuento).toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</span> y aún ganar {fmtCLP(num(meta))} o más.
              <div className="text-[11px] text-[#8a8a8a] mt-1">Arriendo final con ese descuento: {fmtCLP(ingreso * (1 - Math.min(99.9, maxDescuento) / 100))}.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

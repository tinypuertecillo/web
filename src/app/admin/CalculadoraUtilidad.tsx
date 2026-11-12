'use client';

import React, { useEffect, useState } from 'react';

const fmtCLP = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CL');
const fmtPct = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' %';

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

  const tono = (v: number) => (v >= 0 ? 'pos' : 'neg');

  return (
    <div className="cols2">
      <section className="panel" aria-label="Datos de la calculadora">
        <h2>Calculadora de ganancia</h2>
        <div className="sub" style={{ marginBottom: 18 }}>No cambia los precios del sitio. Lo que escribes queda solo en este navegador.</div>
        <div className="stk" style={{ gap: 18 }}>
          <div className="fields">
            <div className="field"><label htmlFor="k-p">Arriendo por noche</label><div className="inp"><span>$</span><input id="k-p" type="number" min={0} step={1} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder={precioBase ? String(precioBase) : ''} /></div></div>
            <div className="field"><label htmlFor="k-n">Noches</label><div className="inp"><input id="k-n" type="number" min={1} step={1} inputMode="numeric" value={noches} onChange={(e) => setNoches(e.target.value)} /></div></div>
            <div className="field"><label htmlFor="k-i">IVA incluido (%)</label><div className="inp"><input id="k-i" type="number" min={0} max={100} step="any" inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} placeholder="19" /></div></div>
            <div className="field"><label htmlFor="k-r">Renta (% utilidad)</label><div className="inp"><input id="k-r" type="number" min={0} max={99} step="any" inputMode="decimal" value={renta} onChange={(e) => setRenta(e.target.value)} placeholder="Opcional" /></div></div>
          </div>
          {precio !== '' && precioBase !== null && (
            <div><button type="button" className="link" onClick={() => setPrecio('')}>Usar el precio base del sitio ({fmtCLP(precioBase)})</button></div>
          )}

          <div>
            <div className="h3">Costos</div>
            {costos.length === 0 ? (
              <p className="nota">Agrega tus costos: limpieza, lavado, gas, comisiones.</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Concepto</th><th>Tipo</th><th>Valor</th><th style={{ textAlign: 'right' }}>En la estadía</th><th /></tr></thead>
                  <tbody>
                    {costos.map((c) => (
                      <tr key={c.id}>
                        <td style={{ minWidth: 130 }}><input aria-label="Concepto del costo" type="text" value={c.concepto} onChange={(e) => cambiar(c.id, 'concepto', e.target.value)} placeholder="Limpieza" /></td>
                        <td style={{ minWidth: 140 }}>
                          <select aria-label="Tipo de costo" value={c.tipo} onChange={(e) => cambiar(c.id, 'tipo', e.target.value)}>
                            <option value="noche">$ por noche</option>
                            <option value="reserva">$ por reserva</option>
                            <option value="pct">% del arriendo</option>
                          </select>
                        </td>
                        <td style={{ minWidth: 100 }}><input aria-label="Valor del costo" type="number" min={0} step="any" inputMode="decimal" value={c.valor} onChange={(e) => cambiar(c.id, 'valor', e.target.value)} placeholder={c.tipo === 'pct' ? '%' : '$'} /></td>
                        <td className="num nw">{fmtCLP(montoDeCosto(c))}</td>
                        <td style={{ textAlign: 'right' }}><button type="button" className="btn sm danger" onClick={() => quitar(c.id)}>Quitar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12 }}><button type="button" className="btn sm" onClick={agregar}>Agregar costo</button></div>
          </div>
        </div>
      </section>

      <div className="stk" style={{ gap: 24 }}>
        <section className="panel" aria-label="Resultado">
          <h2>Resultado</h2>
          <div className="res" style={{ marginTop: 10 }}><span>Arriendo cobrado ({n} {n === 1 ? 'noche' : 'noches'}, con IVA)</span><span>{fmtCLP(r0.bruto)}</span></div>
          <div className="res"><span>IVA a pagar ({fmtPct(ivaPct)})</span><span>−{fmtCLP(r0.ivaPagar)}</span></div>
          <div className="res"><span>Arriendo neto, sin IVA</span><span>{fmtCLP(r0.neto)}</span></div>
          <div className="res"><span>Costos</span><span>−{fmtCLP(r0.costosTotal)}</span></div>
          {rentaPct > 0 && <div className="res"><span>Impuesto a la renta ({fmtPct(rentaPct)})</span><span>−{fmtCLP(r0.impRenta)}</span></div>}
          <div className="res tot"><span>Ganancia neta</span><span className={tono(r0.ganancia)}>{fmtCLP(r0.ganancia)}</span></div>
          <div className="res"><span>Margen sobre el arriendo sin IVA</span><span className={tono(r0.margen)}>{fmtPct(r0.margen)}</span></div>
          <div className="res"><span>Ganancia neta por noche</span><span>{fmtCLP(r0.ganancia / n)}</span></div>
        </section>

        <section className="panel" aria-label="Probar un descuento">
          <h2>¿Y si doy un descuento?</h2>
          <div className="field" style={{ marginTop: 14, maxWidth: 240 }}><label htmlFor="k-d">Descuento a probar (%)</label><div className="inp"><input id="k-d" type="number" min={0} max={99} step="any" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="10" /></div></div>
          {d > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="res"><span>Arriendo con descuento</span><span>{fmtCLP(rd.bruto)}</span></div>
              <div className="res"><span>Ganancia neta</span><span className={tono(rd.ganancia)}>{fmtCLP(rd.ganancia)}</span></div>
              <div className="res"><span>Margen neto</span><span className={tono(rd.margen)}>{fmtPct(rd.margen)}</span></div>
              <div className="res"><span>Dejas de ganar</span><span>{fmtCLP(r0.ganancia - rd.ganancia)}</span></div>
            </div>
          )}
          <div className="h3" style={{ marginTop: 22 }}>Descuento máximo</div>
          <div className="field" style={{ maxWidth: 240 }}><label htmlFor="k-m">Ganancia neta mínima</label><div className="inp"><span>$</span><input id="k-m" type="number" min={0} step={1} inputMode="numeric" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Vacío = no perder" /></div></div>
          <div style={{ marginTop: 10 }}>
            {maxMostrado === null ? (
              <p className="nota">Escribe el arriendo y los costos para calcularlo.</p>
            ) : maxMostrado <= 0 ? (
              <p className="msg-err">Con estos costos no hay espacio para dar descuento y ganar eso.</p>
            ) : (
              <>
                <div className="res"><span>Puedes dar hasta</span><span className="pos"><b>{fmtPct(maxMostrado)}</b></span></div>
                <p className="nota">Arriendo final: {fmtCLP(ingreso * (1 - maxMostrado / 100))}, con {fmtCLP(metaNeta)} netos o más.</p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

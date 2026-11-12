'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { calcularPrecioConConfig, precioDeNoche, validarDescuentos, type ConfigPrecios, type DescuentoNoches, type Tarifa } from '@/lib/pricingCore';
import { fmtCLP } from './ui';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const fmtFecha = (f: string) => f.split('-').reverse().join('-');

type Msg = { ok: boolean; text: string } | null;

export type SeccionAdmin = 'descuentos' | 'temporadas';

// 'descuentos' = estadía mínima y descuentos por noches; 'temporadas' = tarifas por fecha.
export default function TarifasAdmin({ precioBase, precioFinSemana, seccion }: { precioBase: number | null; precioFinSemana: number | null; seccion: SeccionAdmin }) {
  // Reglas de descuento por noches: "desde N noches, X %". Se editan como texto y se validan al guardar.
  const [descuentos, setDescuentos] = useState<{ noches: string; pct: string }[]>([]);
  const [minNoches, setMinNoches] = useState('');
  const [ajustesMsg, setAjustesMsg] = useState<Msg>(null);
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);

  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [precio, setPrecio] = useState('');
  const [tarifaMsg, setTarifaMsg] = useState<Msg>(null);
  const [guardandoTarifa, setGuardandoTarifa] = useState(false);

  const hoy = new Date();
  const [cursor, setCursor] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });

  const fetchTodo = useCallback(async () => {
    const [a, t] = await Promise.all([fetch('/api/admin/precios/ajustes'), fetch('/api/admin/precios/tarifas')]);
    return {
      ajustes: a.ok ? await a.json() : null,
      tarifas: t.ok ? ((await t.json()).tarifas as Tarifa[]) || [] : null,
    };
  }, []);

  const aplicar = useCallback((data: { ajustes: { descuentos: DescuentoNoches[]; precioFinSemana: number | null; minNoches?: number } | null; tarifas: Tarifa[] | null }) => {
    if (data.ajustes) {
      setDescuentos(data.ajustes.descuentos.map((d) => ({ noches: String(d.noches), pct: String(d.pct) })));
      setMinNoches(data.ajustes.minNoches ? String(data.ajustes.minNoches) : '1');
    }
    if (data.tarifas) setTarifas(data.tarifas);
  }, []);

  const cargar = useCallback(() => fetchTodo().then(aplicar), [fetchTodo, aplicar]);

  useEffect(() => {
    fetchTodo().then(aplicar);
  }, [fetchTodo, aplicar]);

  const config: ConfigPrecios = useMemo(() => ({ precioBase: precioBase ?? 0, descuentos: [], precioFinSemana, tarifas }), [precioBase, precioFinSemana, tarifas]);

  // Totales de ejemplo (1 adulto, de lunes a miércoles, sin tarifas por fecha) con las reglas escritas, sin guardar
  const vistaPrevia = useMemo(() => {
    if (!precioBase) return [];
    const reglas = validarDescuentos(descuentos.filter((d) => d.noches !== '' || d.pct !== '').map((d) => ({ noches: Number(d.noches), pct: Number(d.pct.replace(',', '.')) })));
    if (!reglas.ok) return [];
    return [1, 2, 3, 4, 7].map((n) => {
      const fin = new Date(Date.UTC(2030, 0, 7 + n)).toISOString().slice(0, 10);
      const r = calcularPrecioConConfig('2030-01-07', fin, { precioBase, descuentos: reglas.descuentos, precioFinSemana: null, tarifas: [] });
      return { noches: n, pct: r.descuentoPct, total: r.total };
    });
  }, [descuentos, precioBase]);

  async function guardarAjustes(e: React.FormEvent) {
    e.preventDefault();
    setAjustesMsg(null);
    setGuardandoAjustes(true);
    const res = await fetch('/api/admin/precios/ajustes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descuentos: descuentos.map((d) => ({ noches: Number(d.noches), pct: Number(d.pct.replace(',', '.')) })),
        minNoches: minNoches === '' ? 1 : Number(minNoches),
      }),
    });
    setGuardandoAjustes(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAjustesMsg({ ok: false, text: data.error || 'No se pudo guardar.' });
      return;
    }
    setDescuentos(data.descuentos.map((d: DescuentoNoches) => ({ noches: String(d.noches), pct: String(d.pct) })));
    setAjustesMsg({ ok: true, text: 'Guardado.' });
  }

  function limpiarForm() {
    setEditId(null);
    setNombre('');
    setDesde('');
    setHasta('');
    setPrecio('');
  }

  function editarTarifa(t: Tarifa) {
    setEditId(t.id);
    setNombre(t.nombre || '');
    setDesde(t.fecha_inicio);
    setHasta(t.fecha_fin);
    setPrecio(String(t.precio_noche));
    setTarifaMsg(null);
  }

  function clickDia(fecha: string) {
    setTarifaMsg(null);
    const propia = tarifas.find((t) => t.fecha_inicio === fecha && t.fecha_fin === fecha);
    if (propia) {
      editarTarifa(propia);
      return;
    }
    setEditId(null);
    setNombre('');
    setDesde(fecha);
    setHasta(fecha);
    setPrecio(String(precioDeNoche(fecha, config).precio));
  }

  async function guardarTarifa(e: React.FormEvent) {
    e.preventDefault();
    setTarifaMsg(null);
    if (!desde || !hasta) {
      setTarifaMsg({ ok: false, text: 'Elige la fecha de inicio y la de fin.' });
      return;
    }
    setGuardandoTarifa(true);
    const res = await fetch('/api/admin/precios/tarifas', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId ?? undefined, nombre, fechaInicio: desde, fechaFin: hasta, precioNoche: Number(precio) }),
    });
    setGuardandoTarifa(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setTarifaMsg({ ok: false, text: data.error || 'No se pudo guardar la tarifa.' });
      return;
    }
    limpiarForm();
    setTarifaMsg({ ok: true, text: 'Tarifa guardada.' });
    cargar();
  }

  async function eliminarTarifa(id: string) {
    if (!confirm('¿Eliminar esta tarifa? Esas fechas volverán al precio normal.')) return;
    await fetch(`/api/admin/precios/tarifas?id=${id}`, { method: 'DELETE' });
    if (editId === id) limpiarForm();
    cargar();
  }

  const { y, m } = cursor;
  const primerDia = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(y, m + 1, 0).getDate();
  const hoyISO = iso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const mover = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  if (seccion === 'descuentos') {
    return (
      <>
        <form className="panel" onSubmit={guardarAjustes} aria-label="Descuentos y estadía mínima">
          <h2>Descuentos y estadía mínima</h2>
          <div className="sub" style={{ marginBottom: 18 }}>Valen para las dos cabañas.</div>
          <div className="stk">
            <div className="field" style={{ maxWidth: 240 }}>
              <label htmlFor="min-noches">Mínimo de noches por reserva</label>
              <div className="inp"><input id="min-noches" type="number" min={1} max={365} step={1} inputMode="numeric" value={minNoches} onChange={(e) => setMinNoches(e.target.value)} /></div>
            </div>

            <div>
              <div className="h3">Descuento por noches</div>
              {descuentos.length === 0 ? (
                <p className="nota">Sin descuentos: todas las reservas pagan el precio completo.</p>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>Desde (noches)</th><th>Descuento (%)</th><th /></tr></thead>
                    <tbody>
                      {descuentos.map((d, i) => (
                        <tr key={i}>
                          <td style={{ minWidth: 120 }}><input aria-label={`Desde cuántas noches, regla ${i + 1}`} type="number" min={1} max={365} step={1} inputMode="numeric" value={d.noches} onChange={(e) => setDescuentos(descuentos.map((x, j) => (j === i ? { ...x, noches: e.target.value } : x)))} /></td>
                          <td style={{ minWidth: 120 }}><input aria-label={`Porcentaje de descuento, regla ${i + 1}`} type="number" min={0.01} max={99.99} step="any" inputMode="decimal" value={d.pct} onChange={(e) => setDescuentos(descuentos.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} /></td>
                          <td style={{ textAlign: 'right' }}><button type="button" className="btn sm danger" onClick={() => setDescuentos(descuentos.filter((_, j) => j !== i))}>Quitar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ marginTop: 12 }}><button type="button" className="btn sm" onClick={() => setDescuentos([...descuentos, { noches: '', pct: '' }])}>Agregar descuento</button></div>
              <p className="nota" style={{ marginTop: 12 }}>Se descuenta del total. Si una estadía cumple varias reglas, gana la de más noches.</p>
            </div>

            <div className="foot" style={{ marginTop: 0 }}>
              <button type="submit" className="btn pri" disabled={guardandoAjustes}>{guardandoAjustes ? 'Guardando…' : 'Guardar descuentos'}</button>
              {ajustesMsg && <span className={ajustesMsg.ok ? 'msg-ok' : 'msg-err'} role={ajustesMsg.ok ? 'status' : 'alert'}>{ajustesMsg.text}</span>}
            </div>
          </div>
        </form>

        {vistaPrevia.length > 0 && (
          <aside className="preview" aria-label="Vista previa para el huésped">
            <h2>Así lo verá el huésped</h2>
            <div className="sub" style={{ marginBottom: 12 }}>Total de 1 adulto según las noches.</div>
            {vistaPrevia.map((v) => (
              <div className="pl" key={v.noches}>
                <span>{v.noches} {v.noches === 1 ? 'noche' : 'noches'}{v.pct > 0 ? `, ${v.pct} % menos` : ''}</span>
                <span>{fmtCLP(v.total)}</span>
              </div>
            ))}
          </aside>
        )}
      </>
    );
  }

  return (
    <div className="stk" style={{ gap: 24 }}>
      <div className="cols2">
        <section className="panel" aria-label="Calendario de precios">
          <div className="pan-head" style={{ marginBottom: 12 }}>
            <div>
              <h2>{MESES[m]} {y}</h2>
              <div className="sub">Toca un día para cambiar su precio.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn sm" onClick={() => mover(-1)} aria-label="Mes anterior">Anterior</button>
              <button type="button" className="btn sm" onClick={() => mover(1)} aria-label="Mes siguiente">Siguiente</button>
            </div>
          </div>
          <div className="mcal">
            {DIAS.map((d, i) => <div key={i} className="wd">{d}</div>)}
            {Array.from({ length: primerDia }).map((_, i) => <div key={`b${i}`} className="c out" />)}
            {Array.from({ length: diasMes }).map((_, i) => {
              const d = i + 1;
              const fecha = iso(y, m, d);
              const n = precioDeNoche(fecha, config);
              const clase = n.origen === 'tarifa' ? 'tar' : n.origen === 'fin_de_semana' ? 'we' : '';
              const sel = desde && hasta && fecha >= desde && fecha <= hasta;
              return (
                <button type="button" key={fecha} onClick={() => clickDia(fecha)} aria-label={`${d} de ${MESES[m]}, ${fmtCLP(n.precio)} por noche`} className={`c ${clase} ${sel ? 'sel' : ''}`} style={{ cursor: 'pointer', fontWeight: fecha === hoyISO ? 800 : undefined }}>
                  <b>{d}</b>
                  <small>{Math.round((n.precio / 1000) * 10) / 10}k</small>
                </button>
              );
            })}
          </div>
          <div className="legend" style={{ marginTop: 14 }}>
            <span><i className="dot" style={{ background: '#faf8f2', border: '1px solid #d9d4c4' }} />Precio base</span>
            <span><i className="dot" style={{ background: '#e4efe9', border: '1px solid #c5d8cc' }} />Viernes y sábado</span>
            <span><i className="dot" style={{ background: '#f6dfb8', border: '1px solid #ecce9a' }} />Tarifa por fecha</span>
          </div>
        </section>

        <form className="panel" onSubmit={guardarTarifa} aria-label={editId ? 'Editar tarifa' : 'Nueva tarifa'}>
          <h2>{editId ? 'Editar tarifa' : 'Nueva tarifa'}</h2>
          <div className="sub" style={{ marginBottom: 16 }}>Si dos tarifas coinciden en un día, gana la de rango más corto.</div>
          <div className="stk" style={{ gap: 14 }}>
            <div className="field"><label htmlFor="t-nom">Nombre (opcional)</label><div className="inp"><input id="t-nom" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Temporada alta" /></div></div>
            <div className="fields">
              <div className="field"><label htmlFor="t-d">Desde (noche)</label><div className="inp"><input id="t-d" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div></div>
              <div className="field"><label htmlFor="t-h">Hasta (última noche)</label><div className="inp"><input id="t-h" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div></div>
            </div>
            <div className="field"><label htmlFor="t-p">Precio por noche</label><div className="inp"><span>$</span><input id="t-p" type="number" min={1} step={1} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="95000" /></div></div>
            <div className="foot" style={{ marginTop: 0 }}>
              <button type="submit" className="btn pri" disabled={guardandoTarifa}>{guardandoTarifa ? 'Guardando…' : editId ? 'Actualizar tarifa' : 'Agregar tarifa'}</button>
              {(editId || desde || hasta || precio) && <button type="button" className="btn" onClick={limpiarForm}>Cancelar</button>}
              {tarifaMsg && <span className={tarifaMsg.ok ? 'msg-ok' : 'msg-err'} role={tarifaMsg.ok ? 'status' : 'alert'}>{tarifaMsg.text}</span>}
            </div>
          </div>
        </form>
      </div>

      <section className="panel" aria-label="Tarifas creadas">
        <h2>Tarifas creadas</h2>
        {tarifas.length === 0 ? (
          <div className="sub" style={{ marginTop: 6 }}>Todavía no hay tarifas por fecha. Crea la primera con el formulario.</div>
        ) : (
          <div className="list" style={{ marginTop: 8 }}>
            {tarifas.map((t) => (
              <div className="item" key={t.id}>
                <div>
                  <b>{t.nombre || 'Tarifa'}, {fmtCLP(t.precio_noche)} por noche</b>
                  <small>{t.fecha_inicio === t.fecha_fin ? fmtFecha(t.fecha_inicio) : `${fmtFecha(t.fecha_inicio)} al ${fmtFecha(t.fecha_fin)}`}</small>
                </div>
                <div className="acts">
                  <button type="button" className="btn sm" onClick={() => editarTarifa(t)}>Editar</button>
                  <button type="button" className="btn sm danger" onClick={() => eliminarTarifa(t.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

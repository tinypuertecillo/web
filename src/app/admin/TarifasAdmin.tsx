'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HuespedesAdmin from './HuespedesAdmin';
import { precioDeNoche, type ConfigPrecios, type Tarifa } from '@/lib/pricingCore';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const INPUT = 'border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]';
const LABEL = 'text-[11px] uppercase tracking-wide text-secondary font-bold';
const CARD = 'w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4';
const BTN = 'rounded-lg py-3.5 px-6 text-[15px] font-semibold bg-[#163428] text-white hover:opacity-90 transition-opacity disabled:opacity-50';

const fmtCLP = (n: number) => '$' + n.toLocaleString('es-CL');
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const fmtFecha = (f: string) => f.split('-').reverse().join('-');

export default function TarifasAdmin({ precioBase, precioFinSemana }: { precioBase: number | null; precioFinSemana: number | null }) {
  const [descuento, setDescuento] = useState('');
  const [descuentoGuardado, setDescuentoGuardado] = useState(0);
  const [minNoches, setMinNoches] = useState('');
  const [ajustesMsg, setAjustesMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);

  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [precio, setPrecio] = useState('');
  const [tarifaMsg, setTarifaMsg] = useState<{ ok: boolean; text: string } | null>(null);
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

  const aplicar = useCallback((data: { ajustes: { descuentoPct: number; precioFinSemana: number | null; minNoches?: number } | null; tarifas: Tarifa[] | null }) => {
    if (data.ajustes) {
      setDescuento(data.ajustes.descuentoPct ? String(data.ajustes.descuentoPct) : '');
      setDescuentoGuardado(data.ajustes.descuentoPct);
      setMinNoches(data.ajustes.minNoches ? String(data.ajustes.minNoches) : '1');
    }
    if (data.tarifas) setTarifas(data.tarifas);
  }, []);

  const cargar = useCallback(() => fetchTodo().then(aplicar), [fetchTodo, aplicar]);

  useEffect(() => {
    fetchTodo().then(aplicar);
  }, [fetchTodo, aplicar]);

  const config: ConfigPrecios = useMemo(
    () => ({ precioBase: precioBase ?? 65000, descuentoPct: 0, precioFinSemana, tarifas }),
    [precioBase, precioFinSemana, tarifas]
  );

  async function guardarAjustes(e: React.FormEvent) {
    e.preventDefault();
    setAjustesMsg(null);
    setGuardandoAjustes(true);
    const res = await fetch('/api/admin/precios/ajustes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descuentoPct: descuento === '' ? 0 : Number(descuento.replace(',', '.')), minNoches: minNoches === '' ? 1 : Number(minNoches) }),
    });
    setGuardandoAjustes(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAjustesMsg({ ok: false, text: data.error || 'No se pudo guardar' });
      return;
    }
    setDescuentoGuardado(data.descuentoPct);
    setAjustesMsg({ ok: true, text: 'Descuento y estadía mínima guardados para ambas cabañas' });
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
      setTarifaMsg({ ok: false, text: 'Elige fecha de inicio y fin' });
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
      setTarifaMsg({ ok: false, text: data.error || 'No se pudo guardar la tarifa' });
      return;
    }
    limpiarForm();
    setTarifaMsg({ ok: true, text: 'Tarifa guardada' });
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

  return (
    <>
      <form onSubmit={guardarAjustes} className={`${CARD} mb-10`}>
        <div>
          <h2 className="font-serif text-xl text-[#001f14]">Descuento y estadía mínima</h2>
          <div className="text-[11px] text-[#8a8a8a] mt-1">Aplica a Tiny House Naciente y Poniente.</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Descuento (%) sobre todas las noches</label>
            <input type="number" min={0} max={99.99} step="any" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="Ej: 10 (vacío = sin descuento)" className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Mínimo de noches por reserva</label>
            <input type="number" min={1} max={365} step={1} inputMode="numeric" value={minNoches} onChange={(e) => setMinNoches(e.target.value)} placeholder="Ej: 2" className={INPUT} />
          </div>
        </div>
        <div className="text-[11px] text-[#8a8a8a]">Las tarifas por fecha (abajo) tienen prioridad sobre los precios base y de fin de semana, y el descuento se aplica al final sobre el total.</div>
        <div className="flex items-center gap-4 flex-wrap">
          <button type="submit" disabled={guardandoAjustes} className={BTN}>{guardandoAjustes ? 'Guardando…' : 'Guardar'}</button>
          {ajustesMsg && <div className={`text-sm ${ajustesMsg.ok ? 'text-[#163428]' : 'text-red-600'}`}>{ajustesMsg.text}</div>}
        </div>
      </form>

      <HuespedesAdmin precioBase={precioBase} descuentoPct={descuentoGuardado} />

      <div className={`${CARD} mb-10`}>
        <div>
          <h2 className="font-serif text-xl text-[#001f14]">Tarifas por calendario</h2>
          <div className="text-[11px] text-[#8a8a8a] mt-1">Crea temporadas por rango de fechas o haz clic en un día del calendario para cambiar su precio manualmente.</div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => mover(-1)} className="px-3 py-1.5 rounded-lg bg-[#eee7da] text-sm font-semibold hover:bg-[#e5dbcd]">←</button>
              <div className="text-[15px] font-bold text-[#001f14]">{MESES[m]} {y}</div>
              <button type="button" onClick={() => mover(1)} className="px-3 py-1.5 rounded-lg bg-[#eee7da] text-sm font-semibold hover:bg-[#e5dbcd]">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DIAS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-[#8a8a8a] uppercase pb-1">{d}</div>
              ))}
              {Array.from({ length: primerDia }).map((_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: diasMes }).map((_, i) => {
                const d = i + 1;
                const fecha = iso(y, m, d);
                const n = precioDeNoche(fecha, config);
                const color = n.origen === 'tarifa' ? 'bg-[#f6dfb8] text-[#5a3a00]' : n.origen === 'fin_de_semana' ? 'bg-[#e4efe9] text-[#163428]' : 'bg-[#faf7f2] text-[#3a3a3a]';
                const sel = desde && hasta && fecha >= desde && fecha <= hasta;
                return (
                  <button
                    type="button"
                    key={fecha}
                    onClick={() => clickDia(fecha)}
                    className={`rounded-md py-1.5 flex flex-col items-center leading-tight hover:shadow-[inset_0_0_0_1.5px_#001f14] ${color} ${sel ? 'shadow-[inset_0_0_0_2px_#001f14]' : ''} ${fecha === hoyISO ? 'font-bold' : ''}`}
                  >
                    <span className="text-xs">{d}</span>
                    <span className="text-[9px] sm:text-[10px]">{Math.round(n.precio / 1000 * 10) / 10}k</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-[#8a8a8a] flex gap-4 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#faf7f2] border border-[#eee7da] inline-block" />Precio base</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#e4efe9] inline-block" />Fin de semana</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#f6dfb8] inline-block" />Tarifa por fecha</span>
            </div>
          </div>

          <form onSubmit={guardarTarifa} className="flex-1 w-full flex flex-col gap-4">
            <div className="text-sm font-semibold text-[#001f14]">{editId ? 'Editar tarifa' : 'Nueva tarifa'}</div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Nombre (opcional)</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Temporada alta verano" className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Desde (noche)</label>
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Hasta (última noche)</label>
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Precio por noche (CLP)</label>
              <input type="number" min={1} step={1} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej: 95000" className={INPUT} />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button type="submit" disabled={guardandoTarifa} className={BTN}>{guardandoTarifa ? 'Guardando…' : editId ? 'Actualizar tarifa' : 'Agregar tarifa'}</button>
              {(editId || desde || hasta || precio) && (
                <button type="button" onClick={limpiarForm} className="text-sm underline font-semibold text-[#3a3a3a]">Cancelar</button>
              )}
              {editId && (
                <button type="button" onClick={() => eliminarTarifa(editId)} className="text-sm underline font-semibold text-red-600">Quitar tarifa</button>
              )}
            </div>
            {tarifaMsg && <div className={`text-sm ${tarifaMsg.ok ? 'text-[#163428]' : 'text-red-600'}`}>{tarifaMsg.text}</div>}
          </form>
        </div>

        <div className="h-px bg-[#eee7da]" />
        <div className="text-sm font-semibold text-[#001f14]">Tarifas creadas</div>
        {tarifas.length === 0 && <div className="text-sm text-[#8a8a8a]">No hay tarifas por fecha todavía.</div>}
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
          {tarifas.map((t) => (
            <div key={t.id} className="border border-[#eee7da] rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#001f14]">{t.nombre || 'Tarifa'} · {fmtCLP(t.precio_noche)}</span>
                <span className="text-xs text-[#8a8a8a]">
                  {t.fecha_inicio === t.fecha_fin ? fmtFecha(t.fecha_inicio) : `${fmtFecha(t.fecha_inicio)} → ${fmtFecha(t.fecha_fin)}`}
                </span>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => editarTarifa(t)} className="text-xs underline font-semibold text-[#3a3a3a]">Editar</button>
                <button type="button" onClick={() => eliminarTarifa(t.id)} className="text-xs underline font-semibold text-red-600">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

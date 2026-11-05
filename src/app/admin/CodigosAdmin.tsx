'use client';

import React, { useCallback, useEffect, useState } from 'react';

const INPUT = 'border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]';
const LABEL = 'text-[11px] uppercase tracking-wide text-secondary font-bold';
const CARD = 'w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4';
const BTN = 'rounded-lg py-3.5 px-6 text-[15px] font-semibold bg-[#163428] text-white hover:opacity-90 transition-opacity disabled:opacity-50';

type Codigo = {
  id: string;
  codigo: string;
  porcentaje: number;
  valido_hasta: string;
  usos_max: number;
  usos: number;
  nota: string | null;
  activo: boolean;
  created_at: string;
};

const fmtFecha = (f: string) => f.split('-').reverse().join('-');

function estadoDe(c: Codigo, hoy: string): { texto: string; clase: string } {
  if (!c.activo) return { texto: 'Desactivado', clase: 'bg-[#eee7da] text-[#8a8a8a]' };
  if (c.valido_hasta < hoy) return { texto: 'Vencido', clase: 'bg-red-50 text-red-700' };
  if (c.usos >= c.usos_max) return { texto: 'Agotado', clase: 'bg-[#eee7da] text-[#3a3a3a]' };
  return { texto: 'Vigente', clase: 'bg-[#e4efe9] text-[#163428]' };
}

// Mensaje listo para pegar en el mensaje privado de Instagram o TikTok.
function mensajeDe(c: Codigo) {
  return `Hola 👋 Gracias por escribir. Este es tu código de descuento: ${c.codigo}. Úsalo al reservar en tinypuertecillo.cl, válido hasta el ${fmtFecha(c.valido_hasta)}.`;
}

// Se mantiene montado siempre y muestra solo cuando la pestaña está activa.
export default function CodigosAdmin({ visible }: { visible: boolean }) {
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [hoy, setHoy] = useState('');
  const [cargado, setCargado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; text: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [porcentaje, setPorcentaje] = useState('');
  const [validoHasta, setValidoHasta] = useState('');
  const [usosMax, setUsosMax] = useState('1');
  const [cantidad, setCantidad] = useState('1');
  const [nota, setNota] = useState('');
  const [nuevos, setNuevos] = useState<Codigo[]>([]);
  const [copiado, setCopiado] = useState('');

  const mostrar = useCallback((ok: boolean, data: { codigos?: Codigo[]; hoy?: string; error?: string }) => {
    if (!ok) {
      setAviso({ ok: false, text: data.error || 'No se pudieron cargar los códigos' });
      return;
    }
    setCodigos(data.codigos || []);
    setHoy(data.hoy || '');
    setCargado(true);
  }, []);

  // Recarga la lista después de crear o cambiar un código
  const cargar = useCallback(async () => {
    const res = await fetch('/api/admin/codigos');
    mostrar(res.ok, await res.json().catch(() => ({})));
  }, [mostrar]);

  // Primera carga: solo cuando se abre la pestaña por primera vez
  useEffect(() => {
    if (!visible || cargado) return;
    let cancelado = false;
    fetch('/api/admin/codigos')
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!cancelado) mostrar(ok, data);
      })
      .catch(() => {
        if (!cancelado) setAviso({ ok: false, text: 'No se pudieron cargar los códigos' });
      });
    return () => {
      cancelado = true;
    };
  }, [visible, cargado, mostrar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const pct = Number(porcentaje);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      setAviso({ ok: false, text: 'Escribe un porcentaje mayor a 0 y menor a 100' });
      return;
    }
    if (!validoHasta) {
      setAviso({ ok: false, text: 'Elige hasta qué día vale el código' });
      return;
    }
    setGuardando(true);
    const res = await fetch('/api/admin/codigos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ porcentaje: pct, validoHasta, usosMax: Number(usosMax), cantidad: Number(cantidad), nota: nota || undefined }),
    });
    setGuardando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAviso({ ok: false, text: data.error || 'No se pudo crear el código' });
      return;
    }
    setNuevos(data.codigos || []);
    setNota('');
    setAviso({ ok: true, text: (data.codigos || []).length === 1 ? 'Código creado' : `${(data.codigos || []).length} códigos creados` });
    cargar();
  }

  async function cambiarActivo(c: Codigo) {
    setAviso(null);
    const res = await fetch('/api/admin/codigos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, activo: !c.activo }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAviso({ ok: false, text: data.error || 'No se pudo cambiar el estado' });
      return;
    }
    cargar();
  }

  async function copiar(texto: string, clave: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(''), 1800);
    } catch {
      setAviso({ ok: false, text: 'No se pudo copiar. Selecciona el texto y cópialo a mano.' });
    }
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 items-start ${visible ? '' : 'hidden'}`}>
      <div className="flex flex-col gap-6">
        <form onSubmit={crear} className={CARD}>
          <div>
            <h2 className="font-serif text-xl text-[#001f14]">Crear códigos de descuento</h2>
            <div className="text-[11px] text-[#8a8a8a] mt-1">
              El huésped escribe el código al reservar en tinypuertecillo.cl y el descuento se aplica solo. No se suma al descuento por noches: se usa el mayor.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Descuento (%)</label>
              <input type="number" min={1} max={99} step="any" inputMode="decimal" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} placeholder="Ej: 10" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Vale hasta (inclusive)</label>
              <input type="date" value={validoHasta} min={hoy || undefined} onChange={(e) => setValidoHasta(e.target.value)} className={INPUT} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Usos por código</label>
              <input type="number" min={1} max={1000} step={1} inputMode="numeric" value={usosMax} onChange={(e) => setUsosMax(e.target.value)} className={INPUT} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Cantidad de códigos</label>
              <input type="number" min={1} max={50} step={1} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Nota (opcional)</label>
            <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: pedido por Instagram, @usuario" className={INPUT} />
          </div>
          <div className="text-[11px] text-[#8a8a8a]">Un uso por código = un huésped. El uso se descuenta solo cuando el pago se confirma.</div>
          {aviso && <div className={`text-sm ${aviso.ok ? 'text-[#163428]' : 'text-red-600'}`}>{aviso.text}</div>}
          <button type="submit" disabled={guardando} className={BTN}>
            {guardando ? 'Creando…' : 'Generar código'}
          </button>
        </form>

        {nuevos.length > 0 && (
          <div className={CARD}>
            <h2 className="font-serif text-xl text-[#001f14]">{nuevos.length === 1 ? 'Código nuevo' : 'Códigos nuevos'}</h2>
            <div className="text-[11px] text-[#8a8a8a]">Copia el mensaje y envíalo por mensaje privado a quien comentó TINY.</div>
            <div className="flex flex-col gap-3">
              {nuevos.map((c) => (
                <div key={c.id} className="border border-[#eee7da] rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-lg font-bold text-[#001f14] tracking-wide">{c.codigo}</span>
                    <span className="text-xs text-[#3a3a3a]">{c.porcentaje}% · hasta {fmtFecha(c.valido_hasta)} · {c.usos_max} {c.usos_max === 1 ? 'uso' : 'usos'}</span>
                  </div>
                  <div className="text-xs text-[#3a3a3a] bg-[#f8f4ec] rounded-md p-3">{mensajeDe(c)}</div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => copiar(mensajeDe(c), 'm' + c.id)} className="text-xs underline font-semibold text-[#163428]">
                      {copiado === 'm' + c.id ? 'Mensaje copiado' : 'Copiar mensaje'}
                    </button>
                    <button type="button" onClick={() => copiar(c.codigo, 'c' + c.id)} className="text-xs underline font-semibold text-[#163428]">
                      {copiado === 'c' + c.id ? 'Código copiado' : 'Copiar solo el código'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={CARD}>
        <h2 className="font-serif text-xl text-[#001f14]">Códigos creados</h2>
        {!cargado && !aviso && <div className="text-sm text-[#8a8a8a]">Cargando…</div>}
        {cargado && codigos.length === 0 && <div className="text-sm text-[#8a8a8a]">Todavía no hay códigos.</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[640px] overflow-y-auto content-start">
          {codigos.map((c) => {
            const est = estadoDe(c, hoy);
            return (
              <div key={c.id} className="border border-[#eee7da] rounded-lg p-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#001f14]">{c.codigo}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 ${est.clase}`}>{est.texto}</span>
                </div>
                <div className="text-sm text-[#3a3a3a]">{c.porcentaje}% de descuento · hasta {fmtFecha(c.valido_hasta)}</div>
                <div className="text-xs text-[#8a8a8a]">Usos: {c.usos} de {c.usos_max}</div>
                {c.nota && <div className="text-xs text-[#8a8a8a] italic">{c.nota}</div>}
                <div className="flex gap-4 pt-1">
                  <button type="button" onClick={() => copiar(mensajeDe(c), 'l' + c.id)} className="text-xs underline font-semibold text-[#163428]">
                    {copiado === 'l' + c.id ? 'Mensaje copiado' : 'Copiar mensaje'}
                  </button>
                  <button type="button" onClick={() => cambiarActivo(c)} className="text-xs underline font-semibold text-[#3a3a3a]">
                    {c.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

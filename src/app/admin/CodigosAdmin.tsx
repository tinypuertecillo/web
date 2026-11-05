'use client';

import React, { useCallback, useEffect, useState } from 'react';

const INPUT = 'border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14] w-full';
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
  celular: string | null;
  activo: boolean;
  created_at: string;
};

const CLAVE = 'tp_codigos_formulario';

const fmtFecha = (f: string) => f.split('-').reverse().join('-');
const fmtCelular = (c: string | null) => (c && c.length === 9 ? `+56 9 ${c.slice(1, 5)} ${c.slice(5)}` : c || '—');
const fmtCreado = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
};

function estadoDe(c: Codigo, hoy: string): { texto: string; clase: string } {
  if (!c.activo) return { texto: 'Desactivado', clase: 'bg-[#eee7da] text-[#8a8a8a]' };
  if (c.usos >= c.usos_max) return { texto: 'Usado', clase: 'bg-[#eee7da] text-[#3a3a3a]' };
  if (c.valido_hasta < hoy) return { texto: 'Vencido', clase: 'bg-red-50 text-red-700' };
  return { texto: 'Vigente', clase: 'bg-[#e4efe9] text-[#163428]' };
}

// Mensaje con formato fijo para enviar el código a la persona.
function mensajeDe(c: Codigo) {
  return `Hola 👋 Gracias por escribir. Tu código de descuento es ${c.codigo}, válido hasta el ${fmtFecha(c.valido_hasta)}. Úsalo al reservar en tinypuertecillo.cl escribiendo en tus datos este mismo celular.`;
}

function enlaceWhatsApp(c: Codigo) {
  return c.celular ? `https://wa.me/56${c.celular}?text=${encodeURIComponent(mensajeDe(c))}` : '';
}

// El % y la vigencia se recuerdan en este navegador para que el siguiente código sea un solo clic.
function leerFormulario() {
  try {
    const g = JSON.parse(window.localStorage.getItem(CLAVE) || '{}') as { porcentaje?: string; validoHasta?: string };
    return { porcentaje: typeof g.porcentaje === 'string' ? g.porcentaje : '', validoHasta: typeof g.validoHasta === 'string' ? g.validoHasta : '' };
  } catch {
    return { porcentaje: '', validoHasta: '' };
  }
}

// Se mantiene montado siempre y muestra solo cuando la pestaña está activa.
export default function CodigosAdmin({ visible }: { visible: boolean }) {
  const [inicial] = useState(leerFormulario);
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [hoy, setHoy] = useState('');
  const [cargado, setCargado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; text: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [celular, setCelular] = useState('');
  const [nota, setNota] = useState('');
  const [porcentaje, setPorcentaje] = useState(inicial.porcentaje);
  const [validoHasta, setValidoHasta] = useState(inicial.validoHasta);
  const [nuevo, setNuevo] = useState<Codigo | null>(null);
  const [copiado, setCopiado] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify({ porcentaje, validoHasta }));
    } catch {
      // sin almacenamiento disponible: el formulario funciona igual
    }
  }, [porcentaje, validoHasta]);

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

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    setNuevo(null);
    const pct = Number(porcentaje);
    if (!celular.trim()) {
      setAviso({ ok: false, text: 'Escribe el celular de la persona' });
      return;
    }
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
      body: JSON.stringify({ celular, porcentaje: pct, validoHasta, nota: nota || undefined }),
    });
    setGuardando(false);
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.existente) {
      setNuevo(data.existente);
      setAviso({ ok: false, text: data.error || 'Este celular ya tiene un código vigente.' });
      return;
    }
    if (!res.ok) {
      setAviso({ ok: false, text: data.error || 'No se pudo generar el código' });
      return;
    }
    setNuevo(data.codigo);
    setCelular('');
    setNota('');
    setAviso({ ok: true, text: 'Código generado' });
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
    <div className={`flex flex-col gap-8 min-w-0 ${visible ? '' : 'hidden'}`}>
      <div className="flex flex-col gap-6 min-w-0">
        <form onSubmit={generar} className={CARD}>
          <div>
            <h2 className="font-serif text-xl text-[#001f14]">Código para un huésped</h2>
            <div className="text-[11px] text-[#8a8a8a] mt-1">
              Cuando alguien comente TINY, pídele su celular y genera su código aquí. Solo funciona al reservar con ese mismo celular y se puede usar una vez.
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Celular de la persona</label>
            <input type="tel" inputMode="tel" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="+56 9 1234 5678" className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Nombre o usuario (opcional)</label>
            <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: @usuario de Instagram" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Descuento (%)</label>
              <input type="number" min={1} max={99} step="any" inputMode="decimal" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} placeholder="Ej: 10" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Vale hasta</label>
              <input type="date" value={validoHasta} min={hoy || undefined} onChange={(e) => setValidoHasta(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="text-[11px] text-[#8a8a8a]">El porcentaje y la fecha quedan recordados para el siguiente código. Si el celular ya tiene un código vigente sin usar, no se crea otro.</div>
          {aviso && <div className={`text-sm ${aviso.ok ? 'text-[#163428]' : 'text-red-600'}`}>{aviso.text}</div>}
          <button type="submit" disabled={guardando} className={BTN}>
            {guardando ? 'Generando…' : 'Generar código'}
          </button>
        </form>

        {nuevo && (
          <div className={CARD}>
            <h2 className="font-serif text-xl text-[#001f14]">Código listo para enviar</h2>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-mono text-xl font-bold text-[#001f14] tracking-wide">{nuevo.codigo}</span>
              <span className="text-xs text-[#3a3a3a]">{nuevo.porcentaje}% · hasta {fmtFecha(nuevo.valido_hasta)} · {fmtCelular(nuevo.celular)}</span>
            </div>
            <div className="text-xs text-[#3a3a3a] bg-[#f8f4ec] rounded-md p-3">{mensajeDe(nuevo)}</div>
            <div className="flex gap-4 flex-wrap">
              {enlaceWhatsApp(nuevo) && (
                <a href={enlaceWhatsApp(nuevo)} target="_blank" rel="noopener noreferrer" className="text-xs underline font-semibold text-[#163428]">Abrir en WhatsApp</a>
              )}
              <button type="button" onClick={() => copiar(mensajeDe(nuevo), 'n')} className="text-xs underline font-semibold text-[#163428]">
                {copiado === 'n' ? 'Mensaje copiado' : 'Copiar mensaje'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`${CARD} min-w-0`}>
        <h2 className="font-serif text-xl text-[#001f14]">Códigos pedidos</h2>
        {!cargado && !aviso && <div className="text-sm text-[#8a8a8a]">Cargando…</div>}
        {cargado && codigos.length === 0 && <div className="text-sm text-[#8a8a8a]">Todavía no hay códigos.</div>}
        {codigos.length > 0 && (
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-secondary">
                  <th className="font-bold pb-2 pr-3">Pedido</th>
                  <th className="font-bold pb-2 pr-3">Celular</th>
                  <th className="font-bold pb-2 pr-3">Código</th>
                  <th className="font-bold pb-2 pr-3">Descuento</th>
                  <th className="font-bold pb-2 pr-3">Vence</th>
                  <th className="font-bold pb-2 pr-3">Estado</th>
                  <th className="font-bold pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {codigos.map((c) => {
                  const est = estadoDe(c, hoy);
                  const wa = enlaceWhatsApp(c);
                  return (
                    <tr key={c.id} className="border-t border-[#eee7da] align-top">
                      <td className="py-2.5 pr-3 text-[#3a3a3a]">
                        {fmtCreado(c.created_at)}
                        {c.nota && <div className="text-[11px] text-[#8a8a8a] italic">{c.nota}</div>}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{fmtCelular(c.celular)}</td>
                      <td className="py-2.5 pr-3 font-mono font-bold text-[#001f14] whitespace-nowrap">{c.codigo}</td>
                      <td className="py-2.5 pr-3">{c.porcentaje}%</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{fmtFecha(c.valido_hasta)}</td>
                      <td className="py-2.5 pr-3"><span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 ${est.clase}`}>{est.texto}</span></td>
                      <td className="py-2.5">
                        <div className="flex gap-3 flex-wrap">
                          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-xs underline font-semibold text-[#163428]">WhatsApp</a>}
                          <button type="button" onClick={() => copiar(mensajeDe(c), 'l' + c.id)} className="text-xs underline font-semibold text-[#163428]">
                            {copiado === 'l' + c.id ? 'Copiado' : 'Copiar'}
                          </button>
                          <button type="button" onClick={() => cambiarActivo(c)} className="text-xs underline font-semibold text-[#3a3a3a]">
                            {c.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

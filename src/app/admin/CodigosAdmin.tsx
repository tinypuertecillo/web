'use client';

import React, { useCallback, useEffect, useState } from 'react';

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
  if (!c.activo) return { texto: 'Desactivado', clase: 'no' };
  if (c.usos >= c.usos_max) return { texto: 'Usado', clase: 'no' };
  if (c.valido_hasta < hoy) return { texto: 'Vencido', clase: 'bad' };
  return { texto: 'Vigente', clase: 'ok' };
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

export default function CodigosAdmin() {
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
      setAviso({ ok: false, text: data.error || 'No se pudieron cargar los códigos.' });
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

  // Primera carga al abrir el tema
  useEffect(() => {
    let cancelado = false;
    fetch('/api/admin/codigos')
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!cancelado) mostrar(ok, data);
      })
      .catch(() => {
        if (!cancelado) setAviso({ ok: false, text: 'No se pudieron cargar los códigos.' });
      });
    return () => {
      cancelado = true;
    };
  }, [mostrar]);

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    setNuevo(null);
    const pct = Number(porcentaje);
    if (!celular.trim()) {
      setAviso({ ok: false, text: 'Escribe el celular de la persona.' });
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      setAviso({ ok: false, text: 'El descuento debe ser mayor a 0 y menor a 100.' });
      return;
    }
    if (!validoHasta) {
      setAviso({ ok: false, text: 'Elige hasta qué día vale el código.' });
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
      setAviso({ ok: false, text: data.error || 'No se pudo generar el código.' });
      return;
    }
    setNuevo(data.codigo);
    setCelular('');
    setNota('');
    setAviso({ ok: true, text: 'Código generado.' });
    cargar();
  }

  async function eliminar(c: Codigo) {
    if (!confirm(`¿Eliminar el código ${c.codigo}${c.celular ? ` (${fmtCelular(c.celular)})` : ''}? No se puede deshacer.`)) return;
    setAviso(null);
    const res = await fetch(`/api/admin/codigos?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAviso({ ok: false, text: data.error || 'No se pudo eliminar el código.' });
      return;
    }
    if (nuevo?.id === c.id) setNuevo(null);
    setAviso({ ok: true, text: `Código ${c.codigo} eliminado.` });
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
    <div className="stk" style={{ gap: 24 }}>
      <div className="cols2">
        <form className="panel" onSubmit={generar} aria-label="Código para un huésped">
          <h2>Código para un huésped</h2>
          <div className="sub" style={{ marginBottom: 16 }}>Se usa una vez y solo con ese celular.</div>
          <div className="stk" style={{ gap: 14 }}>
            <div className="field"><label htmlFor="c-cel">Celular</label><div className="inp"><input id="c-cel" type="tel" inputMode="tel" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="+56 9 1234 5678" /></div></div>
            <div className="field"><label htmlFor="c-nom">Nombre o usuario (opcional)</label><div className="inp"><input id="c-nom" type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="@usuario de Instagram" /></div></div>
            <div className="fields">
              <div className="field"><label htmlFor="c-pct">Descuento (%)</label><div className="inp"><input id="c-pct" type="number" min={1} max={99} step="any" inputMode="decimal" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} placeholder="10" /></div></div>
              <div className="field"><label htmlFor="c-hasta">Vale hasta</label><div className="inp"><input id="c-hasta" type="date" value={validoHasta} min={hoy || undefined} onChange={(e) => setValidoHasta(e.target.value)} /></div></div>
            </div>
            <div className="foot" style={{ marginTop: 0 }}>
              <button type="submit" className="btn pri" disabled={guardando}>{guardando ? 'Generando…' : 'Generar código'}</button>
              {aviso && <span className={aviso.ok ? 'msg-ok' : 'msg-err'} role={aviso.ok ? 'status' : 'alert'}>{aviso.text}</span>}
            </div>
          </div>
        </form>

        {nuevo && (
          <section className="panel" aria-label="Código listo para enviar">
            <h2>Código listo</h2>
            <div style={{ margin: '12px 0 4px' }} className="code">{nuevo.codigo}</div>
            <div className="sub" style={{ marginBottom: 14 }}>{nuevo.porcentaje} %, hasta {fmtFecha(nuevo.valido_hasta)}, {fmtCelular(nuevo.celular)}</div>
            <div className="msg">{mensajeDe(nuevo)}</div>
            <div className="foot">
              <button type="button" className="btn pri" onClick={() => copiar(mensajeDe(nuevo), 'n')}>{copiado === 'n' ? 'Mensaje copiado' : 'Copiar mensaje'}</button>
              {enlaceWhatsApp(nuevo) && <a className="btn" href={enlaceWhatsApp(nuevo)} target="_blank" rel="noopener noreferrer">Abrir en WhatsApp</a>}
            </div>
          </section>
        )}
      </div>

      <section className="panel" aria-label="Códigos pedidos">
        <h2>Códigos pedidos</h2>
        {!cargado && !aviso && <div className="sub" style={{ marginTop: 6 }}>Cargando…</div>}
        {cargado && codigos.length === 0 && <div className="sub" style={{ marginTop: 6 }}>Todavía no hay códigos. Genera el primero con el formulario.</div>}
        {codigos.length > 0 && (
          <div className="tbl-wrap" style={{ maxHeight: 640, overflowY: 'auto', marginTop: 10 }}>
            <table className="tbl">
              <thead>
                <tr><th>Pedido</th><th>Celular</th><th>Código</th><th>Descuento</th><th>Vence</th><th>Estado</th><th /></tr>
              </thead>
              <tbody>
                {codigos.map((c) => {
                  const est = estadoDe(c, hoy);
                  const wa = enlaceWhatsApp(c);
                  return (
                    <tr key={c.id}>
                      <td>{fmtCreado(c.created_at)}{c.nota && <small>{c.nota}</small>}</td>
                      <td className="nw">{fmtCelular(c.celular)}</td>
                      <td className="nw"><b>{c.codigo}</b></td>
                      <td>{c.porcentaje} %</td>
                      <td className="nw">{fmtFecha(c.valido_hasta)}</td>
                      <td><span className={`chip ${est.clase}`}>{est.texto}</span></td>
                      <td>
                        <div className="acts" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button type="button" className="btn sm" onClick={() => copiar(mensajeDe(c), 'l' + c.id)}>{copiado === 'l' + c.id ? 'Copiado' : 'Copiar mensaje'}</button>
                          {wa && <a className="btn sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                          <button type="button" className="btn sm danger" onClick={() => eliminar(c)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

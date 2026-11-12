'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

const CARD = 'w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4';

type Reserva = {
  id: string;
  cabana_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  noches: number;
  precio_total: number;
  huesped_nombre: string | null;
  huesped_email: string | null;
  huesped_telefono: string | null;
  estado: string;
  created_at: string;
  adultos: number | null;
  ninos: number | null;
  bebes: number | null;
  mascotas: number | null;
  codigo_descuento: string | null;
};

type Filtro = 'todas' | 'pagada' | 'pendiente' | 'sin_pagar' | 'rechazada';

const CABIN_LABEL: Record<string, string> = {
  naciente: 'Tiny House Naciente',
  poniente: 'Tiny House Poniente',
};

const fmtCLP = (n: number) => '$' + Number(n).toLocaleString('es-CL');
const fmtFecha = (f: string) => f.split('-').reverse().join('-');
const fmtCreada = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
};

// "pendiente" se separa en dos: todavía dentro del tiempo para pagar, o ya vencida (no se pagó).
function situacion(r: Reserva, vigenteDesde: string): Exclude<Filtro, 'todas'> {
  if (r.estado === 'pagada') return 'pagada';
  if (r.estado === 'rechazada') return 'rechazada';
  return r.created_at >= vigenteDesde ? 'pendiente' : 'sin_pagar';
}

const ETIQUETA: Record<Exclude<Filtro, 'todas'>, { texto: string; clase: string }> = {
  pagada: { texto: 'Pagada', clase: 'bg-[#e4efe9] text-[#163428]' },
  pendiente: { texto: 'Pagando ahora', clase: 'bg-amber-50 text-amber-800' },
  sin_pagar: { texto: 'No se pagó', clase: 'bg-[#eee7da] text-[#8a8a8a]' },
  rechazada: { texto: 'Rechazada', clase: 'bg-red-50 text-red-700' },
};

const FILTROS: { id: Filtro; titulo: string }[] = [
  { id: 'pagada', titulo: 'Pagadas' },
  { id: 'pendiente', titulo: 'Pagando ahora' },
  { id: 'sin_pagar', titulo: 'No se pagaron' },
  { id: 'rechazada', titulo: 'Rechazadas' },
  { id: 'todas', titulo: 'Todas' },
];

function huespedesTexto(r: Reserva) {
  if (r.adultos === null || r.adultos === undefined) return '—';
  const partes = [`${r.adultos} ad.`];
  if (r.ninos) partes.push(`${r.ninos} niñ.`);
  if (r.bebes) partes.push(`${r.bebes} beb.`);
  if (r.mascotas) partes.push(`${r.mascotas} masc.`);
  return partes.join(' · ');
}

// Reservas hechas en el sitio y su estado de pago. Solo muestra; no cambia nada.
export default function ReservasAdmin({ visible }: { visible: boolean }) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vigenteDesde, setVigenteDesde] = useState('');
  const [retencion, setRetencion] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('pagada');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  type Respuesta = { ok: boolean; error?: string; reservas?: Reserva[]; pendienteVigenteDesde?: string; retencionMinutos?: number };

  const pedir = useCallback(async (): Promise<Respuesta> => {
    try {
      const res = await fetch('/api/admin/reservas');
      const data = await res.json().catch(() => ({}));
      return { ...data, ok: res.ok };
    } catch {
      return { ok: false };
    }
  }, []);

  const aplicar = useCallback((data: Respuesta) => {
    if (!data.ok) {
      setError(data.error || 'No se pudieron cargar las reservas');
    } else {
      setError('');
      setReservas(data.reservas || []);
      setVigenteDesde(data.pendienteVigenteDesde || '');
      setRetencion(typeof data.retencionMinutos === 'number' ? data.retencionMinutos : null);
    }
    setCargando(false);
  }, []);

  const cargar = () => {
    setCargando(true);
    pedir().then(aplicar);
  };

  // Se cargan cada vez que se abre la pestaña, para ver siempre lo último
  useEffect(() => {
    if (visible) pedir().then(aplicar);
  }, [visible, pedir, aplicar]);

  const conteo = useMemo(() => {
    const c: Record<Filtro, number> = { todas: reservas.length, pagada: 0, pendiente: 0, sin_pagar: 0, rechazada: 0 };
    for (const r of reservas) c[situacion(r, vigenteDesde)] += 1;
    return c;
  }, [reservas, vigenteDesde]);

  const lista = useMemo(
    () => (filtro === 'todas' ? reservas : reservas.filter((r) => situacion(r, vigenteDesde) === filtro)),
    [reservas, filtro, vigenteDesde]
  );

  if (!visible) return null;

  return (
    <div className={CARD}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl text-[#001f14]">Reservas del sitio</h2>
          <div className="text-[11px] text-[#8a8a8a] mt-1">
            Reservas hechas en la página, con su pago en Flow. Las de Airbnb y Booking no aparecen aquí: se bloquean en «Disponibilidad».
            {retencion !== null && ` Una reserva sin pagar retiene sus fechas por ${retencion} minutos.`}
          </div>
        </div>
        <button type="button" onClick={cargar} disabled={cargando} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#eee7da] text-[#3a3a3a] hover:bg-[#e5dbcd] disabled:opacity-50">
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            aria-pressed={filtro === f.id}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filtro === f.id ? 'bg-[#163428] text-white' : 'bg-[#eee7da] text-[#3a3a3a] hover:bg-[#e5dbcd]'}`}
          >
            {f.titulo} ({conteo[f.id]})
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {!error && !cargando && lista.length === 0 && <div className="text-sm text-[#8a8a8a]">No hay reservas en esta lista.</div>}

      {lista.length > 0 && (
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-white">
              <tr className="text-[11px] uppercase tracking-wide text-secondary">
                <th className="py-2 pr-4 font-bold">Estado</th>
                <th className="py-2 pr-4 font-bold">Llegada</th>
                <th className="py-2 pr-4 font-bold">Salida</th>
                <th className="py-2 pr-4 font-bold">Noches</th>
                <th className="py-2 pr-4 font-bold">Cabaña</th>
                <th className="py-2 pr-4 font-bold">Huésped</th>
                <th className="py-2 pr-4 font-bold">Contacto</th>
                <th className="py-2 pr-4 font-bold">Personas</th>
                <th className="py-2 pr-4 font-bold text-right">Total</th>
                <th className="py-2 pr-4 font-bold">Código</th>
                <th className="py-2 font-bold">Creada</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const e = ETIQUETA[situacion(r, vigenteDesde)];
                return (
                  <tr key={r.id} className="border-t border-[#eee7da] align-top">
                    <td className="py-2.5 pr-4"><span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${e.clase}`}>{e.texto}</span></td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{fmtFecha(r.fecha_inicio)}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{fmtFecha(r.fecha_fin)}</td>
                    <td className="py-2.5 pr-4">{r.noches}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{CABIN_LABEL[r.cabana_id] || r.cabana_id}</td>
                    <td className="py-2.5 pr-4">{r.huesped_nombre || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs text-[#3a3a3a]">
                      <div>{r.huesped_telefono || '—'}</div>
                      <div className="text-[#8a8a8a]">{r.huesped_email || ''}</div>
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-xs">{huespedesTexto(r)}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold whitespace-nowrap">{fmtCLP(r.precio_total)}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-xs">{r.codigo_descuento || '—'}</td>
                    <td className="py-2.5 whitespace-nowrap text-xs text-[#8a8a8a]">{fmtCreada(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

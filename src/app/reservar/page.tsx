'use client';

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

type Cabin = 'naciente' | 'poniente';

// Las fechas se manejan como texto AAAA-MM-DD (se comparan y ordenan como texto).
type DateCell = string;

type Huespedes = { adultos: number; ninos: number; bebes: number; mascotas: number };
type Capacidad = { maxHuespedes: number; maxAdultos: number; maxNinos: number; maxBebes: number; maxMascotas: number };
type Cotizacion = {
  noches: number;
  subtotalNoches: number;
  extrasTotal: number;
  extrasDetalle: { tipo: 'adulto' | 'nino' | 'bebe' | 'mascota'; cantidad: number; monto: number }[];
  subtotal: number;
  descuentoPct: number;
  descuento: number;
  total: number;
  descuentoOrigen?: 'noches' | 'codigo' | null;
};

const EXTRA_LABEL: Record<string, string> = {
  adulto: 'Adulto adicional',
  nino: 'Niños',
  bebe: 'Bebés',
  mascota: 'Mascotas',
};

const CAPACIDAD_INICIAL: Record<Cabin, Capacidad> = {
  naciente: { maxHuespedes: 4, maxAdultos: 3, maxNinos: 1, maxBebes: 10, maxMascotas: 1 },
  poniente: { maxHuespedes: 4, maxAdultos: 3, maxNinos: 1, maxBebes: 10, maxMascotas: 1 },
};

type BloqueoApi = { cabana_id: Cabin; fecha_inicio: string; fecha_fin: string };

const CABINS: Cabin[] = ['naciente', 'poniente'];

const CABIN_LABEL: Record<Cabin, string> = {
  naciente: 'Tiny House Naciente',
  poniente: 'Tiny House Poniente',
};

// Cuántos meses hacia adelante muestra el calendario, contando el mes actual.
const MESES_VISIBLES = 12;
const NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_MS = 24 * 60 * 60 * 1000;

type Mes = { y: number; m: number; label: string; startWeekday: number; days: number };

// Fecha de hoy en Chile (AAAA-MM-DD): los días anteriores no se pueden reservar.
function hoyChile() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function isoDe(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function msDe(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Los meses que se pueden reservar: desde el mes actual, siempre al día.
function mesesDesde(hoy: string): Mes[] {
  const [y0, m0] = hoy.split('-').map(Number);
  const meses: Mes[] = [];
  for (let i = 0; i < MESES_VISIBLES; i++) {
    const primero = new Date(Date.UTC(y0, m0 - 1 + i, 1));
    const y = primero.getUTCFullYear();
    const m = primero.getUTCMonth() + 1;
    meses.push({
      y,
      m,
      label: `${NOMBRES_MES[m - 1]} ${y}`,
      startWeekday: (primero.getUTCDay() + 6) % 7, // lunes = 0
      days: new Date(Date.UTC(y, m, 0)).getUTCDate(),
    });
  }
  return meses;
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const CARD = 'bg-white rounded-2xl p-6 md:p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4';

function nochesEntre(a: DateCell, b: DateCell) {
  return Math.round((msDe(b) - msDe(a)) / DAY_MS);
}

function fmtCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

// "2026-12-05" -> "5 dic 2026"
function fmtDia(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  return `${d} ${NOMBRES_MES[m - 1].slice(0, 3).toLowerCase()} ${y}`;
}

export default function ReservarPage() {
  // La reserva pertenece a la Tiny cuyo calendario se está usando; cada Tiny tiene su propio calendario.
  const [cabin, setCabin] = useState<Cabin>('naciente');
  const [checkIn, setCheckIn] = useState<DateCell | null>(null);
  const [checkOut, setCheckOut] = useState<DateCell | null>(null);
  const [hover, setHover] = useState<DateCell | null>(null);
  const [hoverCabin, setHoverCabin] = useState<Cabin | null>(null);
  // La página se genera de antemano: la fecha de hoy se toma del navegador sin descuadrar la carga
  const hoy = useSyncExternalStore(() => () => {}, hoyChile, hoyChile);
  const MONTHS = useMemo(() => mesesDesde(hoy), [hoy]);
  // Mes que muestra cada calendario (índice en MONTHS); parte en el mes actual
  const [mesVista, setMesVista] = useState<Record<Cabin, number>>({ naciente: 0, poniente: 0 });
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [blocked, setBlocked] = useState<Record<Cabin, Set<string>>>({ naciente: new Set(), poniente: new Set() });
  const [disponibilidadError, setDisponibilidadError] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [quote, setQuote] = useState<{ key: string; data: Cotizacion } | null>(null);
  const [guests, setGuests] = useState<Huespedes>({ adultos: 1, ninos: 0, bebes: 0, mascotas: 0 });
  const [capacidad, setCapacidad] = useState<Record<Cabin, Capacidad>>(CAPACIDAD_INICIAL);
  const [minNoches, setMinNoches] = useState(1);
  // Código de descuento: lo que escribe el huésped y el código ya validado por el servidor
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoAplicado, setCodigoAplicado] = useState('');
  // Celular con el que se validó el código: el código solo sirve para el celular con el que se pidió
  const [celularAplicado, setCelularAplicado] = useState('');
  const [codigoMsg, setCodigoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [validandoCodigo, setValidandoCodigo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/precios')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.capacidad) setCapacidad(data.capacidad);
        if (!cancelled && Number.isInteger(data.minNoches) && data.minNoches >= 1) setMinNoches(data.minNoches);
      })
      .catch(() => {
        // si falla, se usa la capacidad por defecto
      });
    (async () => {
      try {
        const res = await fetch('/api/disponibilidad');
        if (!res.ok) throw new Error('disponibilidad');
        const data = await res.json();
        const next: Record<Cabin, Set<string>> = { naciente: new Set(), poniente: new Set() };
        for (const b of (data.bloqueos || []) as BloqueoApi[]) {
          if (!next[b.cabana_id]) continue;
          // fecha_fin es el día de salida: esa noche queda libre
          for (let ms = msDe(b.fecha_inicio); ms < msDe(b.fecha_fin); ms += DAY_MS) {
            next[b.cabana_id].add(new Date(ms).toISOString().slice(0, 10));
          }
        }
        if (!cancelled) setBlocked(next);
      } catch {
        // No se muestra un calendario "todo libre" sin avisar: el servidor igual revisa las fechas al pagar
        if (!cancelled) setDisponibilidadError(true);
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Un día no se puede elegir si está ocupado o si ya pasó
  const isBlockedIn = (c: Cabin, fecha: DateCell) => blocked[c].has(fecha) || fecha < hoy;

  const hasBlockedBetween = (a: DateCell, b: DateCell) => {
    for (let ms = msDe(a) + DAY_MS; ms < msDe(b); ms += DAY_MS) {
      if (blocked[cabin].has(new Date(ms).toISOString().slice(0, 10))) return true;
    }
    return false;
  };

  // Al usar el calendario de la otra Tiny, la reserva pasa a esa Tiny y se limpian las fechas anteriores
  const cambiarCabana = (c: Cabin) => {
    setCabin(c);
    setCheckIn(null);
    setCheckOut(null);
    setHover(null);
    const cp = capacidad[c];
    setGuests((g) => {
      const adultos = Math.min(g.adultos, cp.maxAdultos, cp.maxHuespedes);
      return {
        adultos,
        ninos: Math.min(g.ninos, cp.maxNinos, cp.maxHuespedes - adultos),
        bebes: Math.min(g.bebes, cp.maxBebes),
        mascotas: Math.min(g.mascotas, cp.maxMascotas),
      };
    });
  };

  const pickDay = (c: Cabin, cell: DateCell) => {
    if (isBlockedIn(c, cell)) return;
    if (c !== cabin) {
      cambiarCabana(c);
      setCheckIn(cell);
      return;
    }
    if (!checkIn || checkOut) {
      setCheckIn(cell);
      setCheckOut(null);
      return;
    }
    if (cell > checkIn) {
      if (hasBlockedBetween(checkIn, cell)) {
        setCheckIn(cell);
        setCheckOut(null);
      } else if (nochesEntre(checkIn, cell) < minNoches) {
        // menos noches que la estadía mínima: se mantiene la llegada y se espera otra salida
        return;
      } else {
        setCheckOut(cell);
      }
    } else {
      setCheckIn(cell);
      setCheckOut(null);
    }
  };

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return nochesEntre(checkIn, checkOut);
  }, [checkIn, checkOut]);

  const fechaInicioISO = checkIn ?? '';
  const fechaFinISO = checkOut ?? '';
  const cap = capacidad[cabin];
  const quoteKey = checkIn && checkOut ? `${fechaInicioISO}|${fechaFinISO}|${cabin}|${guests.adultos}|${guests.ninos}|${guests.bebes}|${guests.mascotas}|${codigoAplicado}|${celularAplicado}` : '';

  async function aplicarCodigo() {
    const codigo = codigoInput.trim();
    if (!codigo) return;
    if (!guestPhone.trim()) {
      setCodigoMsg({ ok: false, text: 'Escribe tu celular más abajo (el mismo con el que pediste el código) y vuelve a aplicar.' });
      return;
    }
    setValidandoCodigo(true);
    setCodigoMsg(null);
    try {
      const res = await fetch('/api/codigos/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, celular: guestPhone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodigoAplicado('');
        setCelularAplicado('');
        setCodigoMsg({ ok: false, text: data.error || 'No pudimos revisar el código. Intenta nuevamente.' });
      } else {
        setCodigoAplicado(data.codigo);
        setCelularAplicado(guestPhone);
        setCodigoInput(data.codigo);
        setCodigoMsg({ ok: true, text: `Código aplicado: ${data.porcentaje}% de descuento.` });
      }
    } catch {
      setCodigoMsg({ ok: false, text: 'No pudimos revisar el código. Intenta nuevamente.' });
    }
    setValidandoCodigo(false);
  }

  function quitarCodigo() {
    setCodigoAplicado('');
    setCelularAplicado('');
    setCodigoInput('');
    setCodigoMsg(null);
  }

  const cambiarHuespedes = (campo: keyof Huespedes, delta: number) => {
    setGuests((g) => {
      const next = { ...g, [campo]: Math.max(campo === 'adultos' ? 1 : 0, g[campo] + delta) };
      if (next.adultos + next.ninos > cap.maxHuespedes || next.adultos > cap.maxAdultos || next.ninos > cap.maxNinos || next.bebes > cap.maxBebes || next.mascotas > cap.maxMascotas) return g;
      return next;
    });
  };

  // El precio se calcula en el servidor (base, fin de semana, tarifas por fecha y descuento)
  useEffect(() => {
    if (!quoteKey) return;
    let cancelled = false;
    const [fechaInicio, fechaFin, cabanaId, adultos, ninos, bebes, mascotas, codigo, celular] = quoteKey.split('|');
    fetch('/api/precios/calcular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fechaInicio,
        fechaFin,
        cabanaId,
        huespedes: { adultos: Number(adultos), ninos: Number(ninos), bebes: Number(bebes), mascotas: Number(mascotas) },
        codigo: codigo || undefined,
        celular: celular || undefined,
      }),
    })
      .then(async (res) => {
        if (res.ok) return res.json();
        // Si el código dejó de servir (venció o se agotó), se quita y se cotiza sin él
        if (codigo && res.status < 500) {
          const err = await res.json().catch(() => ({}));
          if (!cancelled) {
            setCodigoAplicado('');
            setCelularAplicado('');
            setCodigoMsg({ ok: false, text: err.error || 'El código ya no es válido.' });
          }
        }
        return null;
      })
      .then((data) => {
        if (!cancelled && data) setQuote({ key: quoteKey, data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quoteKey]);

  const cotizacion = quote && quote.key === quoteKey ? quote.data : null;
  const total = cotizacion?.total ?? 0;

  const canSubmit = !!(checkIn && checkOut && nights >= minNoches && cotizacion && guestName && guestEmail && !submitting);

  async function handlePagar() {
    if (!checkIn || !checkOut || !guestName || !guestEmail) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const fechaInicio = fechaInicioISO;
      const fechaFin = fechaFinISO;
      const res = await fetch('/api/flow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabanaId: cabin,
          fechaInicio,
          fechaFin,
          huespedes: guests,
          codigo: codigoAplicado || undefined,
          nombre: guestName,
          email: guestEmail,
          telefono: guestPhone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'No pudimos iniciar el pago. Intenta nuevamente.');
        setSubmitting(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setSubmitError('No pudimos conectar con el sistema de pago. Intenta nuevamente.');
      setSubmitting(false);
    }
  }

  function buildMonthDays(c: Cabin, month: Mes) {
    // Solo el calendario de la Tiny elegida muestra la selección y la vista previa del rango
    const activa = c === cabin;
    const ci = activa ? checkIn : null;
    const co = activa ? checkOut : null;
    const hv = activa && hoverCabin === c ? hover : null;

    const cells: Array<{
      key: string;
      label: string;
      disabled: boolean;
      blank: boolean;
      onClick: () => void;
      onMouseEnter: () => void;
      onMouseLeave: () => void;
      wrapClass: string;
      numClass: string;
    }> = [];

    for (let i = 0; i < month.startWeekday; i++) {
      cells.push({
        key: `blank-${c}-${month.y}-${month.m}-${i}`,
        label: '',
        disabled: true,
        blank: true,
        onClick: () => {},
        onMouseEnter: () => {},
        onMouseLeave: () => {},
        wrapClass: 'invisible',
        numClass: '',
      });
    }

    const effectiveEnd = co || hv;

    for (let d = 1; d <= month.days; d++) {
      const cell = isoDe(month.y, month.m, d);
      const blockedDay = isBlockedIn(c, cell);
      const isStart = !!ci && cell === ci;
      const isEnd = !!co && cell === co;
      const previewEnd = !co && !!hv && !!ci && hv > ci;
      const isHoverEnd = previewEnd && cell === hv;
      let inRange = false;
      if (ci && effectiveEnd && effectiveEnd > ci) {
        inRange = cell > ci && cell < effectiveEnd;
      }
      const isSelectedEdge = isStart || isEnd || isHoverEnd;

      let wrapBg = '';
      if (inRange) wrapBg = 'bg-[#f3ede4]';
      if (isStart && (co || previewEnd)) wrapBg = 'bg-gradient-to-r from-transparent from-50% to-[#f3ede4] to-50%';
      if (isEnd || isHoverEnd) wrapBg = 'bg-gradient-to-r from-[#f3ede4] from-50% to-transparent to-50%';
      if (isStart && !co && !previewEnd) wrapBg = '';

      let numClass = 'w-9 h-9 rounded-full flex items-center justify-center text-sm ';
      if (blockedDay) {
        numClass += 'bg-[#e7e2d9] text-[#b5aa98] cursor-not-allowed';
      } else if (isSelectedEdge) {
        numClass += 'bg-[#111111] text-white font-bold cursor-pointer';
      } else {
        numClass += 'text-[#111111] font-medium cursor-pointer hover:shadow-[inset_0_0_0_1.5px_#111111]';
      }

      cells.push({
        key: `${c}-${cell}`,
        label: String(d),
        disabled: blockedDay,
        blank: false,
        onClick: () => pickDay(c, cell),
        onMouseEnter: () => {
          if (!blockedDay) {
            setHover(cell);
            setHoverCabin(c);
          }
        },
        onMouseLeave: () => setHover(null),
        wrapClass: `h-10 flex items-center justify-center ${wrapBg} ${blockedDay ? 'cursor-not-allowed' : 'cursor-pointer'}`,
        numClass,
      });
    }

    return cells;
  }

  // Un calendario completo e independiente para cada Tiny
  function renderCalendario(c: Cabin) {
    const activa = c === cabin;
    const idx = mesVista[c];
    const month = MONTHS[idx];
    const estado = activa && checkIn && checkOut ? `${nights} noches en ${CABIN_LABEL[c]}` : activa && checkIn ? 'Elige tu fecha de salida' : 'Elige tu fecha de llegada';
    return (
      <section aria-label={`Calendario de ${CABIN_LABEL[c]}`} className={`${CARD} ${activa && checkIn ? 'ring-2 ring-[#163428]' : ''}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-serif text-xl text-[#001f14]">{CABIN_LABEL[c]}</h2>
          {activa && (checkIn || checkOut) && (
            <button
              onClick={() => { setCheckIn(null); setCheckOut(null); setHover(null); }}
              className="text-xs text-[#3a3a3a] underline font-semibold"
            >
              Borrar fechas
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={idx === 0}
            onClick={() => setMesVista((v) => ({ ...v, [c]: v[c] - 1 }))}
            className="w-9 h-9 rounded-full bg-[#eee7da] text-[#001f14] flex items-center justify-center disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-[15px] font-bold text-[#001f14]">{month.label}</div>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={idx === MONTHS.length - 1}
            onClick={() => setMesVista((v) => ({ ...v, [c]: v[c] + 1 }))}
            className="w-9 h-9 rounded-full bg-[#eee7da] text-[#001f14] flex items-center justify-center disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-7">
            {WEEKDAY_LABELS.map((wd, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wide pb-1.5">{wd}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {buildMonthDays(c, month).map((cell) => (
              <div key={cell.key} className={cell.wrapClass} onClick={cell.onClick} onMouseEnter={cell.onMouseEnter} onMouseLeave={cell.onMouseLeave}>
                {!cell.blank && <div className={cell.numClass}>{cell.label}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-[#3a3a3a]">{estado}</div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20 w-full flex-1">
        <div className="mb-8">
          <div className="text-xs tracking-[2px] uppercase text-secondary font-semibold mb-2">Tiny Puertecillo</div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#001f14] mb-2">Reserva tu Tiny en Puertecillo</h1>
          <p className="text-[#3a3a3a] text-sm md:text-base">Elige tus fechas en el calendario de la Tiny que prefieras y paga en línea de forma segura con Flow.</p>
        </div>

        <div className="flex items-center gap-x-5 gap-y-1 flex-wrap text-xs text-secondary mb-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#e7e2d9] inline-block" />No disponible</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#111111] inline-block" />Tus fechas</span>
          {minNoches > 1 && <span className="text-[#8a8a8a]">Estadía mínima: {minNoches} noches</span>}
          {loadingAvailability && <span className="text-[#8a8a8a]">Cargando disponibilidad…</span>}
          {disponibilidadError && <span className="text-red-600">No pudimos cargar las fechas ocupadas. Recarga la página; la disponibilidad se confirma al pagar.</span>}
        </div>

        {/* Un calendario por Tiny, uno al lado del otro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CABINS.map((c) => (
            <React.Fragment key={c}>{renderCalendario(c)}</React.Fragment>
          ))}
        </div>

        {/* Debajo: resumen y huéspedes a la izquierda, código, total y pago a la derecha, del mismo tamaño */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 items-stretch">
          <div className={`${CARD} h-full`}>
            <h2 className="font-serif text-xl text-[#001f14]">Resumen de tu reserva</h2>

            <div className="flex flex-col gap-2.5 pb-3.5">
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Cabaña</span><span className="font-semibold">{checkIn ? CABIN_LABEL[cabin] : '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Check-in</span><span className="font-semibold">{checkIn ? fmtDia(checkIn) : '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Check-out</span><span className="font-semibold">{checkOut ? fmtDia(checkOut) : '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Noches</span><span className="font-semibold">{nights}</span></div>
            </div>

            <div className="h-px bg-[#eee7da]" />

            <div className="flex flex-col gap-3 py-1">
              <div className="text-[11px] uppercase tracking-wide text-secondary font-bold">Huéspedes</div>
              {([
                { campo: 'adultos', titulo: 'Adultos', detalle: 'Edad: 13 o más', min: 1, max: Math.min(cap.maxAdultos, cap.maxHuespedes - guests.ninos) },
                { campo: 'ninos', titulo: 'Niños', detalle: 'De 2 a 12 años', min: 0, max: Math.min(cap.maxNinos, cap.maxHuespedes - guests.adultos) },
                { campo: 'bebes', titulo: 'Bebés', detalle: 'Menos de 2 años', min: 0, max: cap.maxBebes },
                { campo: 'mascotas', titulo: 'Mascotas', detalle: `Máximo ${cap.maxMascotas}`, min: 0, max: cap.maxMascotas },
              ] as { campo: keyof Huespedes; titulo: string; detalle: string; min: number; max: number }[]).map((row) => (
                <div key={row.campo} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#001f14]">{row.titulo}</span>
                    <span className="text-xs text-[#8a8a8a]">{row.detalle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label={`Quitar ${row.titulo}`} disabled={guests[row.campo] <= row.min} onClick={() => cambiarHuespedes(row.campo, -1)} className="w-8 h-8 rounded-full bg-[#eee7da] text-[#001f14] font-bold disabled:opacity-40">−</button>
                    <span className="w-5 text-center text-sm font-semibold">{guests[row.campo]}</span>
                    <button type="button" aria-label={`Agregar ${row.titulo}`} disabled={guests[row.campo] >= row.max} onClick={() => cambiarHuespedes(row.campo, 1)} className="w-8 h-8 rounded-full bg-[#eee7da] text-[#001f14] font-bold disabled:opacity-40">+</button>
                  </div>
                </div>
              ))}
              <div className="text-[11px] text-[#8a8a8a]">Máximo {cap.maxHuespedes} huéspedes (adultos y niños; hasta {cap.maxAdultos} adultos y {cap.maxNinos} {cap.maxNinos === 1 ? 'niño' : 'niños'}).</div>
            </div>
          </div>

          <div className={`${CARD} h-full`}>
            <h2 className="font-serif text-xl text-[#001f14]">Tu precio y pago</h2>

            <div className="flex flex-col gap-2 py-1">
              <label htmlFor="codigo-descuento" className="text-[11px] uppercase tracking-wide text-secondary font-bold">¿Tienes un código de descuento?</label>
              <div className="flex items-end gap-3">
                <input
                  id="codigo-descuento"
                  type="text"
                  value={codigoInput}
                  onChange={(e) => {
                    setCodigoInput(e.target.value.toUpperCase());
                    if (codigoAplicado) setCodigoAplicado('');
                    setCodigoMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      aplicarCodigo();
                    }
                  }}
                  placeholder="Ej: TINY-AB12C"
                  autoComplete="off"
                  maxLength={24}
                  className="flex-1 border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14] uppercase"
                />
                {codigoAplicado ? (
                  <button type="button" onClick={quitarCodigo} className="rounded-lg py-2.5 px-4 text-sm font-semibold bg-[#eee7da] text-[#3a3a3a] hover:bg-[#e5dbcd]">Quitar</button>
                ) : (
                  <button type="button" onClick={aplicarCodigo} disabled={!codigoInput.trim() || validandoCodigo} className="rounded-lg py-2.5 px-4 text-sm font-semibold bg-[#163428] text-white hover:opacity-90 disabled:opacity-40">
                    {validandoCodigo ? 'Revisando…' : 'Aplicar'}
                  </button>
                )}
              </div>
              <div className="text-[11px] text-[#8a8a8a]">Tu código solo sirve con el mismo celular con el que lo pediste; escríbelo más abajo, en «Celular».</div>
              {codigoMsg && <div className={`text-[12px] ${codigoMsg.ok ? 'text-[#163428]' : 'text-red-600'}`}>{codigoMsg.text}</div>}
              {codigoAplicado && cotizacion && cotizacion.descuentoOrigen !== 'codigo' && (
                <div className="text-[12px] text-[#8a8a8a]">Tu estadía ya tiene un descuento igual o mayor por sus noches; el código no se suma a ese descuento.</div>
              )}
            </div>

            <div className="h-px bg-[#eee7da]" />

            {cotizacion && (cotizacion.extrasTotal > 0 || cotizacion.descuento > 0) && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">{cotizacion.noches} {cotizacion.noches === 1 ? 'noche' : 'noches'}</span><span className="font-semibold">{fmtCLP(cotizacion.subtotalNoches)}</span></div>
                {cotizacion.extrasDetalle.filter((e) => e.monto > 0).map((e) => (
                  <div key={e.tipo} className="flex justify-between text-sm"><span className="text-[#3a3a3a]">{EXTRA_LABEL[e.tipo]} × {e.cantidad}</span><span className="font-semibold">{fmtCLP(e.monto)}</span></div>
                ))}
              </div>
            )}

            {cotizacion && cotizacion.descuento > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Subtotal</span><span className="font-semibold">{fmtCLP(cotizacion.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">{cotizacion.descuentoOrigen === 'codigo' ? `Código ${codigoAplicado} · ${cotizacion.descuentoPct}%` : `Descuento ${cotizacion.descuentoPct}%`}</span><span className="font-semibold text-[#2b4c3f]">−{fmtCLP(cotizacion.descuento)}</span></div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <span className="font-serif text-base">Total a pagar</span>
              <span className="font-serif text-2xl text-[#2b4c3f] font-semibold">{fmtCLP(total)}</span>
            </div>

            <div className="h-px bg-[#eee7da] my-1.5" />

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Nombre completo</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Correo electrónico</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Celular</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => {
                    setGuestPhone(e.target.value);
                    // Si cambia el celular, el código aplicado deja de valer hasta volver a aplicarlo
                    if (codigoAplicado && e.target.value !== celularAplicado) {
                      setCodigoAplicado('');
                      setCelularAplicado('');
                      setCodigoMsg({ ok: false, text: 'Cambiaste el celular: vuelve a aplicar el código.' });
                    }
                  }}
                  placeholder="+56 9 1234 5678"
                  className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
                />
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-2">
              <button
                onClick={handlePagar}
                disabled={!canSubmit}
                className={`text-center rounded-lg py-4 px-6 text-[15px] font-semibold transition-opacity ${
                  canSubmit ? 'bg-[#163428] text-white hover:opacity-90' : 'bg-[#dcd0bf] text-[#8a8a8a] cursor-not-allowed'
                }`}
              >
                {submitting ? 'Redirigiendo a Flow…' : 'Pagar con Flow'}
              </button>
              {submitError && <div className="text-[12px] text-red-600 text-center">{submitError}</div>}
              <div className="text-[11px] text-[#8a8a8a] text-center">
                Pago 100% seguro procesado por Flow. Aceptamos tarjetas de crédito, débito y transferencia.
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

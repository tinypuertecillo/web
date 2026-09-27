'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

type Cabin = 'naciente' | 'poniente';

type DateCell = { m: number; d: number };

type BloqueoApi = { cabana_id: Cabin; fecha_inicio: string; fecha_fin: string };

const CABIN_LABEL: Record<Cabin, string> = {
  naciente: 'Tiny House Naciente',
  poniente: 'Tiny House Poniente',
};

const PRICE_PER_NIGHT = 65000;

const MONTHS = [
  { m: 10, year: 2026, label: 'Octubre 2026', startWeekday: 3, days: 31 },
  { m: 11, year: 2026, label: 'Noviembre 2026', startWeekday: 6, days: 30 },
];

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function keyOf(cell: DateCell) {
  return cell.m * 100 + cell.d;
}

function dayIndex(cell: DateCell) {
  return cell.m === 10 ? cell.d : 31 + cell.d;
}

function fmtCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

function monthShort(m: number) {
  return m === 10 ? 'oct' : 'nov';
}

export default function ReservarPage() {
  const [cabin, setCabin] = useState<Cabin>('naciente');
  const [checkIn, setCheckIn] = useState<DateCell | null>(null);
  const [checkOut, setCheckOut] = useState<DateCell | null>(null);
  const [hover, setHover] = useState<DateCell | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [blocked, setBlocked] = useState<Record<Cabin, Record<number, number[]>>>({ naciente: {}, poniente: {} });
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/disponibilidad');
        const data = await res.json();
        const next: Record<Cabin, Record<number, number[]>> = { naciente: {}, poniente: {} };
        for (const b of (data.bloqueos || []) as BloqueoApi[]) {
          const start = new Date(b.fecha_inicio + 'T00:00:00');
          const end = new Date(b.fecha_fin + 'T00:00:00');
          for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
            const m = dt.getMonth() + 1;
            const d = dt.getDate();
            if (!next[b.cabana_id][m]) next[b.cabana_id][m] = [];
            next[b.cabana_id][m].push(d);
          }
        }
        if (!cancelled) setBlocked(next);
      } catch {
        // si falla, dejamos el calendario sin bloqueos conocidos en vez de romper la página
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isBlocked = (m: number, d: number) => (blocked[cabin][m] || []).includes(d);

  const hasBlockedBetween = (a: DateCell, b: DateCell) => {
    let cur: DateCell = { m: a.m, d: a.d + 1 };
    while (keyOf(cur) < keyOf(b)) {
      const daysInM = cur.m === 10 ? 31 : 30;
      if (cur.d > daysInM) {
        cur = { m: 11, d: cur.d - daysInM };
        continue;
      }
      if (isBlocked(cur.m, cur.d)) return true;
      cur = { m: cur.m, d: cur.d + 1 };
    }
    return false;
  };

  const pickDay = (m: number, d: number) => {
    if (isBlocked(m, d)) return;
    const cell = { m, d };
    if (!checkIn || checkOut) {
      setCheckIn(cell);
      setCheckOut(null);
      return;
    }
    if (keyOf(cell) > keyOf(checkIn)) {
      if (hasBlockedBetween(checkIn, cell)) {
        setCheckIn(cell);
        setCheckOut(null);
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
    return dayIndex(checkOut) - dayIndex(checkIn);
  }, [checkIn, checkOut]);

  const total = nights * PRICE_PER_NIGHT;

  const rangeHeadline = checkIn && checkOut
    ? `${checkIn.d} ${monthShort(checkIn.m)} – ${checkOut.d} ${monthShort(checkOut.m)}`
    : checkIn
      ? `${checkIn.d} ${monthShort(checkIn.m)} – elige salida`
      : 'Selecciona tus fechas';

  const canSubmit = !!(checkIn && checkOut && guestName && guestEmail && !submitting);

  async function handlePagar() {
    if (!checkIn || !checkOut || !guestName || !guestEmail) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const fechaInicio = `2026-${String(checkIn.m).padStart(2, '0')}-${String(checkIn.d).padStart(2, '0')}`;
      const fechaFin = `2026-${String(checkOut.m).padStart(2, '0')}-${String(checkOut.d).padStart(2, '0')}`;
      const res = await fetch('/api/flow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabanaId: cabin,
          fechaInicio,
          fechaFin,
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

  function buildMonthDays(month: typeof MONTHS[number]) {
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
        key: `blank-${month.m}-${i}`,
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

    const effectiveEnd = checkOut || hover;

    for (let d = 1; d <= month.days; d++) {
      const cell = { m: month.m, d };
      const blockedDay = isBlocked(month.m, d);
      const isStart = !!checkIn && keyOf(cell) === keyOf(checkIn);
      const isEnd = !!checkOut && keyOf(cell) === keyOf(checkOut);
      const previewEnd = !checkOut && !!hover && !!checkIn && keyOf(hover) > keyOf(checkIn);
      const isHoverEnd = previewEnd && keyOf(cell) === keyOf(hover as DateCell);
      let inRange = false;
      if (checkIn && effectiveEnd && keyOf(effectiveEnd) > keyOf(checkIn)) {
        inRange = keyOf(cell) > keyOf(checkIn) && keyOf(cell) < keyOf(effectiveEnd);
      }
      const isSelectedEdge = isStart || isEnd || isHoverEnd;

      let wrapBg = '';
      if (inRange) wrapBg = 'bg-[#f3ede4]';
      if (isStart && (checkOut || previewEnd)) wrapBg = 'bg-gradient-to-r from-transparent from-50% to-[#f3ede4] to-50%';
      if (isEnd || isHoverEnd) wrapBg = 'bg-gradient-to-r from-[#f3ede4] from-50% to-transparent to-50%';
      if (isStart && !checkOut && !previewEnd) wrapBg = '';

      let numClass = 'w-9 h-9 rounded-full flex items-center justify-center text-sm ';
      if (blockedDay) {
        numClass += 'bg-[#e7e2d9] text-[#b5aa98] cursor-not-allowed';
      } else if (isSelectedEdge) {
        numClass += 'bg-[#111111] text-white font-bold cursor-pointer';
      } else {
        numClass += 'text-[#111111] font-medium cursor-pointer hover:shadow-[inset_0_0_0_1.5px_#111111]';
      }

      cells.push({
        key: `${month.m}-${d}`,
        label: String(d),
        disabled: blockedDay,
        blank: false,
        onClick: () => pickDay(month.m, d),
        onMouseEnter: () => !blockedDay && setHover(cell),
        onMouseLeave: () => setHover(null),
        wrapClass: `h-10 flex items-center justify-center ${wrapBg} ${blockedDay ? 'cursor-not-allowed' : 'cursor-pointer'}`,
        numClass,
      });
    }

    return cells;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20 w-full flex-1">
        <div className="mb-10">
          <div className="text-xs tracking-[2px] uppercase text-secondary font-semibold mb-2">Tiny Puertecillo</div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#001f14] mb-2">Reserva tu Tiny en Puertecillo</h1>
          <p className="text-[#3a3a3a] text-sm md:text-base">Elige tu Tiny, tus fechas y paga en línea de forma segura con Flow.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Calendar side */}
          <div className="flex-[1.5] w-full flex flex-col gap-6">
            <div className="flex gap-3">
              {(['naciente', 'poniente'] as Cabin[]).map((c) => (
                <button
                  key={c}
                  onClick={() => { setCabin(c); setCheckIn(null); setCheckOut(null); }}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    cabin === c ? 'bg-[#163428] text-white' : 'bg-[#eee7da] text-[#3a3a3a] hover:bg-[#e5dbcd]'
                  }`}
                >
                  {CABIN_LABEL[c]}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-serif text-lg text-[#001f14]">{rangeHeadline}</h2>
                  {(checkIn || checkOut) && (
                    <button
                      onClick={() => { setCheckIn(null); setCheckOut(null); setHover(null); }}
                      className="text-xs text-[#3a3a3a] underline font-semibold"
                    >
                      Borrar fechas
                    </button>
                  )}
                </div>
                <div className="text-xs text-secondary flex gap-4 items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#e7e2d9] inline-block" />Ocupado</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#111111] inline-block" />Tus fechas</span>
                </div>
              </div>

              {loadingAvailability && (
                <div className="text-xs text-[#8a8a8a]">Cargando disponibilidad…</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {MONTHS.map((month) => (
                  <div key={month.m} className="flex flex-col gap-3.5">
                    <div className="text-center text-[15px] font-bold text-[#001f14]">{month.label}</div>
                    <div className="grid grid-cols-7">
                      {WEEKDAY_LABELS.map((wd, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wide pb-1.5">{wd}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {buildMonthDays(month).map((cell) => (
                        <div key={cell.key} className={cell.wrapClass} onClick={cell.onClick} onMouseEnter={cell.onMouseEnter} onMouseLeave={cell.onMouseLeave}>
                          {!cell.blank && <div className={cell.numClass}>{cell.label}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-sm text-[#3a3a3a] pt-1">
                {checkIn && checkOut ? `${nights} noches en ${CABIN_LABEL[cabin]}` : checkIn ? 'Elige tu fecha de salida' : 'Elige tu fecha de llegada'}
              </div>
            </div>
          </div>

          {/* Summary side */}
          <div className="flex-1 w-full bg-white rounded-xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4 lg:sticky lg:top-24">
            <h2 className="font-serif text-xl text-[#001f14]">Resumen de tu reserva</h2>

            <div className="flex flex-col gap-2.5 pb-3.5">
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Cabaña</span><span className="font-semibold">{CABIN_LABEL[cabin]}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Check-in</span><span className="font-semibold">{checkIn ? `${checkIn.d} ${monthShort(checkIn.m)} 2026` : '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Check-out</span><span className="font-semibold">{checkOut ? `${checkOut.d} ${monthShort(checkOut.m)} 2026` : '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#3a3a3a]">Noches</span><span className="font-semibold">{nights}</span></div>
            </div>

            <div className="h-px bg-[#eee7da]" />

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
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
                />
              </div>
            </div>

            <button
              onClick={handlePagar}
              disabled={!canSubmit}
              className={`mt-2 text-center rounded-lg py-4 px-6 text-[15px] font-semibold transition-opacity ${
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
      <SiteFooter />
    </div>
  );
}

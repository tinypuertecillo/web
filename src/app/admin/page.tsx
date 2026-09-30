'use client';

import React, { useEffect, useState, useCallback } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TarifasAdmin from './TarifasAdmin';

type Cabin = 'naciente' | 'poniente';

type Bloqueo = {
  id: string;
  cabana_id: Cabin;
  fecha_inicio: string;
  fecha_fin: string;
  canal: string;
  huesped_nombre: string | null;
  huesped_telefono: string | null;
  huesped_email: string | null;
  notas: string | null;
};

const CABIN_LABEL: Record<Cabin, string> = {
  naciente: 'Tiny House Naciente',
  poniente: 'Tiny House Poniente',
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loading, setLoading] = useState(false);

  const [cabanaId, setCabanaId] = useState<Cabin>('naciente');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [huespedNombre, setHuespedNombre] = useState('');
  const [huespedTelefono, setHuespedTelefono] = useState('');
  const [huespedEmail, setHuespedEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [formError, setFormError] = useState('');

  const [precioNoche, setPrecioNoche] = useState<number | null>(null);
  const [precioInput, setPrecioInput] = useState('');
  const [precioMsg, setPrecioMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [precioFinSemana, setPrecioFinSemana] = useState<number | null>(null);
  const [finSemanaInput, setFinSemanaInput] = useState('');

  const loadPrecio = useCallback(async () => {
    const [res, resAjustes] = await Promise.all([fetch('/api/admin/precios/base'), fetch('/api/admin/precios/ajustes')]);
    if (res.ok) {
      const data = await res.json();
      setPrecioNoche(data.precioNoche);
      setPrecioInput(String(data.precioNoche));
    }
    if (resAjustes.ok) {
      const data = await resAjustes.json();
      setPrecioFinSemana(data.precioFinSemana ?? null);
      setFinSemanaInput(data.precioFinSemana ? String(data.precioFinSemana) : '');
    }
  }, []);

  const loadBloqueos = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/bloqueos');
    if (res.status === 401) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setBloqueos(data.bloqueos || []);
    setAuthed(true);
    setLoading(false);
    loadPrecio();
  }, [loadPrecio]);

  useEffect(() => {
    loadBloqueos();
  }, [loadBloqueos]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError('Contraseña incorrecta');
      return;
    }
    setPassword('');
    loadBloqueos();
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setBloqueos([]);
  }

  async function handleAddBloqueo(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!fechaInicio || !fechaFin) {
      setFormError('Elige fecha de inicio y fin');
      return;
    }
    const res = await fetch('/api/admin/bloqueos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cabanaId,
        fechaInicio,
        fechaFin,
        huespedNombre: huespedNombre || undefined,
        huespedTelefono: huespedTelefono || undefined,
        huespedEmail: huespedEmail || undefined,
        notas: notas || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || 'No se pudo bloquear la fecha');
      return;
    }
    setFechaInicio('');
    setFechaFin('');
    setHuespedNombre('');
    setHuespedTelefono('');
    setHuespedEmail('');
    setNotas('');
    loadBloqueos();
  }

  async function handleGuardarPrecio(e: React.FormEvent) {
    e.preventDefault();
    setPrecioMsg(null);
    const valor = Number(precioInput);
    if (!Number.isInteger(valor) || valor <= 0) {
      setPrecioMsg({ ok: false, text: 'Ingresa un precio válido (número entero, sin puntos)' });
      return;
    }
    const finSemana = finSemanaInput === '' ? null : Number(finSemanaInput);
    if (finSemana !== null && (!Number.isInteger(finSemana) || finSemana <= 0)) {
      setPrecioMsg({ ok: false, text: 'Ingresa un precio de viernes y sábado válido (número entero, sin puntos)' });
      return;
    }
    setGuardandoPrecio(true);
    const [res, resFin] = await Promise.all([
      fetch('/api/admin/precios/base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precioNoche: valor }),
      }),
      fetch('/api/admin/precios/ajustes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precioFinSemana: finSemana }),
      }),
    ]);
    setGuardandoPrecio(false);
    if (!res.ok || !resFin.ok) {
      const data = await (res.ok ? resFin : res).json().catch(() => ({}));
      setPrecioMsg({ ok: false, text: data.error || 'No se pudieron guardar los precios' });
      return;
    }
    setPrecioNoche(valor);
    setPrecioFinSemana(finSemana);
    setPrecioMsg({ ok: true, text: 'Precios actualizados para ambas cabañas' });
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desbloquear estas fechas?')) return;
    await fetch(`/api/admin/bloqueos?id=${id}`, { method: 'DELETE' });
    loadBloqueos();
  }

  if (authed === null || loading) {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
        <SiteHeader />
        <div className="flex-1" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center px-5 py-20">
          <form onSubmit={handleLogin} className="max-w-sm w-full bg-white rounded-2xl p-8 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4">
            <div className="text-xs tracking-[2px] uppercase text-secondary font-semibold">Tiny Puertecillo</div>
            <h1 className="font-serif text-2xl text-[#001f14]">Acceso administrador</h1>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
              autoFocus
            />
            {loginError && <div className="text-sm text-red-600">{loginError}</div>}
            <button type="submit" className="mt-2 rounded-lg py-3.5 px-6 text-[15px] font-semibold bg-[#163428] text-white hover:opacity-90 transition-opacity">
              Ingresar
            </button>
          </form>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-14 md:py-20 w-full flex-1">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-3">
          <div>
            <div className="text-xs tracking-[2px] uppercase text-secondary font-semibold mb-2">Tiny Puertecillo</div>
            <h1 className="font-serif text-3xl md:text-4xl text-[#001f14]">Panel de administración</h1>
          </div>
          <button onClick={handleLogout} className="text-sm underline text-[#3a3a3a] font-semibold">
            Cerrar sesión
          </button>
        </div>

        <form onSubmit={handleGuardarPrecio} className="w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4 mb-10">
          <div>
            <h2 className="font-serif text-xl text-[#001f14]">Precio base por noche</h2>
            <div className="text-[11px] text-[#8a8a8a] mt-1">Aplica a Tiny House Naciente y Poniente.</div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Domingo a jueves (CLP por noche)</label>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={precioInput}
                onChange={(e) => setPrecioInput(e.target.value)}
                placeholder="Ej: 85000"
                className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Viernes y sábado (CLP por noche)</label>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={finSemanaInput}
                onChange={(e) => setFinSemanaInput(e.target.value)}
                placeholder="Vacío = igual al de domingo a jueves"
                className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
              />
            </div>
            <button type="submit" disabled={guardandoPrecio} className="rounded-lg py-3.5 px-6 text-[15px] font-semibold bg-[#163428] text-white hover:opacity-90 transition-opacity disabled:opacity-50">
              {guardandoPrecio ? 'Guardando…' : 'Guardar precios'}
            </button>
          </div>
          {precioNoche !== null && (
            <div className="text-sm text-[#3a3a3a]">
              Precio actual: <span className="font-semibold">${precioNoche.toLocaleString('es-CL')}</span> de domingo a jueves
              {' · '}
              <span className="font-semibold">${(precioFinSemana ?? precioNoche).toLocaleString('es-CL')}</span> viernes y sábado
            </div>
          )}
          {precioMsg && <div className={`text-sm ${precioMsg.ok ? 'text-[#163428]' : 'text-red-600'}`}>{precioMsg.text}</div>}
        </form>

        <TarifasAdmin precioBase={precioNoche} precioFinSemana={precioFinSemana} />

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <form onSubmit={handleAddBloqueo} className="flex-1 w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4">
            <h2 className="font-serif text-xl text-[#001f14]">Bloquear fechas</h2>
            <div className="flex gap-3">
              {(['naciente', 'poniente'] as Cabin[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCabanaId(c)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    cabanaId === c ? 'bg-[#163428] text-white' : 'bg-[#eee7da] text-[#3a3a3a] hover:bg-[#e5dbcd]'
                  }`}
                >
                  {CABIN_LABEL[c]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Desde</label>
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Hasta</label>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]" />
              </div>
            </div>
            <div className="text-[11px] text-[#8a8a8a] -mt-2">Los datos del huésped son opcionales y se pueden agregar después.</div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Nombre del huésped (opcional)</label>
              <input type="text" value={huespedNombre} onChange={(e) => setHuespedNombre(e.target.value)} className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Celular (opcional)</label>
                <input type="tel" value={huespedTelefono} onChange={(e) => setHuespedTelefono(e.target.value)} className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Correo (opcional)</label>
                <input type="email" value={huespedEmail} onChange={(e) => setHuespedEmail(e.target.value)} className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-secondary font-bold">Notas (opcional)</label>
              <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: reserva por Airbnb" className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]" />
            </div>
            {formError && <div className="text-sm text-red-600">{formError}</div>}
            <button type="submit" className="mt-2 rounded-lg py-3.5 px-6 text-[15px] font-semibold bg-[#163428] text-white hover:opacity-90 transition-opacity">
              Bloquear fechas
            </button>
          </form>

          <div className="flex-1 w-full bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4">
            <h2 className="font-serif text-xl text-[#001f14]">Fechas bloqueadas</h2>
            {bloqueos.length === 0 && <div className="text-sm text-[#8a8a8a]">No hay fechas bloqueadas.</div>}
            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto">
              {bloqueos.map((b) => (
                <div key={b.id} className="border border-[#eee7da] rounded-lg p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#001f14]">{CABIN_LABEL[b.cabana_id]}</span>
                    <button onClick={() => handleDelete(b.id)} className="text-xs text-red-600 underline font-semibold">
                      Desbloquear
                    </button>
                  </div>
                  <div className="text-sm text-[#3a3a3a]">{b.fecha_inicio} → {b.fecha_fin}</div>
                  <div className="text-xs text-[#8a8a8a]">Canal: {b.canal}</div>
                  {(b.huesped_nombre || b.huesped_telefono || b.huesped_email) && (
                    <div className="text-xs text-[#8a8a8a]">
                      {[b.huesped_nombre, b.huesped_telefono, b.huesped_email].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {b.notas && <div className="text-xs text-[#8a8a8a] italic">{b.notas}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

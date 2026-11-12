'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { pagosEnCurso } from '@/lib/panelUtils';
import './panel.css';
import AjustesAdmin from './AjustesAdmin';
import CalendarioAdmin from './CalendarioAdmin';
import PreciosAdmin, { TEMAS, type TemaPrecios } from './PreciosAdmin';
import ReservasAdmin from './ReservasAdmin';
import Resumen from './Resumen';
import { ICONOS, Cabecera } from './ui';
import { useDatosPanel } from './useDatosPanel';

type Seccion = 'resumen' | 'reservas' | 'calendario' | 'precios' | 'ajustes';

const SECCIONES: { id: Seccion; titulo: string }[] = [
  { id: 'resumen', titulo: 'Resumen' },
  { id: 'reservas', titulo: 'Reservas' },
  { id: 'calendario', titulo: 'Calendario' },
  { id: 'precios', titulo: 'Precios' },
  { id: 'ajustes', titulo: 'Ajustes' },
];

// La sección y el tema de precios quedan en la dirección (#precios/codigos) para poder recargar o compartir el enlace.
function leerHash(): { seccion: Seccion; tema: TemaPrecios } {
  const inicial = { seccion: 'resumen' as Seccion, tema: 'precio' as TemaPrecios };
  if (typeof window === 'undefined') return inicial;
  const [s, t] = window.location.hash.replace('#', '').split('/');
  const seccion = SECCIONES.find((x) => x.id === s)?.id ?? inicial.seccion;
  const tema = TEMAS.find((x) => x.id === t)?.id ?? inicial.tema;
  return { seccion, tema };
}

export default function AdminPage() {
  const datos = useDatosPanel();
  const [{ seccion, tema }, setVista] = useState(leerHash);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  function irA(s: Seccion, t?: TemaPrecios | string) {
    const nuevoTema = (TEMAS.find((x) => x.id === t)?.id ?? tema) as TemaPrecios;
    setVista({ seccion: s, tema: nuevoTema });
    try {
      window.history.replaceState(null, '', `#${s}${s === 'precios' ? `/${nuevoTema}` : ''}`);
      window.scrollTo(0, 0);
    } catch {
      // sin acceso a la dirección: la navegación funciona igual
    }
  }

  // Si cambia la dirección a mano (o con atrás/adelante), el panel sigue al enlace
  useEffect(() => {
    const alCambiar = () => setVista(leerHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError(res.status === 429 ? 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' : 'Contraseña incorrecta');
        return;
      }
      setPassword('');
      datos.recargar();
    } catch {
      setLoginError('No se pudo conectar. Intenta de nuevo.');
    }
  }

  const enCurso = useMemo(
    () => pagosEnCurso(datos.reservas, datos.vigenteDesde, datos.retencionMinutos, datos.cargadoEn).length,
    [datos.reservas, datos.vigenteDesde, datos.retencionMinutos, datos.cargadoEn]
  );

  if (datos.estado === 'cargando') {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
        <SiteHeader />
        <div className="flex-1" />
      </div>
    );
  }

  if (datos.estado === 'sinSesion') {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center px-5 py-20">
          <form onSubmit={handleLogin} className="max-w-sm w-full bg-white rounded-2xl p-8 shadow-[0_20px_40px_rgba(29,27,22,0.05)] flex flex-col gap-4">
            <div className="text-xs tracking-[2px] uppercase text-secondary font-semibold">Tiny Puertecillo</div>
            <h1 className="font-serif text-2xl text-[#001f14]">Acceso administrador</h1>
            <label htmlFor="admin-clave" className="sr-only">Contraseña</label>
            <input
              id="admin-clave"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="border-0 border-b-2 border-[#dcd0bf] py-2 px-0.5 text-sm bg-transparent outline-none focus:border-[#001f14]"
              autoFocus
            />
            {loginError && <div className="text-sm text-red-600" role="alert">{loginError}</div>}
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
    <div className="adm">
      <div className="app">
        <aside className="side">
          <div className="brand">
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#163428" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19l6-10 4 6 3-4 5 8z" /></svg>
            </div>
            <div><b>Tiny Puertecillo</b><small>Panel de reservas</small></div>
          </div>
          <nav className="nav" aria-label="Secciones del panel">
            {SECCIONES.map((s) => (
              <button key={s.id} type="button" className={seccion === s.id ? 'on' : ''} aria-current={seccion === s.id ? 'page' : undefined} onClick={() => irA(s.id)}>
                {ICONOS[s.id]}
                {s.titulo}
                {s.id === 'reservas' && enCurso > 0 && <span className="conteo" aria-label={`${enCurso} pagos en curso`}>{enCurso}</span>}
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <span>Sesión de administrador</span>
            <button type="button" className="link" style={{ color: '#e9efe9', textAlign: 'left' }} onClick={datos.cerrarSesion}>Cerrar sesión</button>
          </div>
        </aside>

        <main className="main">
          {seccion === 'resumen' && <Resumen datos={datos} irA={(s, t) => irA(s, t)} />}
          {seccion === 'reservas' && <ReservasAdmin datos={datos} />}
          {seccion === 'calendario' && <CalendarioAdmin datos={datos} />}
          {seccion === 'precios' && <PreciosAdmin tema={tema} setTema={(t) => irA('precios', t)} />}
          {seccion === 'ajustes' && (
            <>
              <Cabecera titulo="Ajustes" ayuda="Cuántas personas y mascotas admite cada Tiny." />
              <AjustesAdmin />
            </>
          )}
        </main>
      </div>

      <nav className="tabbar" aria-label="Secciones del panel">
        {SECCIONES.map((s) => (
          <button key={s.id} type="button" className={seccion === s.id ? 'on' : ''} aria-current={seccion === s.id ? 'page' : undefined} onClick={() => irA(s.id)}>
            {ICONOS[s.id]}
            {s.titulo}
            {s.id === 'reservas' && enCurso > 0 && <span className="dotc">{enCurso}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Bloqueo, ReservaPanel } from '@/lib/panelUtils';

export type CodigoResumen = { id: string; codigo: string; valido_hasta: string; usos: number; usos_max: number; activo: boolean };

export type DatosPanel = {
  estado: 'cargando' | 'sinSesion' | 'listo';
  reservas: ReservaPanel[];
  bloqueos: Bloqueo[];
  codigos: CodigoResumen[];
  vigenteDesde: string;
  retencionMinutos: number;
  cargadoEn: number; // instante de la última carga (para calcular minutos restantes sin leer el reloj al dibujar)
  error: string;
  recargar: () => void;
  cerrarSesion: () => void;
};

type Cargado = Omit<DatosPanel, 'recargar' | 'cerrarSesion'>;

const VACIO: Cargado = { estado: 'cargando', reservas: [], bloqueos: [], codigos: [], vigenteDesde: '', retencionMinutos: 20, cargadoEn: 0, error: '' };

async function leer(url: string) {
  const res = await fetch(url);
  return { status: res.status, ok: res.ok, data: await res.json().catch(() => ({})) };
}

// Trae de una vez lo que necesitan el Resumen, Reservas y Calendario. Cada sección lo comparte y puede pedir una recarga.
async function cargarTodo(): Promise<Cargado> {
  try {
    const [b, r, c] = await Promise.all([leer('/api/admin/bloqueos'), leer('/api/admin/reservas'), leer('/api/admin/codigos')]);
    if (b.status === 401 || r.status === 401) return { ...VACIO, estado: 'sinSesion' };
    const errores: string[] = [];
    if (!b.ok) errores.push('las fechas bloqueadas');
    if (!r.ok) errores.push('las reservas');
    return {
      estado: 'listo',
      bloqueos: b.ok ? b.data.bloqueos || [] : [],
      reservas: r.ok ? r.data.reservas || [] : [],
      // Si la tabla de códigos todavía no existe responde 503: el Resumen simplemente no avisa de códigos.
      codigos: c.ok ? c.data.codigos || [] : [],
      vigenteDesde: r.ok ? r.data.pendienteVigenteDesde || '' : '',
      retencionMinutos: r.ok && typeof r.data.retencionMinutos === 'number' ? r.data.retencionMinutos : 20,
      cargadoEn: Date.now(),
      error: errores.length ? `No se pudieron cargar ${errores.join(' ni ')}. Revisa tu conexión y pulsa Actualizar.` : '',
    };
  } catch {
    return { ...VACIO, estado: 'listo', cargadoEn: Date.now(), error: 'No se pudieron cargar los datos. Revisa tu conexión y pulsa Actualizar.' };
  }
}

export function useDatosPanel(): DatosPanel {
  const [datos, setDatos] = useState<Cargado>(VACIO);

  const recargar = useCallback(() => {
    cargarTodo().then(setDatos);
  }, []);

  useEffect(() => {
    let cancelado = false;
    cargarTodo().then((d) => {
      if (!cancelado) setDatos(d);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const cerrarSesion = useCallback(() => {
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => setDatos({ ...VACIO, estado: 'sinSesion' }));
  }, []);

  return { ...datos, recargar, cerrarSesion };
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { DescuentoNoches, ExtrasHuespedes } from '@/lib/pricingCore';
import CalculadoraUtilidad from './CalculadoraUtilidad';
import CodigosAdmin from './CodigosAdmin';
import HuespedesAdmin from './HuespedesAdmin';
import PrecioNoche from './PrecioNoche';
import TarifasAdmin from './TarifasAdmin';
import { Cabecera } from './ui';

export type TemaPrecios = 'precio' | 'temporadas' | 'descuentos' | 'codigos' | 'cobros' | 'calculadora';

export const TEMAS: { id: TemaPrecios; titulo: string; detalle: string }[] = [
  { id: 'precio', titulo: 'Precio por noche', detalle: 'Entre semana y fin de semana' },
  { id: 'temporadas', titulo: 'Temporadas y fechas especiales', detalle: 'Precio distinto por calendario' },
  { id: 'descuentos', titulo: 'Descuentos y estadía mínima', detalle: 'Desde cuántas noches' },
  { id: 'codigos', titulo: 'Códigos de descuento', detalle: 'Uno por celular' },
  { id: 'cobros', titulo: 'Cobros por huésped', detalle: 'Adultos, niños y mascotas' },
  { id: 'calculadora', titulo: 'Calculadora de ganancia', detalle: 'Cuánto queda después de costos' },
];

type Config = { precioNoche: number | null; precioFinSemana: number | null; descuentos: DescuentoNoches[]; extras: ExtrasHuespedes | undefined };

async function pedirConfig(): Promise<Config | null> {
  try {
    const [b, a] = await Promise.all([fetch('/api/admin/precios/base'), fetch('/api/admin/precios/ajustes')]);
    if (!b.ok || !a.ok) return null;
    const base = await b.json();
    const ajustes = await a.json();
    return { precioNoche: base.precioNoche ?? null, precioFinSemana: ajustes.precioFinSemana ?? null, descuentos: ajustes.descuentos ?? [], extras: ajustes.extras };
  } catch {
    return null;
  }
}

// Precios: un tema a la vez, para que cada pantalla tenga una sola cosa que decidir.
export default function PreciosAdmin({ tema, setTema }: { tema: TemaPrecios; setTema: (t: TemaPrecios) => void }) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(() => {
    pedirConfig().then((c) => {
      setCfg(c);
      setFallo(c === null);
    });
  }, []);

  useEffect(() => {
    let cancelado = false;
    pedirConfig().then((c) => {
      if (cancelado) return;
      setCfg(c);
      setFallo(c === null);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const conPreview = tema === 'precio' || tema === 'descuentos' || tema === 'cobros';

  return (
    <>
      <Cabecera titulo="Precios" ayuda="Elige un tema para cambiar solo eso." />
      {fallo && <div className="alert bad" role="alert"><b>No se pudieron cargar los precios.</b><span>Revisa tu conexión y vuelve a abrir esta sección.</span></div>}

      <div className={conPreview ? 'grid3' : 'grid2'}>
        <nav className="subnav" aria-label="Temas de precios">
          {TEMAS.map((t) => (
            <button key={t.id} type="button" className={tema === t.id ? 'on' : ''} aria-current={tema === t.id ? 'page' : undefined} onClick={() => setTema(t.id)}>
              {t.titulo}<small>{t.detalle}</small>
            </button>
          ))}
        </nav>

        {tema === 'precio' && cfg && (
          <PrecioNoche key={`${cfg.precioNoche}-${cfg.precioFinSemana}`} precioNoche={cfg.precioNoche} precioFinSemana={cfg.precioFinSemana} descuentos={cfg.descuentos} extras={cfg.extras} onGuardado={cargar} />
        )}
        {tema === 'temporadas' && <TarifasAdmin precioBase={cfg?.precioNoche ?? null} precioFinSemana={cfg?.precioFinSemana ?? null} seccion="temporadas" />}
        {tema === 'descuentos' && <TarifasAdmin precioBase={cfg?.precioNoche ?? null} precioFinSemana={cfg?.precioFinSemana ?? null} seccion="descuentos" />}
        {tema === 'codigos' && <CodigosAdmin />}
        {tema === 'cobros' && <HuespedesAdmin precioBase={cfg?.precioNoche ?? null} parte="cobros" />}
        {tema === 'calculadora' && <CalculadoraUtilidad precioBase={cfg?.precioNoche ?? null} />}
      </div>
    </>
  );
}

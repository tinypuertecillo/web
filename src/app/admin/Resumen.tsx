'use client';

import React, { useMemo } from 'react';
import {
  barrasLinea,
  cobradoWebMes,
  conflictos,
  diaSemanaCorto,
  etiquetaCanal,
  fechaCompleta,
  llegadasProximas,
  lunesDe,
  movimientos,
  nombreCabana,
  ocupacionMes,
  pagosEnCurso,
  plural,
  rangoFechas,
  sumarDias,
} from '@/lib/panelUtils';
import type { DatosPanel } from './useDatosPanel';
import { Cabecera, Chip, fmtCLP, Leyenda, LineaTiempo, useHoy } from './ui';

type Props = { datos: DatosPanel; irA: (seccion: 'reservas' | 'calendario' | 'precios', tema?: string) => void };

// "2 por la web, 1 por Airbnb" a partir del conteo por canal
function textoCanales(porCanal: Record<string, number>): string {
  const partes = Object.entries(porCanal)
    .sort((a, b) => b[1] - a[1])
    .map(([canal, n]) => `${n} ${canal === 'web' ? 'por la web' : `por ${etiquetaCanal(canal)}`}`);
  if (partes.length <= 1) return partes[0] ?? 'Sin llegadas';
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

export default function Resumen({ datos, irA }: Props) {
  const hoy = useHoy();
  const { bloqueos, reservas, codigos, vigenteDesde, retencionMinutos, cargadoEn } = datos;

  const calc = useMemo(() => {
    if (!hoy) return null;
    const pagos = pagosEnCurso(reservas, vigenteDesde, retencionMinutos, cargadoEn);
    const desde = lunesDe(hoy);
    return {
      pagos,
      choques: conflictos(reservas, bloqueos, hoy),
      llegadas: llegadasProximas(bloqueos, hoy, 7),
      ocupacion: ocupacionMes(bloqueos, hoy),
      cobrado: cobradoWebMes(reservas, hoy),
      barras: barrasLinea(bloqueos, pagos, desde, 28),
      desde,
      lista: movimientos(bloqueos, hoy, 14).slice(0, 6),
      porVencer: codigos.filter((c) => c.activo && c.usos < c.usos_max && c.valido_hasta >= hoy && c.valido_hasta <= sumarDias(hoy, 7)).length,
    };
  }, [hoy, bloqueos, reservas, codigos, vigenteDesde, retencionMinutos, cargadoEn]);

  if (!calc) return <div className="skel" aria-hidden="true" />;
  const { pagos, choques, llegadas, ocupacion, cobrado, barras, desde, lista, porVencer } = calc;
  const sinAtencion = pagos.length === 0 && choques.length === 0 && porVencer === 0;

  return (
    <>
      <Cabecera titulo="Resumen" ayuda={fechaCompleta(hoy).replace(/^./, (c) => c.toUpperCase())}>
        <button type="button" className="btn" onClick={datos.recargar}>Actualizar</button>
        <button type="button" className="btn" onClick={() => irA('calendario')}>Bloquear fechas</button>
      </Cabecera>

      {datos.error && <div className="alert bad" role="alert"><b>{datos.error}</b></div>}

      <section className="kpis" aria-label="Cifras del mes">
        <div className="kpi">
          <span>Llegadas en los próximos 7 días</span>
          <strong>{llegadas.total}</strong>
          <small>{textoCanales(llegadas.porCanal)}</small>
        </div>
        <div className="kpi">
          <span>Ocupación de {ocupacion.mes}</span>
          <strong>{ocupacion.pct} %</strong>
          <small>{ocupacion.ocupadas} de {ocupacion.total} noches</small>
        </div>
        <div className="kpi">
          <span>Cobrado por la web este mes</span>
          <strong>{fmtCLP(cobrado.total)}</strong>
          <small>{cobrado.cantidad} {cobrado.cantidad === 1 ? 'reserva pagada' : 'reservas pagadas'}</small>
        </div>
        <div className="kpi">
          <span>Pagos en curso</span>
          <strong>{pagos.length}</strong>
          <small>Se liberan solos a los {retencionMinutos} minutos</small>
        </div>
      </section>

      <section className="panel" aria-label="Ocupación de las dos Tiny">
        <div className="pan-head">
          <div>
            <h2>Ocupación de las dos Tiny</h2>
            <div className="sub">Próximas 4 semanas, con las reservas de la web y las fechas bloqueadas de Airbnb, Booking y otros canales.</div>
          </div>
          <Leyenda />
        </div>
        <LineaTiempo barras={barras} desde={desde} hoy={hoy} />
      </section>

      <div className="cols">
        <section className="panel" aria-label="Llegadas y salidas">
          <div className="pan-head">
            <div>
              <h2>Llegadas y salidas</h2>
              <div className="sub">Lo que viene en los próximos 14 días.</div>
            </div>
            <button type="button" className="link" onClick={() => irA('reservas')}>Ver todas las reservas</button>
          </div>
          {lista.length === 0 ? (
            <div className="sub">No hay llegadas ni salidas en los próximos 14 días.</div>
          ) : (
            <div className="list">
              {lista.map((m) => (
                <div className="row" key={`${m.fecha}-${m.tipo}-${m.cabana}`}>
                  <div className="day">{Number(m.fecha.slice(8, 10))}<small>{diaSemanaCorto(m.fecha)}</small></div>
                  <div className="who">
                    <b>{m.tipo === 'llega' ? 'Llega' : 'Sale'} {m.nombre} {m.tipo === 'llega' ? 'a' : 'de'} {nombreCabana(m.cabana)}</b>
                    <span>{m.tipo === 'llega' ? plural(m.noches, 'noche', 'noches') : `Estadía de ${plural(m.noches, 'noche', 'noches')}`}</span>
                  </div>
                  <div className="chips">
                    <Chip canal={m.canal} />
                    {m.canal === 'web' && <span className="chip ok">Pagada</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel" aria-label="Requiere atención">
          <div className="pan-head">
            <div>
              <h2>Requiere atención</h2>
              <div className="sub">Cosas que no se resuelven solas.</div>
            </div>
          </div>
          <div className="stack">
            {choques.map((r) => (
              <div className="alert bad" key={r.id}>
                <b>Pago con choque de fechas</b>
                <span>{nombreCabana(r.cabana_id)}, {rangoFechas(r.fecha_inicio, r.fecha_fin)}: ya estaba ocupada. Hay que devolver el pago o cambiar las fechas.</span>
              </div>
            ))}
            {pagos.map((p) => (
              <div className="alert" key={p.reserva.id}>
                <b>Pago en curso en {nombreCabana(p.reserva.cabana_id)}</b>
                <span>{rangoFechas(p.reserva.fecha_inicio, p.reserva.fecha_fin)}. Si no se paga en {plural(p.minutos, 'minuto', 'minutos')}, las fechas se liberan.</span>
              </div>
            ))}
            {porVencer > 0 && (
              <div className="alert" style={{ background: '#efece3', color: '#2b3730' }}>
                <b>{porVencer === 1 ? '1 código de descuento vence' : `${porVencer} códigos de descuento vencen`} esta semana</b>
                <span><button type="button" className="link" onClick={() => irA('precios', 'codigos')}>Revisar códigos</button></span>
              </div>
            )}
            {sinAtencion && <div className="sub">Todo en orden: no hay nada pendiente.</div>}
          </div>
        </section>
      </div>
    </>
  );
}

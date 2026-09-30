import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { getConfigPrecios } from "@/lib/pricing";
import type { ExtrasHuespedes, TipoHuesped } from "@/lib/pricingCore";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { descuentoPct, precioFinSemana, extras } = await getConfigPrecios();
  return NextResponse.json({ descuentoPct, precioFinSemana, extras });
}

const TIPOS: TipoHuesped[] = ["adulto", "nino", "bebe", "mascota"];

// Guarda el % de descuento, el precio de fin de semana (vie y sáb; null = sin tarifa especial)
// y el cobro extra por noche de cada adulto adicional, niño, bebé y mascota (% o monto fijo).
export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const descuentoPct = Number(body.descuentoPct ?? 0);
  const finSemanaRaw = body.precioFinSemana;
  const precioFinSemana = finSemanaRaw === null || finSemanaRaw === "" || finSemanaRaw === undefined ? null : Number(finSemanaRaw);

  if (!Number.isFinite(descuentoPct) || descuentoPct < 0 || descuentoPct >= 100) {
    return NextResponse.json({ error: "El descuento debe estar entre 0 y 99,99" }, { status: 400 });
  }
  if (precioFinSemana !== null && (!Number.isInteger(precioFinSemana) || precioFinSemana <= 0)) {
    return NextResponse.json({ error: "El precio de fin de semana debe ser un entero mayor a 0" }, { status: 400 });
  }

  const fila: Record<string, unknown> = {
    id: 1,
    descuento_pct: descuentoPct,
    precio_fin_semana: precioFinSemana,
    updated_at: new Date().toISOString(),
  };

  // Los extras son opcionales en el cuerpo: si no vienen, se dejan como están.
  let extras: ExtrasHuespedes | undefined;
  if (body.extras) {
    extras = {} as ExtrasHuespedes;
    for (const tipo of TIPOS) {
      const e = body.extras[tipo];
      const valor = Number(e?.valor ?? 0);
      if (!e || (e.tipo !== "porcentaje" && e.tipo !== "monto") || !Number.isFinite(valor) || valor < 0) {
        return NextResponse.json({ error: `Extra inválido para ${tipo}` }, { status: 400 });
      }
      if (e.tipo === "porcentaje" && valor > 1000) {
        return NextResponse.json({ error: "El porcentaje máximo es 1000" }, { status: 400 });
      }
      if (e.tipo === "monto" && !Number.isInteger(valor)) {
        return NextResponse.json({ error: "El monto fijo debe ser un número entero" }, { status: 400 });
      }
      extras[tipo] = { tipo: e.tipo, valor };
      fila[`extra_${tipo}_tipo`] = e.tipo;
      fila[`extra_${tipo}_valor`] = valor;
    }
  }

  const { error } = await supabaseAdmin.from("ajustes_precios").upsert(fila);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ descuentoPct, precioFinSemana, extras });
}

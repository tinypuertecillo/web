import { NextRequest, NextResponse } from "next/server";
import { calcularPrecio, esFechaValida, getCapacidades, PrecioNoConfiguradoError } from "@/lib/pricing";
import { HUESPEDES_POR_DEFECTO, validarHuespedes } from "@/lib/pricingCore";
import { normalizarCodigo, validarCodigoConLimite } from "@/lib/codigos";

export const dynamic = "force-dynamic";

// Endpoint público: cotiza una estadía con las mismas reglas que usa el cobro en Flow.
// Si viene un código de descuento, se valida aquí en el servidor antes de aplicarlo.
export async function POST(req: NextRequest) {
  const { fechaInicio, fechaFin, cabanaId, huespedes, codigo, celular } = await req.json().catch(() => ({}));
  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin) || fechaFin <= fechaInicio) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }
  const guests = huespedes ?? HUESPEDES_POR_DEFECTO;
  const capacidades = await getCapacidades();
  const cap = cabanaId === "naciente" || cabanaId === "poniente" ? capacidades[cabanaId as "naciente" | "poniente"] : undefined;
  if (!validarHuespedes(guests, cap)) {
    return NextResponse.json({ error: "Cantidad de huéspedes o mascotas no válida para esta cabaña" }, { status: 400 });
  }
  let codigoPct = 0;
  if (normalizarCodigo(codigo)) {
    const res = await validarCodigoConLimite(req, codigo, celular);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    codigoPct = res.codigo.porcentaje;
  }
  try {
    return NextResponse.json(await calcularPrecio(fechaInicio, fechaFin, guests, codigoPct));
  } catch (e) {
    if (e instanceof PrecioNoConfiguradoError) {
      return NextResponse.json({ error: "Los precios no están disponibles por ahora. Escríbenos por WhatsApp." }, { status: 503 });
    }
    throw e;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { calcularPrecio, esFechaValida, getCapacidades } from "@/lib/pricing";
import { HUESPEDES_POR_DEFECTO, validarHuespedes } from "@/lib/pricingCore";

export const dynamic = "force-dynamic";

// Endpoint público: cotiza una estadía con las mismas reglas que usa el cobro en Flow.
export async function POST(req: NextRequest) {
  const { fechaInicio, fechaFin, cabanaId, huespedes } = await req.json().catch(() => ({}));
  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin) || fechaFin <= fechaInicio) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }
  const guests = huespedes ?? HUESPEDES_POR_DEFECTO;
  const capacidades = await getCapacidades();
  const cap = cabanaId === "naciente" || cabanaId === "poniente" ? capacidades[cabanaId as "naciente" | "poniente"] : undefined;
  if (!validarHuespedes(guests, cap)) {
    return NextResponse.json({ error: "Cantidad de huéspedes o mascotas no válida para esta cabaña" }, { status: 400 });
  }
  return NextResponse.json(await calcularPrecio(fechaInicio, fechaFin, guests));
}

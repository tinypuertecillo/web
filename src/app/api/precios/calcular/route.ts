import { NextRequest, NextResponse } from "next/server";
import { calcularPrecio, esFechaValida } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// Endpoint público: cotiza una estadía con las mismas reglas que usa el cobro en Flow.
export async function POST(req: NextRequest) {
  const { fechaInicio, fechaFin } = await req.json().catch(() => ({}));
  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin) || fechaFin <= fechaInicio) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }
  return NextResponse.json(await calcularPrecio(fechaInicio, fechaFin));
}

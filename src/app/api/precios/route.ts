import { NextResponse } from "next/server";
import { getCapacidades, getPrecioNoche } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// Endpoint público de solo lectura: precio base por noche y capacidad por cabaña
// para la página de reserva.
export async function GET() {
  const [precioNoche, capacidad] = await Promise.all([getPrecioNoche(), getCapacidades()]);
  return NextResponse.json({ precioNoche, capacidad });
}

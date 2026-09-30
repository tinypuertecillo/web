import { NextResponse } from "next/server";
import { getCapacidades, getMinNoches, getPrecioNoche } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// Endpoint público de solo lectura: precio base por noche, capacidad por cabaña y estadía mínima
// para la página de reserva.
export async function GET() {
  const [precioNoche, capacidad, minNoches] = await Promise.all([getPrecioNoche(), getCapacidades(), getMinNoches()]);
  return NextResponse.json({ precioNoche, capacidad, minNoches });
}

import { NextResponse } from "next/server";
import { getPrecioNoche } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// Endpoint público de solo lectura: precio base por noche para la página de reserva.
export async function GET() {
  const precioNoche = await getPrecioNoche();
  return NextResponse.json({ precioNoche });
}

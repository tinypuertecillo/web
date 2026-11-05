import { NextRequest, NextResponse } from "next/server";
import { validarCodigoConLimite } from "@/lib/codigos";

export const dynamic = "force-dynamic";

// Endpoint público: comprueba si un código de descuento sirve y devuelve su porcentaje.
// El descuento real siempre se vuelve a validar y calcular en el servidor al cotizar y al pagar.
export async function POST(req: NextRequest) {
  const { codigo, celular } = await req.json().catch(() => ({}));
  const res = await validarCodigoConLimite(req, codigo, celular);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ codigo: res.codigo.codigo, porcentaje: res.codigo.porcentaje, validoHasta: res.codigo.validoHasta });
}

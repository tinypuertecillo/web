import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Precio usado si la tabla precios_cabana no existe o no tiene filas,
// para que las reservas nunca queden sin precio.
export const PRECIO_NOCHE_POR_DEFECTO = 65000;

// Precio base por noche, único para ambas cabañas (naciente y poniente).
// Se edita desde /admin y se guarda en la tabla precios_cabana.
export async function getPrecioNoche(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("precios_cabana")
    .select("precio_noche")
    .order("updated_at", { ascending: false })
    .limit(1);

  const precio = data?.[0]?.precio_noche;
  if (error || typeof precio !== "number" || precio <= 0) {
    return PRECIO_NOCHE_POR_DEFECTO;
  }
  return precio;
}

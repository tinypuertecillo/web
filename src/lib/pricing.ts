import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  calcularPrecioConConfig,
  type ConfigPrecios,
  type ResultadoPrecio,
  type Tarifa,
} from "@/lib/pricingCore";

export * from "@/lib/pricingCore";

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

// Lee toda la configuración de precios. Si las tablas nuevas todavía no
// existen, se usan los valores por defecto (sin descuento ni tarifas).
export async function getConfigPrecios(): Promise<ConfigPrecios> {
  const [precioBase, ajustes, tarifas] = await Promise.all([
    getPrecioNoche(),
    supabaseAdmin.from("ajustes_precios").select("descuento_pct, precio_fin_semana").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("tarifas_fecha").select("*").order("fecha_inicio", { ascending: true }),
  ]);

  const descuento = Number(ajustes.data?.descuento_pct ?? 0);
  const finSemana = ajustes.data?.precio_fin_semana;

  return {
    precioBase,
    descuentoPct: Number.isFinite(descuento) && descuento > 0 && descuento < 100 ? descuento : 0,
    precioFinSemana: typeof finSemana === "number" && finSemana > 0 ? finSemana : null,
    tarifas: (tarifas.data ?? []) as Tarifa[],
  };
}

export async function calcularPrecio(fechaInicio: string, fechaFin: string): Promise<ResultadoPrecio> {
  return calcularPrecioConConfig(fechaInicio, fechaFin, await getConfigPrecios());
}

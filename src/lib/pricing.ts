import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  calcularPrecioConConfig,
  EXTRAS_POR_DEFECTO,
  type Capacidad,
  type ConfigPrecios,
  type ExtrasHuespedes,
  type Huespedes,
  type ResultadoPrecio,
  type Tarifa,
  type TipoHuesped,
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
    supabaseAdmin.from("ajustes_precios").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("tarifas_fecha").select("*").order("fecha_inicio", { ascending: true }),
  ]);

  const descuento = Number(ajustes.data?.descuento_pct ?? 0);
  const finSemana = ajustes.data?.precio_fin_semana;

  return {
    precioBase,
    descuentoPct: Number.isFinite(descuento) && descuento > 0 && descuento < 100 ? descuento : 0,
    precioFinSemana: typeof finSemana === "number" && finSemana > 0 ? finSemana : null,
    tarifas: (tarifas.data ?? []) as Tarifa[],
    extras: leerExtras(ajustes.data),
  };
}

// Lee los extras por huésped desde la fila de ajustes_precios (columnas extra_<tipo>_tipo / _valor).
export function leerExtras(row: Record<string, unknown> | null | undefined): ExtrasHuespedes {
  const extras: ExtrasHuespedes = JSON.parse(JSON.stringify(EXTRAS_POR_DEFECTO));
  if (!row) return extras;
  for (const tipo of Object.keys(extras) as TipoHuesped[]) {
    const valor = Number(row[`extra_${tipo}_valor`]);
    extras[tipo] = {
      tipo: row[`extra_${tipo}_tipo`] === "monto" ? "monto" : "porcentaje",
      valor: Number.isFinite(valor) && valor > 0 ? valor : 0,
    };
  }
  return extras;
}

export const CAPACIDAD_POR_DEFECTO: Capacidad = { maxHuespedes: 4, maxMascotas: 1 };

// Capacidad por cabaña (columnas max_huespedes / max_mascotas de precios_cabana).
export async function getCapacidades(): Promise<Record<"naciente" | "poniente", Capacidad>> {
  const res: Record<"naciente" | "poniente", Capacidad> = {
    naciente: { ...CAPACIDAD_POR_DEFECTO },
    poniente: { ...CAPACIDAD_POR_DEFECTO },
  };
  const { data } = await supabaseAdmin.from("precios_cabana").select("cabana_id, max_huespedes, max_mascotas");
  for (const row of data ?? []) {
    const id = row.cabana_id as string;
    if (id !== "naciente" && id !== "poniente") continue;
    if (Number.isInteger(row.max_huespedes) && row.max_huespedes > 0) res[id].maxHuespedes = row.max_huespedes;
    if (Number.isInteger(row.max_mascotas) && row.max_mascotas >= 0) res[id].maxMascotas = row.max_mascotas;
  }
  return res;
}

export async function calcularPrecio(fechaInicio: string, fechaFin: string, huespedes?: Huespedes): Promise<ResultadoPrecio> {
  return calcularPrecioConConfig(fechaInicio, fechaFin, await getConfigPrecios(), huespedes);
}

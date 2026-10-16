import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  calcularPrecioConConfig,
  EXTRAS_POR_DEFECTO,
  MIN_NOCHES_POR_DEFECTO,
  type Capacidad,
  type ConfigPrecios,
  type DescuentoNoches,
  validarDescuentos,
  type ExtrasHuespedes,
  type Huespedes,
  type ResultadoPrecio,
  type Tarifa,
  type TipoHuesped,
} from "@/lib/pricingCore";

export * from "@/lib/pricingCore";

// El precio base por noche (único para ambas cabañas) se edita solo desde /admin y se guarda en la
// tabla precios_cabana. No hay un precio de respaldo en el código: si no está configurado, getPrecioNoche
// devuelve null y las cotizaciones y reservas fallan con PrecioNoConfiguradoError.
export class PrecioNoConfiguradoError extends Error {
  constructor() {
    super("El precio por noche no está configurado. Defínelo en /admin.");
    this.name = "PrecioNoConfiguradoError";
  }
}

export async function getPrecioNoche(): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("precios_cabana")
    .select("precio_noche")
    .order("updated_at", { ascending: false })
    .limit(1);

  const precio = data?.[0]?.precio_noche;
  if (error || typeof precio !== "number" || precio <= 0) return null;
  return precio;
}

// Configuración de precios tal como está guardada: precioBase es null mientras no se defina en /admin.
export type ConfigPreciosGuardada = Omit<ConfigPrecios, "precioBase"> & { precioBase: number | null };

// Lee toda la configuración de precios. Si las tablas nuevas todavía no
// existen, se usan valores neutros (sin descuentos ni tarifas); el precio base nunca se inventa.
export async function getConfigPrecios(): Promise<ConfigPreciosGuardada> {
  const [precioBase, ajustes, tarifas] = await Promise.all([
    getPrecioNoche(),
    supabaseAdmin.from("ajustes_precios").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("tarifas_fecha").select("*").order("fecha_inicio", { ascending: true }),
  ]);

  const finSemana = ajustes.data?.precio_fin_semana;

  return {
    precioBase,
    descuentos: leerDescuentos(ajustes.data),
    precioFinSemana: typeof finSemana === "number" && finSemana > 0 ? finSemana : null,
    tarifas: (tarifas.data ?? []) as Tarifa[],
    extras: leerExtras(ajustes.data),
    minNoches: leerMinNoches(ajustes.data),
  };
}

// Reglas de descuento por noches (columna descuentos_noches de ajustes_precios, lista JSON). Lo inválido se ignora.
export function leerDescuentos(row: Record<string, unknown> | null | undefined): DescuentoNoches[] {
  const v = validarDescuentos(row?.descuentos_noches ?? []);
  return v.ok ? v.descuentos : [];
}

// Estadía mínima en noches (columna min_noches de ajustes_precios).
export function leerMinNoches(row: Record<string, unknown> | null | undefined): number {
  const n = Number(row?.min_noches);
  return Number.isInteger(n) && n >= 1 ? n : MIN_NOCHES_POR_DEFECTO;
}

export async function getMinNoches(): Promise<number> {
  const { data } = await supabaseAdmin.from("ajustes_precios").select("*").eq("id", 1).maybeSingle();
  return leerMinNoches(data);
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

export const CAPACIDAD_POR_DEFECTO: Capacidad = { maxHuespedes: 4, maxAdultos: 4, maxNinos: 3, maxBebes: 10, maxMascotas: 1 };

// Capacidad por cabaña (columnas max_huespedes, max_adultos, max_ninos, max_bebes y max_mascotas de precios_cabana).
export async function getCapacidades(): Promise<Record<"naciente" | "poniente", Capacidad>> {
  const res: Record<"naciente" | "poniente", Capacidad> = {
    naciente: { ...CAPACIDAD_POR_DEFECTO },
    poniente: { ...CAPACIDAD_POR_DEFECTO },
  };
  const { data } = await supabaseAdmin.from("precios_cabana").select("*");
  for (const row of data ?? []) {
    const id = row.cabana_id as string;
    if (id !== "naciente" && id !== "poniente") continue;
    if (Number.isInteger(row.max_huespedes) && row.max_huespedes > 0) res[id].maxHuespedes = row.max_huespedes;
    if (Number.isInteger(row.max_adultos) && row.max_adultos > 0) res[id].maxAdultos = row.max_adultos;
    if (Number.isInteger(row.max_ninos) && row.max_ninos >= 0) res[id].maxNinos = row.max_ninos;
    if (Number.isInteger(row.max_bebes) && row.max_bebes >= 0) res[id].maxBebes = row.max_bebes;
    if (Number.isInteger(row.max_mascotas) && row.max_mascotas >= 0) res[id].maxMascotas = row.max_mascotas;
  }
  return res;
}

export async function calcularPrecio(fechaInicio: string, fechaFin: string, huespedes?: Huespedes): Promise<ResultadoPrecio> {
  const { precioBase, ...resto } = await getConfigPrecios();
  if (precioBase === null) throw new PrecioNoConfiguradoError();
  return calcularPrecioConConfig(fechaInicio, fechaFin, { ...resto, precioBase }, huespedes);
}

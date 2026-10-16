// Lógica de precios pura (sin acceso a la base de datos): se usa en el servidor
// y también en el calendario del panel /admin.

export type Tarifa = {
  id: string;
  fecha_inicio: string;
  fecha_fin: string; // última noche incluida
  precio_noche: number;
  nombre: string | null;
  created_at?: string;
};

// Cobro extra por cada huésped o mascota adicional, por noche.
// El precio base de la noche corresponde a 1 adulto.
export type TipoExtra = "porcentaje" | "monto";
export type ExtraHuesped = { tipo: TipoExtra; valor: number };
export type TipoHuesped = "adulto" | "nino" | "bebe" | "mascota";
export type ExtrasHuespedes = Record<TipoHuesped, ExtraHuesped>;

export type Huespedes = { adultos: number; ninos: number; bebes: number; mascotas: number };

export const HUESPEDES_POR_DEFECTO: Huespedes = { adultos: 1, ninos: 0, bebes: 0, mascotas: 0 };

export const EXTRAS_POR_DEFECTO: ExtrasHuespedes = {
  adulto: { tipo: "porcentaje", valor: 0 },
  nino: { tipo: "porcentaje", valor: 0 },
  bebe: { tipo: "porcentaje", valor: 0 },
  mascota: { tipo: "porcentaje", valor: 0 },
};

// maxHuespedes = tope de adultos + niños juntos (los bebés no cuentan); además cada tipo tiene su propio tope.
export type Capacidad = { maxHuespedes: number; maxAdultos: number; maxNinos: number; maxBebes: number; maxMascotas: number };

// Regla de descuento: desde `noches` noches de estadía se aplica `pct` % sobre el total.
// Si varias reglas calzan, gana la de más noches.
export type DescuentoNoches = { noches: number; pct: number };

export type ConfigPrecios = {
  precioBase: number;
  descuentos: DescuentoNoches[];
  precioFinSemana: number | null;
  tarifas: Tarifa[];
  extras?: ExtrasHuespedes;
  minNoches?: number; // estadía mínima en noches
};

export type NochePrecio = {
  fecha: string;
  precio: number; // precio de la noche para 1 adulto
  extras?: number; // suma de adicionales de esa noche
  origen: "tarifa" | "fin_de_semana" | "base";
  tarifaNombre?: string | null;
};

export type ResultadoPrecio = {
  noches: number;
  subtotalNoches: number; // noches a precio de 1 adulto
  extrasTotal: number; // adicionales por persona y mascotas
  extrasDetalle: { tipo: TipoHuesped; cantidad: number; monto: number }[];
  huespedes: Huespedes;
  subtotal: number; // subtotalNoches + extrasTotal, antes del descuento
  descuentoPct: number;
  descuento: number;
  total: number;
  desglose: NochePrecio[];
};

// Valida y ordena las reglas de descuento. Devuelve un texto de error si alguna no es válida.
export function validarDescuentos(raw: unknown): { ok: true; descuentos: DescuentoNoches[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "Los descuentos deben ser una lista" };
  const descuentos: DescuentoNoches[] = [];
  for (const r of raw) {
    const noches = Number(r?.noches);
    const pct = Number(r?.pct);
    if (!Number.isInteger(noches) || noches < 1 || noches > 365) return { ok: false, error: "Las noches de cada descuento deben ser un entero entre 1 y 365" };
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return { ok: false, error: "Cada descuento debe ser mayor a 0 y menor a 100" };
    if (descuentos.some((d) => d.noches === noches)) return { ok: false, error: `Hay dos descuentos para ${noches} noches` };
    descuentos.push({ noches, pct });
  }
  return { ok: true, descuentos: descuentos.sort((a, b) => a.noches - b.noches) };
}

// Descuento (%) que corresponde a una estadía de `noches` noches: el de la regla con más noches que se cumpla.
export function descuentoParaNoches(noches: number, descuentos: DescuentoNoches[]): number {
  let pct = 0;
  let mejor = 0;
  for (const d of descuentos) {
    if (noches >= d.noches && d.noches >= mejor) {
      mejor = d.noches;
      pct = d.pct;
    }
  }
  return pct;
}

// Estadía mínima por defecto (sin restricción) si ajustes_precios no tiene la columna min_noches.
export const MIN_NOCHES_POR_DEFECTO = 1;

export const DAY_MS = 24 * 60 * 60 * 1000;

function parseISO(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function esFechaValida(fecha: unknown): fecha is string {
  return typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && toISO(parseISO(fecha)) === fecha;
}

// Precio de una noche según la regla: tarifa por fechas (la de rango más corto,
// y a igualdad la más reciente) > fin de semana (vie y sáb) > precio base.
export function precioDeNoche(fecha: string, config: ConfigPrecios): NochePrecio {
  const ms = parseISO(fecha);
  let mejor: Tarifa | null = null;
  let mejorLargo = Infinity;
  for (const t of config.tarifas) {
    if (fecha < t.fecha_inicio || fecha > t.fecha_fin) continue;
    const largo = (parseISO(t.fecha_fin) - parseISO(t.fecha_inicio)) / DAY_MS;
    if (largo < mejorLargo || (largo === mejorLargo && mejor && (t.created_at ?? "") > (mejor.created_at ?? ""))) {
      mejor = t;
      mejorLargo = largo;
    }
  }
  if (mejor) return { fecha, precio: mejor.precio_noche, origen: "tarifa", tarifaNombre: mejor.nombre };

  const dia = new Date(ms).getUTCDay(); // 5 = viernes, 6 = sábado
  if (config.precioFinSemana && (dia === 5 || dia === 6)) {
    return { fecha, precio: config.precioFinSemana, origen: "fin_de_semana" };
  }
  return { fecha, precio: config.precioBase, origen: "base" };
}

export function validarHuespedes(h: unknown, cap?: Capacidad): h is Huespedes {
  if (!h || typeof h !== "object") return false;
  const { adultos, ninos, bebes, mascotas } = h as Record<string, unknown>;
  const ok = (n: unknown, min: number): n is number => Number.isInteger(n) && (n as number) >= min && (n as number) <= 50;
  if (!ok(adultos, 1) || !ok(ninos, 0) || !ok(bebes, 0) || !ok(mascotas, 0)) return false;
  if (
    cap &&
    (adultos + ninos > cap.maxHuespedes || adultos > cap.maxAdultos || ninos > cap.maxNinos || bebes > cap.maxBebes || mascotas > cap.maxMascotas)
  ) {
    return false;
  }
  return true;
}

// Monto extra por noche de UN huésped/mascota adicional de ese tipo.
export function extraPorUnidad(extra: ExtraHuesped, precioNoche: number): number {
  return Math.round(extra.tipo === "porcentaje" ? (precioNoche * extra.valor) / 100 : extra.valor);
}

// Calcula el total de una estadía. fechaFin es el día de salida (no se cobra esa noche).
// El precio de la noche es el de 1 adulto; cada adulto adicional, niño, bebé y mascota
// suma su extra por noche (% del precio de esa noche o monto fijo). El descuento
// depende de las noches de la estadía y se aplica al final sobre todo el subtotal.
export function calcularPrecioConConfig(
  fechaInicio: string,
  fechaFin: string,
  config: ConfigPrecios,
  huespedes: Huespedes = HUESPEDES_POR_DEFECTO
): ResultadoPrecio {
  const extras = config.extras ?? EXTRAS_POR_DEFECTO;
  const cantidades: Record<TipoHuesped, number> = {
    adulto: Math.max(0, huespedes.adultos - 1),
    nino: huespedes.ninos,
    bebe: huespedes.bebes,
    mascota: huespedes.mascotas,
  };
  const acumulado: Record<TipoHuesped, number> = { adulto: 0, nino: 0, bebe: 0, mascota: 0 };

  const desglose: NochePrecio[] = [];
  for (let ms = parseISO(fechaInicio); ms < parseISO(fechaFin); ms += DAY_MS) {
    const noche = precioDeNoche(toISO(ms), config);
    let extrasNoche = 0;
    for (const tipo of Object.keys(cantidades) as TipoHuesped[]) {
      const monto = cantidades[tipo] * extraPorUnidad(extras[tipo], noche.precio);
      acumulado[tipo] += monto;
      extrasNoche += monto;
    }
    desglose.push({ ...noche, extras: extrasNoche });
  }

  const subtotalNoches = desglose.reduce((acc, n) => acc + n.precio, 0);
  const extrasTotal = desglose.reduce((acc, n) => acc + (n.extras ?? 0), 0);
  const subtotal = subtotalNoches + extrasTotal;
  const descuentoPct = descuentoParaNoches(desglose.length, config.descuentos);
  const total = Math.round(subtotal * (1 - descuentoPct / 100));
  return {
    noches: desglose.length,
    subtotalNoches,
    extrasTotal,
    extrasDetalle: (Object.keys(cantidades) as TipoHuesped[])
      .filter((tipo) => cantidades[tipo] > 0)
      .map((tipo) => ({ tipo, cantidad: cantidades[tipo], monto: acumulado[tipo] })),
    huespedes,
    subtotal,
    descuentoPct,
    descuento: subtotal - total,
    total,
    desglose,
  };
}

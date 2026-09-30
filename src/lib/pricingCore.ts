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

export type ConfigPrecios = {
  precioBase: number;
  descuentoPct: number;
  precioFinSemana: number | null;
  tarifas: Tarifa[];
};

export type NochePrecio = {
  fecha: string;
  precio: number;
  origen: "tarifa" | "fin_de_semana" | "base";
  tarifaNombre?: string | null;
};

export type ResultadoPrecio = {
  noches: number;
  subtotal: number;
  descuentoPct: number;
  descuento: number;
  total: number;
  desglose: NochePrecio[];
};

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

// Calcula el total de una estadía. fechaFin es el día de salida (no se cobra esa noche).
export function calcularPrecioConConfig(fechaInicio: string, fechaFin: string, config: ConfigPrecios): ResultadoPrecio {
  const desglose: NochePrecio[] = [];
  for (let ms = parseISO(fechaInicio); ms < parseISO(fechaFin); ms += DAY_MS) {
    desglose.push(precioDeNoche(toISO(ms), config));
  }
  const subtotal = desglose.reduce((acc, n) => acc + n.precio, 0);
  const total = Math.round(subtotal * (1 - config.descuentoPct / 100));
  return {
    noches: desglose.length,
    subtotal,
    descuentoPct: config.descuentoPct,
    descuento: subtotal - total,
    total,
    desglose,
  };
}

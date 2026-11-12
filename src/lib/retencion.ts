// Tiempo que una reserva sin pagar retiene sus fechas. Durante ese tiempo nadie más puede
// iniciar un pago por las mismas fechas, y Flow deja de aceptar el pago cuando se cumple
// (parámetro timeout de payment/create). Es un valor técnico, no un precio.
export const RETENCION_MINUTOS = 20;

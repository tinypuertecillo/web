import crypto from "crypto";

const FLOW_API_URL = process.env.FLOW_API_URL || "https://sandbox.flow.cl/api";

function sign(params: Record<string, string>) {
  const secretKey = process.env.FLOW_SECRET_KEY || "";
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

async function flowRequest(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const apiKey = process.env.FLOW_API_KEY;
  if (!apiKey) {
    throw new Error("FLOW_API_KEY no configurada");
  }
  const fullParams: Record<string, string> = { ...params, apiKey };
  const s = sign(fullParams);
  const body = new URLSearchParams({ ...fullParams, s });

  const url = method === "GET" ? `${FLOW_API_URL}${path}?${body.toString()}` : `${FLOW_API_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: method === "POST" ? body.toString() : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Error en la solicitud a Flow");
  }
  return data;
}

export async function createFlowPayment(opts: {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
}) {
  return flowRequest("/payment/create", {
    commerceOrder: opts.commerceOrder,
    subject: opts.subject,
    currency: "CLP",
    amount: String(Math.round(opts.amount)),
    email: opts.email,
    urlConfirmation: opts.urlConfirmation,
    urlReturn: opts.urlReturn,
    paymentMethod: "9",
  }, "POST");
}

export async function getFlowStatus(token: string) {
  return flowRequest("/payment/getStatus", { token }, "GET");
}

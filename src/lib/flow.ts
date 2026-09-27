import crypto from "crypto";

const FLOW_API_URL = (process.env.FLOW_API_URL || "https://sandbox.flow.cl/api").trim().replace(/\/+$/, "");

function sign(params: Record<string, string>) {
    const secretKey = (process.env.FLOW_SECRET_KEY || "").trim();
    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map((k) => `${k}${params[k]}`).join("");
    return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

async function flowRequest(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
    const apiKey = (process.env.FLOW_API_KEY || "").trim();
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

  const rawText = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
          data = rawText ? JSON.parse(rawText) : null;
    } catch {
          // Flow no devolvió JSON válido
    }

  if (!res.ok || (data && typeof data === "object" && "code" in data)) {
        console.error("[flow] respuesta de error", {
                url,
                status: res.status,
                apiKeyLength: apiKey.length,
                apiKeyPreview: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`,
                raw: rawText,
        });
        const message =
                (data && (data.message as string)) || rawText || "Error en la solicitud a Flow";
        throw new Error(message);
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

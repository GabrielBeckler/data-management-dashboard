const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type WhatsAppStatus = {
  connected: boolean;
  ready: boolean;
  status: string;
  qrCode?: string;
};

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const response = await fetch(`${API_BASE_URL}/whatsapp/status`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar o status do WhatsApp.");
  }

  return response.json();
}

export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  const response = await fetch(`${API_BASE_URL}/whatsapp/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível iniciar a conexão do WhatsApp.");
  }

  return response.json();
}

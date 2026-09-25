const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type DashboardSummary = {
  clients: number;
  appointments: number;
  upcomingAppointments: number;
  products: number | null;
  sales: number | null;
  recentClients: { id: string; nome: string; telefone: string; createdAt: string }[];
};

export async function login(username: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!response.ok) throw new Error(response.status === 401 ? "Usuário ou senha inválidos." : "Não foi possível entrar no sistema.");
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
}

export async function getSession(): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/auth/session`, { credentials: "include", cache: "no-store" });
  return response.ok;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar os dados do painel.");
  return response.json();
}

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

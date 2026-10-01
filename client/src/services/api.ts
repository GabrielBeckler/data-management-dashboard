const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type DashboardSummary = {
  clients: number;
  appointments: number;
  upcomingAppointments: number;
  products: number | null;
  sales: number | null;
  recentClients: { id: string; nome: string; telefone: string; createdAt: string }[];
};

export type WeeklyAppointments = {
  days: {
    date: string;
    count: number;
    appointments: { hour: string; title: string }[];
  }[];
};

export type ClientRecord = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string;
  endereco: string | null;
  atendimento: string | null;
  avaliacao: number | null;
  relatorioAvaliacao: string | null;
};

export async function getClients(): Promise<ClientRecord[]> {
  const response = await fetch(`${API_BASE_URL}/dashboard/clients`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar os clientes.");
  return response.json();
}

export type ClientInput = Pick<ClientRecord, "nome" | "telefone" | "email" | "endereco" | "avaliacao" | "relatorioAvaliacao">;

async function clientRequest(path: string, method: string, body?: ClientInput): Promise<ClientRecord | void> {
  const response = await fetch(`${API_BASE_URL}/dashboard/clients${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = payload?.message;
    throw new Error(Array.isArray(message) ? message.join(" ") : message || "Não foi possível salvar o cliente.");
  }
  if (response.status === 204) return;
  const responseBody = await response.json().catch(() => undefined) as ClientRecord | undefined;
  return responseBody;
}

export async function createClient(input: ClientInput): Promise<ClientRecord> {
  return (await clientRequest("", "POST", input)) as ClientRecord;
}

export async function updateClient(id: string, input: ClientInput): Promise<ClientRecord> {
  return (await clientRequest(`/${encodeURIComponent(id)}`, "PATCH", input)) as ClientRecord;
}

export async function deleteClient(id: string): Promise<void> {
  await clientRequest(`/${encodeURIComponent(id)}`, "DELETE");
}

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

export async function getWeeklyAppointments(): Promise<WeeklyAppointments> {
  const response = await fetch(`${API_BASE_URL}/dashboard/appointments/week`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Não foi possível carregar os agendamentos da semana no Google Agenda.");
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

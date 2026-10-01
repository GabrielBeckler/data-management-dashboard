"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Add, DeleteOutlined, EditOutlined, GroupsOutlined, SearchOutlined,
} from "@mui/icons-material";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import {
  createClient, deleteClient, getClients, updateClient,
  type ClientInput, type ClientRecord,
} from "@/services/api";

const emptyForm: ClientInput = {
  nome: "", email: "", telefone: "", endereco: "", avaliacao: null,
  relatorioAvaliacao: "",
};

function atendimentoLabel(status: string | null): string {
  if (!status) return "Sem atendimento";
  const value = status.toLowerCase();
  if (["concluido", "concluído", "feito", "completed"].includes(value)) return "Feito";
  if (["remarcado", "reagendado", "rescheduled"].includes(value)) return "Remarcado";
  if (["confirmado", "pendente", "em aguardo"].includes(value)) return "Em aguardo";
  return status;
}

function displayPhone(storedPhone: string): string {
  const digits = storedPhone.replace(/\D/g, "");
  const hasCountryCode = digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
  const national = hasCountryCode ? digits.slice(2) : digits;
  if (national.length === 11) return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  if (national.length === 10) return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  return storedPhone;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);

  async function refreshClients() {
    setLoading(true);
    try {
      setClients(await getClients());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshClients(); }, []);

  const filteredClients = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    if (!search) return clients;
    return clients.filter((client) => [
      client.nome, client.email, client.telefone, client.endereco,
      atendimentoLabel(client.atendimento), client.relatorioAvaliacao,
    ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(search)));
  }, [clients, query]);

  function openCreateDialog() {
    setEditingClient(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(client: ClientRecord) {
    setEditingClient(client);
    setForm({
      nome: client.nome,
      email: client.email ?? "",
      telefone: client.telefone,
      endereco: client.endereco ?? "",
      avaliacao: client.avaliacao,
      relatorioAvaliacao: client.relatorioAvaliacao ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const input: ClientInput = {
        ...form,
        email: form.email?.trim() || null,
        endereco: form.endereco?.trim() || null,
        relatorioAvaliacao: form.relatorioAvaliacao?.trim() || null,
      };
      if (editingClient) {
        const updated = await updateClient(editingClient.id, input);
        setClients((current) => current.map((client) => client.id === updated.id ? { ...client, ...updated } : client));
      } else {
        const created = await createClient(input);
        setClients((current) => [created, ...current]);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client: ClientRecord) {
    if (!window.confirm(`Excluir o cadastro de ${client.nome}?`)) return;
    setError("");
    try {
      await deleteClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o cliente.");
    }
  }

  function updateForm<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return <>
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em" }}>Clientes</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Cadastros, contatos e histórico de atendimento.</Typography>
        </Box>
        <Button onClick={openCreateDialog} variant="contained" startIcon={<Add />} sx={{ alignSelf: { xs: "flex-start", sm: "auto" }, borderRadius: 2, px: 2.25, py: 1.1, textTransform: "none", fontWeight: 700 }}>
          Novo cliente
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: "background.paper" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou endereço"
            aria-label="Buscar clientes"
            size="small"
            sx={{ width: { xs: "100%", sm: 440 }, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" color="action" /></InputAdornment> } }}
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
            <GroupsOutlined fontSize="small" />
            <Typography variant="body2">{filteredClients.length} de {clients.length} clientes</Typography>
          </Stack>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflowX: "auto" }}>
        <Table sx={{ minWidth: 1120 }}>
          <TableHead><TableRow sx={{ bgcolor: "action.hover" }}>
            {["Nome", "E-mail", "Telefone", "Endereço", "Atendimento", "Avaliação", "Relatório da avaliação", "Ações"].map((heading) => <TableCell key={heading} sx={{ fontWeight: 750, whiteSpace: "nowrap" }}>{heading}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 7 }}><CircularProgress size={26} /></TableCell></TableRow>
              : filteredClients.map((client) => {
                const atendimento = atendimentoLabel(client.atendimento);
                return <TableRow key={client.id} hover>
                  <TableCell sx={{ fontWeight: 650, minWidth: 150 }}>{client.nome}</TableCell>
                  <TableCell sx={{ minWidth: 190 }}>{client.email || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap", minWidth: 145 }}>{displayPhone(client.telefone)}</TableCell>
                  <TableCell sx={{ maxWidth: 220, whiteSpace: "normal" }}>{client.endereco || "—"}</TableCell>
                  <TableCell><Chip size="small" label={atendimento} color={atendimento === "Feito" ? "success" : atendimento === "Remarcado" ? "warning" : "default"} /></TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{client.avaliacao == null ? "—" : `${client.avaliacao}/5`}</TableCell>
                  <TableCell sx={{ minWidth: 220, whiteSpace: "normal" }}>{client.relatorioAvaliacao || "Aguardando avaliação da IA"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <IconButton aria-label={`Editar ${client.nome}`} color="primary" onClick={() => openEditDialog(client)} size="small"><EditOutlined fontSize="small" /></IconButton>
                    <IconButton aria-label={`Excluir ${client.nome}`} color="error" onClick={() => void handleDelete(client)} size="small"><DeleteOutlined fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>;
              })}
            {!loading && filteredClients.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 7 }}>
              <Typography sx={{ fontWeight: 700 }}>{clients.length ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{clients.length ? "Tente outro termo de busca." : "Cadastre o primeiro cliente para começar."}</Typography>
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>

    <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{editingClient ? "Editar cliente" : "Novo cliente"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Nome completo" required autoFocus value={form.nome} onChange={(event) => updateForm("nome", event.target.value)} slotProps={{ htmlInput: { maxLength: 150 } }} />
          <TextField label="E-mail" type="email" value={form.email ?? ""} onChange={(event) => updateForm("email", event.target.value)} slotProps={{ htmlInput: { maxLength: 150 } }} />
          <TextField label="Telefone / WhatsApp" required value={form.telefone} onChange={(event) => updateForm("telefone", event.target.value)} helperText="Inclua DDD. O sistema salva o número com código do Brasil." slotProps={{ htmlInput: { maxLength: 30 } }} />
          <TextField label="Endereço" value={form.endereco ?? ""} onChange={(event) => updateForm("endereco", event.target.value)} slotProps={{ htmlInput: { maxLength: 255 } }} />
          <TextField label="Avaliação (1 a 5)" type="number" value={form.avaliacao ?? ""} onChange={(event) => updateForm("avaliacao", event.target.value ? Number(event.target.value) : null)} slotProps={{ htmlInput: { min: 1, max: 5, step: 1 } }} />
          <TextField label="Relatório da avaliação" multiline minRows={3} value={form.relatorioAvaliacao ?? ""} onChange={(event) => updateForm("relatorioAvaliacao", event.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button onClick={() => void handleSave()} disabled={saving || !form.nome.trim() || form.telefone.replace(/\D/g, "").length < 8} variant="contained" sx={{ textTransform: "none", borderRadius: 1, minWidth: 130 }}>
          {saving ? <CircularProgress size={20} color="inherit" /> : editingClient ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}

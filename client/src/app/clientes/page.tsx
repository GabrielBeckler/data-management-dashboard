"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import DashboardLayout from "../dashboard/layout";
import { getClients, type ClientRecord } from "@/services/api";

function atendimentoLabel(status: string | null): string {
  if (!status) return "Sem atendimento";
  const value = status.toLowerCase();
  if (["concluido", "concluído", "feito", "completed"].includes(value)) return "Feito";
  if (["remarcado", "reagendado", "rescheduled"].includes(value)) return "Remarcado";
  if (["confirmado", "pendente", "em aguardo"].includes(value)) return "Em aguardo";
  return status;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getClients().then(setClients).catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar clientes."));
  }, []);

  return <DashboardLayout>
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Clientes</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5 }}>Cadastro vinculado ao identificador do cliente e ao telefone do WhatsApp.</Typography>
    </Box>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
      <Table sx={{ minWidth: 1120 }}>
        <TableHead><TableRow>
          {["Nome", "E-mail", "Telefone", "Endereço", "Atendimento", "Avaliação", "Relatório da avaliação"].map((heading) => <TableCell key={heading} sx={{ fontWeight: 800 }}>{heading}</TableCell>)}
        </TableRow></TableHead>
        <TableBody>
          {clients.map((client) => {
            const atendimento = atendimentoLabel(client.atendimento);
            return <TableRow key={client.id} hover>
              <TableCell>{client.nome}</TableCell>
              <TableCell>{client.email || "—"}</TableCell>
              <TableCell>{client.telefone}</TableCell>
              <TableCell sx={{ maxWidth: 220, whiteSpace: "normal" }}>{client.endereco || "—"}</TableCell>
              <TableCell><Chip size="small" label={atendimento} color={atendimento === "Feito" ? "success" : atendimento === "Remarcado" ? "warning" : "default"} /></TableCell>
              <TableCell>{client.avaliacao == null ? "—" : `${client.avaliacao}/5`}</TableCell>
              <TableCell sx={{ minWidth: 220, whiteSpace: "normal" }}>{client.relatorioAvaliacao || "Aguardando avaliação da IA"}</TableCell>
            </TableRow>;
          })}
          {clients.length === 0 && !error && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>Nenhum cliente cadastrado.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  </DashboardLayout>;
}

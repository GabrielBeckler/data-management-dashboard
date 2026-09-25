"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, CircularProgress, Grid, Typography } from "@mui/material";
import { DashboardSummary, getDashboardSummary } from "@/services/api";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null); const [error, setError] = useState("");
  useEffect(() => { getDashboardSummary().then(setData).catch((e: Error) => setError(e.message)); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}><CircularProgress /></Box>;
  const metrics = [["Clientes cadastrados", data.clients], ["Agendamentos", data.appointments], ["Próximos confirmados", data.upcomingAppointments]] as const;
  return <Box><Typography variant="h4" color="#142b49" sx={{ fontWeight: 800 }}>Dashboard</Typography><Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Resumo atualizado com dados do sistema.</Typography>
    <Grid container spacing={2}>{metrics.map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, lg: 4 }}><Card sx={{ borderRadius: 3 }}><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h3" sx={{ mt: 1, fontWeight: 800 }}>{value}</Typography></CardContent></Card></Grid>)}
      {[ ["Vendas", data.sales], ["Produtos em estoque", data.products] ].map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, lg: 4 }}><Card sx={{ borderRadius: 3 }}><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ mt: 2 }}>{value === null ? "Módulo ainda não disponível" : value}</Typography></CardContent></Card></Grid>)}
      <Grid size={{ xs: 12 }}><Card sx={{ borderRadius: 3 }}><CardContent><Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Clientes recentes</Typography>{data.recentClients.length ? data.recentClients.map((client) => <Box key={client.id} sx={{ display: "flex", justifyContent: "space-between", py: 1, borderBottom: "1px solid #edf0f5", gap: 2 }}><Typography>{client.nome}</Typography><Typography color="text.secondary">{client.telefone}</Typography></Box>) : <Typography color="text.secondary">Ainda não há clientes cadastrados.</Typography>}</CardContent></Card></Grid>
    </Grid>
  </Box>;
}

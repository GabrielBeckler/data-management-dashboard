"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, CircularProgress, Grid, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { DashboardSummary, getDashboardSummary, getWeeklyAppointments, WeeklyAppointments } from "@/services/api";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [weeklyAppointments, setWeeklyAppointments] = useState<WeeklyAppointments | null>(null);
  const [error, setError] = useState("");
  const [calendarError, setCalendarError] = useState("");

  useEffect(() => {
    getDashboardSummary().then(setData).catch((e: Error) => setError(e.message));
    getWeeklyAppointments().then(setWeeklyAppointments).catch((e: Error) => setCalendarError(e.message));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}><CircularProgress /></Box>;

  const metrics = [
    ["Clientes cadastrados", data.clients],
    ["Agendamentos", data.appointments],
    ["Próximos confirmados", data.upcomingAppointments],
  ] as const;
  const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const weekDays = weeklyAppointments?.days ?? [];
  const weekTotal = weekDays.reduce((total, day) => total + day.count, 0);

  return <Box>
    <Typography variant="h4" color="primary.dark">Dashboard</Typography>
    <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Resumo atualizado com dados do sistema.</Typography>

    <Grid container spacing={2}>
      {metrics.map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, lg: 4 }}>
        <Card sx={{ height: "100%" }}><CardContent>
          <Typography color="text.secondary">{label}</Typography>
          <Typography variant="h3" color="primary.dark" sx={{ mt: 1, fontWeight: 800 }}>{value}</Typography>
        </CardContent></Card>
      </Grid>)}

      {[["Vendas", data.sales], ["Produtos em estoque", data.products]].map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, lg: 4 }}>
        <Card sx={{ height: "100%" }}><CardContent>
          <Typography color="text.secondary">{label}</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>{value === null ? "Módulo ainda não disponível" : value}</Typography>
        </CardContent></Card>
      </Grid>)}

      <Grid size={{ xs: 12 }}>
        <Card sx={{ height: "100%" }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 1 }}>
            <Box>
              <Typography variant="h6">Agenda da semana</Typography>
              {weekDays.length === 7 && <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                {formatDate(weekDays[0].date, { dateStyle: "medium" })} a {formatDate(weekDays[6].date, { dateStyle: "medium" })}
              </Typography>}
            </Box>
            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800, lineHeight: 1 }}>{weeklyAppointments ? weekTotal : "—"}</Typography>
              <Typography variant="caption" color="text.secondary">compromissos</Typography>
            </Box>
          </Box>
          {calendarError ? <Alert severity="warning" sx={{ mt: 2 }}>{calendarError}</Alert> : !weeklyAppointments ?
            <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress size={28} /></Box> :
              <BarChart
                height={280}
                xAxis={[{ scaleType: "band", data: weekDays.map(({ date }) => formatDate(date, { weekday: "short" })), label: "Dia da semana" }]}
                series={[{ data: weekDays.map(({ count }) => count), label: "Compromissos", color: "#3F766B" }]}
                yAxis={[{ min: 0, tickMinStep: 1, label: "Quantidade" }]}
                grid={{ horizontal: true }}
                borderRadius={8}
                sx={{ "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "#DDE8E2" }, "& .MuiChartsGrid-line": { stroke: "#EAF0EC" } }}
              />}
          {weeklyAppointments && <>
            {weekTotal === 0 ? <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography color="text.secondary">Não há compromissos no Google Agenda nesta semana.</Typography>
            </Box> : <Grid container spacing={1.5} sx={{ mt: 1 }}>
              {weekDays.map((day) => <Grid key={day.date} size={{ xs: 12, sm: 6, md: 4, xl: 3 }}>
                <Box sx={{ height: "100%", p: 1.5, borderRadius: 2, bgcolor: "#F6F9F7", border: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ textTransform: "capitalize", fontWeight: 700 }}>{formatDate(day.date, { weekday: "long" })}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(day.date, { day: "2-digit", month: "2-digit" })}</Typography>
                  </Box>
                  {day.appointments.length ? day.appointments.map((appointment, index) => <Box key={`${day.date}-${appointment.hour}-${index}`} sx={{ display: "flex", alignItems: "flex-start", gap: 1, py: 0.8, borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography variant="caption" color="primary.dark" sx={{ fontWeight: 800, minWidth: 42, pt: 0.15 }}>{appointment.hour}</Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.35, overflowWrap: "anywhere" }}>{appointment.title}</Typography>
                  </Box>) : <Typography variant="caption" color="text.secondary">Sem agendamentos</Typography>}
                </Box>
              </Grid>)}
            </Grid>}
          </>}
        </CardContent></Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card sx={{ height: "100%" }}><CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Clientes recentes</Typography>
          {data.recentClients.length ? data.recentClients.map((client) => <Box key={client.id} sx={{ display: "flex", justifyContent: "space-between", py: 1.25, borderBottom: "1px solid", borderColor: "divider", gap: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>{client.nome}</Typography>
            <Typography color="text.secondary" variant="body2">{client.telefone}</Typography>
          </Box>) : <Typography color="text.secondary">Ainda não há clientes cadastrados.</Typography>}
        </CardContent></Card>
      </Grid>
    </Grid>
  </Box>;
}

"use client";

import { useEffect, useState } from "react";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { connectWhatsApp, getWhatsAppStatus, type WhatsAppStatus } from "@/services/api";

export default function WhatsAppQrPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      const nextStatus = await getWhatsAppStatus();
      setStatus(nextStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao consultar status do WhatsApp.");
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextStatus = await connectWhatsApp();
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar ao WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        p: 3,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 720, p: 4, borderRadius: 4, boxShadow: 6 }}>
        <Stack spacing={3} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            WhatsApp do atendimento
          </Typography>

          <Typography variant="body1" sx={{ color: "#475569" }}>
            {status?.status === "qr_available"
              ? "Escaneie o QR Code abaixo para autenticar o WhatsApp."
              : status?.status === "ready"
                ? "WhatsApp conectado e pronto para uso."
                : status?.status === "connecting"
                  ? "Conectando ao WhatsApp..."
                  : "Clique em conectar para gerar o QR Code de autenticação."}
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleConnect}
            disabled={loading}
            sx={{
              px: 5,
              py: 1.6,
              borderRadius: 3,
              fontWeight: 700,
              background: "linear-gradient(135deg, #0f172a, #2563eb)",
            }}
          >
            {loading ? "Conectando..." : "Conectar WhatsApp"}
          </Button>

          {error ? (
            <Typography color="error" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          ) : null}

          {status?.qrCode ? (
            <Box
              sx={{
                p: 2,
                background: "#ffffff",
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.4)",
                boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
              }}
            >
              <img
                src={`data:image/png;base64,${status.qrCode}`}
                alt="QR Code do WhatsApp"
                style={{ display: "block", width: 260, height: 260, margin: "0 auto" }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: 260,
                height: 260,
                borderRadius: 3,
                border: "1px dashed rgba(148,163,184,0.8)",
                display: "grid",
                placeItems: "center",
                color: "#64748b",
                background: "rgba(255,255,255,0.4)",
              }}
            >
              {status?.status === "ready" ? "Conectado" : "QR Code em espera"}
            </Box>
          )}

          <Button variant="text" onClick={void refreshStatus} sx={{ color: "#2563eb", fontWeight: 700 }}>
            Atualizar status
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}

"use client";

import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  EmailOutlined,
  LockOutlined,
  RemoveRedEyeOutlined,
  VisibilityOffOutlined,
} from "@mui/icons-material";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/api";

function GlassesToggle({ visible }: { visible: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        width: 64,
        height: 28,
        px: 0.5,
        borderRadius: 2,
        background: visible
          ? "linear-gradient(135deg, rgba(191,219,254,0.35), rgba(255,255,255,0.5))"
          : "linear-gradient(135deg, rgba(148,163,184,0.18), rgba(255,255,255,0.12))",
        border: "1px solid",
        borderColor: visible ? "rgba(59,130,246,0.55)" : "rgba(148,163,184,0.35)",
        boxShadow: visible
          ? "0 0 18px rgba(96,165,250,0.28)"
          : "inset 0 0 10px rgba(148,163,184,0.18)",
        transition: "all 0.3s ease",
      }}
    >
      <Box
        sx={{
          width: 20,
          height: 14,
          borderRadius: 3,
          border: "2px solid",
          borderColor: visible ? "#1d4ed8" : "#64748b",
          background: visible
            ? "linear-gradient(145deg, rgba(255,255,255,0.9), rgba(191,219,254,0.7))"
            : "rgba(148,163,184,0.2)",
          filter: visible ? "blur(0px)" : "blur(1.5px)",
          transition: "all 0.3s ease",
          boxShadow: visible ? "inset 0 0 8px rgba(96,165,250,0.35)" : "none",
        }}
      />
      <Box
        sx={{
          width: 20,
          height: 14,
          borderRadius: 3,
          border: "2px solid",
          borderColor: visible ? "#1d4ed8" : "#64748b",
          background: visible
            ? "linear-gradient(145deg, rgba(255,255,255,0.9), rgba(191,219,254,0.7))"
            : "rgba(148,163,184,0.2)",
          filter: visible ? "blur(0px)" : "blur(1.5px)",
          transition: "all 0.3s ease",
          boxShadow: visible ? "inset 0 0 8px rgba(96,165,250,0.35)" : "none",
        }}
      />
    </Box>
  );
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setLoading(true);
    try { await login(username, password); router.replace("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao autenticar."); }
    finally { setLoading(false); }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top left, rgba(96,165,250,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(15,118,110,0.22), transparent 30%), linear-gradient(135deg, #f8fbff 0%, #edf6ff 35%, #eef2ff 100%)",
        px: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 1100,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.1fr 1.4fr" },
          overflow: "hidden",
          borderRadius: 4,
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 22px 60px rgba(15, 23, 42, 0.12)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: { xs: 4, md: 6 },
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.92) 38%, rgba(14, 116, 144, 0.88) 100%)",
            color: "#f8fafc",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 18%), radial-gradient(circle at 80% 15%, rgba(125,211,252,0.18), transparent 22%), radial-gradient(circle at 75% 70%, rgba(255,255,255,0.12), transparent 28%)",
            }}
          />

          <Stack
            spacing={3}
            sx={{
              position: "relative",
              zIndex: 1,
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  display: "inline-flex",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  letterSpacing: 1.3,
                  fontWeight: 700,
                }}
              >
                Ótica VISION
              </Typography>

              <Typography
                variant="h3"
                sx={{
                  mt: 3,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: "-0.06em",
                }}
              >
                Controle visual.
                <br />
                Acesso preciso.
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: "rgba(15,23,42,0.26)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.72)", mb: 1.5 }}>
                ÁREA RESTRITA
              </Typography>

              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #f8fafc, #dbeafe)",
                    color: "#0f172a",
                    boxShadow: "0 12px 28px rgba(148,163,184,0.35)",
                  }}
                >
                  <LockOutlined sx={{ fontSize: 26 }} />
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Gestão de lideranças
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                    Acesso exclusivo para chefe e colaboradores autorizados.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 3, md: 5 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.45)",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 430 }}>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Typography variant="overline" sx={{ color: "#2563eb", fontWeight: 700 }}>Acesso</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
                Entrar no sistema
              </Typography>
              <Typography variant="body2" sx={{ color: "#475569" }}>
                Faça login com sua conta autorizada para acessar o painel administrativo.
              </Typography>
            </Stack>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
              <TextField
                label="Usuário"
                type="text"
                fullWidth
                placeholder="Digite seu usuário"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined sx={{ color: "#64748b" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: alpha("#ffffff", 0.7),
                    transition: "all 0.25s ease",
                    "&:hover": { boxShadow: "0 0 0 4px rgba(59,130,246,0.08)" },
                    "&.Mui-focused": {
                      boxShadow: "0 0 0 4px rgba(59,130,246,0.1)",
                    },
                  },
                }}
              />

              <TextField
                label="Senha"
                type={showPassword ? "text" : "password"}
                fullWidth
                placeholder="Digite sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ color: "#64748b" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          onClick={() => setShowPassword((value) => !value)}
                          edge="end"
                          sx={{
                            borderRadius: 2,
                            background: "rgba(148,163,184,0.08)",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              background: "rgba(59,130,246,0.12)",
                            },
                          }}
                        >
                          {showPassword ? (
                            <RemoveRedEyeOutlined sx={{ color: "#2563eb" }} />
                          ) : (
                            <VisibilityOffOutlined sx={{ color: "#64748b" }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: alpha("#ffffff", 0.7),
                    transition: "all 0.25s ease",
                    "&:hover": { boxShadow: "0 0 0 4px rgba(37,99,235,0.08)" },
                    "&.Mui-focused": {
                      boxShadow: "0 0 0 4px rgba(37,99,235,0.1)",
                    },
                  },
                }}
              />

              {error && <Typography role="alert" color="error">{error}</Typography>}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mt: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <GlassesToggle visible={showPassword} />
                  <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600 }}>
                    {showPassword ? "Senha visível" : "Senha oculta"}
                  </Typography>
                </Box>

                <Typography variant="caption" sx={{ color: "#64748b" }}>Acesso administrativo</Typography>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !username || !password}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 800,
                  fontSize: 15,
                  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 45%, #0ea5e9 100%)",
                  textTransform: "none",
                  boxShadow: "0 18px 40px rgba(37,99,235,0.32)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 20px 50px rgba(37,99,235,0.4)",
                  },
                }}
              >
                {loading ? "Entrando…" : "Entrar no painel"}
              </Button>
            </Box>

            <Divider sx={{ borderColor: "rgba(148,163,184,0.3)", mt: 3 }} />

            <Typography variant="caption" sx={{ color: "#64748b", textAlign: "center", display: "block" }}>
              Protegido por autenticação interna da empresa
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

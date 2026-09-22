"use client";

import {
  Box,
  Button,
  TextField,
  Typography,
} from "@mui/material";

export default function LoginForm() {
  return (
    <Box>
      <Typography variant="h4">
        Login
      </Typography>

      <TextField
        label="E-mail"
        type="email"
        fullWidth
      />

      <TextField
        label="Senha"
        type="password"
        fullWidth
      />

      <Button
        variant="contained"
        type="submit"
      >
        Entrar
      </Button>
    </Box>
  );
}
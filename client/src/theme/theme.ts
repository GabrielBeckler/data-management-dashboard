import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3F766B", light: "#6D9B8E", dark: "#28564E", contrastText: "#FFFFFF" },
    secondary: { main: "#C58D5A", light: "#E0B78B", dark: "#93643B", contrastText: "#FFFFFF" },
    background: { default: "#F4F7F5", paper: "#FFFFFF" },
    text: { primary: "#263B37", secondary: "#71817C" },
    divider: "#E3EBE7",
    success: { main: "#43866F" },
    error: { main: "#B94F4F" },
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    h4: { fontWeight: 750, letterSpacing: "-0.025em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 650 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCard: { styleOverrides: { root: { border: "1px solid #E6EEEA", boxShadow: "0 6px 24px rgba(43, 77, 66, 0.045)" } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiAppBar: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});

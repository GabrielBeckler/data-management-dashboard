"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppBar, Box, Button, Drawer, List, ListItemButton, ListItemText, Toolbar, Typography } from "@mui/material";
import { getSession, logout } from "@/services/api";

const links = [
  ["Dashboard", "/dashboard"], ["Clientes", "/clientes"], ["Produtos", "/produtos"],
  ["Estoque", "/estoque"], ["Vendas", "/vendas"], ["Consultas", "/consultas"],
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const [ready, setReady] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { getSession().then((valid) => { if (!valid) router.replace("/login"); else setReady(true); }).catch(() => router.replace("/login")); }, [router]);
  async function handleLogout() { await logout(); router.replace("/login"); }
  const nav = <List sx={{ width: 240, pt: 2 }}>{links.map(([label, href]) => <ListItemButton key={href} selected={pathname === href || pathname.startsWith(`${href}/`)} onClick={() => { router.push(href); setMobileOpen(false); }}><ListItemText primary={label} /></ListItemButton>)}</List>;
  if (!ready) return <Box sx={{ p: 4 }}>Verificando sessão…</Box>;
  return <Box sx={{ minHeight: "100vh", bgcolor: "#f3f6fb" }}>
    <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: "1px solid #e2e8f0", zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar><Button sx={{ display: { md: "none" }, mr: 1 }} onClick={() => setMobileOpen(true)}>Menu</Button><Typography variant="h6" color="#12325b" sx={{ flexGrow: 1, fontWeight: 800 }}>Ótica Vision</Typography><Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, mr: 2 }}>{links.filter(([, href]) => ["/dashboard", "/clientes", "/estoque", "/vendas"].includes(href)).map(([label, href]) => <Button key={href} onClick={() => router.push(href)}>{label}</Button>)}</Box><Button onClick={handleLogout}>Sair</Button></Toolbar>
    </AppBar>
    <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box", pt: 8 } }}>{nav}</Drawer>
    <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { xs: "block", md: "none" } }}>{nav}</Drawer>
    <Box component="main" sx={{ ml: { md: "240px" }, pt: 10, px: { xs: 2, md: 4 }, pb: 4 }}>{children}</Box>
  </Box>;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Consulta } from "./pages/Consulta";
import { Dashboards } from "./pages/Dashboards";
import { Alimentacao } from "./pages/Alimentacao";
import { Administracao } from "./pages/Administracao";
import { DetalheAssociada } from "./pages/DetalheAssociada";
import { Home } from "./pages/Home";
import { Sobre } from "./pages/Sobre";
import { Idealizadoras } from "./pages/Idealizadoras";
import { AdminCrud } from "./pages/AdminCrud";

function ProtectedRoute({ children, reqAdmin = false }: { children: ReactNode; reqAdmin?: boolean }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="p-10 text-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (reqAdmin && user.role !== "ADMIN") return <Navigate to="/" replace />;
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="sobre" element={<Sobre />} />
        <Route path="idealizadoras" element={<Idealizadoras />} />
        <Route path="consulta" element={<Consulta />} />
        <Route path="consulta/:id" element={<DetalheAssociada />} />
        <Route path="dashboards" element={<Dashboards />} />
        <Route path="alimentacao" element={<ProtectedRoute><Alimentacao /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute reqAdmin><Administracao /></ProtectedRoute>} />
        <Route path="admin/dados" element={<ProtectedRoute reqAdmin><AdminCrud /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}


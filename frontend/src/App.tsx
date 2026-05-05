import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import InicioPage from "./pages/InicioPage";
import RecepcionPage from "./pages/RecepcionPage";
import DistribucionPage from "./pages/DistribucionPage";
import InventarioPage from "./pages/InventarioPage";
import BajasPage from "./pages/BajasPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import PedidosPage from "./pages/PedidosPage";
import EscandallosPage from "./pages/EscandallosPage";
import RendimientoPage from "./pages/RendimientoPage";
import AvisosPage from "./pages/AvisosPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import AuditoriaPage from "./pages/AuditoriaPage";
import AdminApprovalPage from "./pages/AdminApprovalPage";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import Spinner from "./components/ui/Spinner";
import AppRealtimeSync from "./components/app/AppRealtimeSync";
import RouteErrorBoundary from "./components/app/RouteErrorBoundary";
import ConfirmDialogHost from "./components/ui/ConfirmDialogHost";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";
import ErrorPage from "./pages/ErrorPage";

const IngresarProductoPage = lazy(() => import("./pages/IngresarProductoPage"));
const CrearUsuarioPage = lazy(() => import("./pages/CrearUsuarioPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));

function AppRoutes() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <RouteErrorBoundary resetKey={routeKey}>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<CrearUsuarioPage />} />
          <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
          <Route path="/restablecer-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/inicio" replace />} />
            <Route path="inicio" element={<InicioPage />} />
            <Route path="solicitudes-aprobacion" element={<AdminApprovalPage />} />
            <Route path="recepcion" element={<RecepcionPage />} />
            <Route path="distribucion" element={<DistribucionPage />} />
            <Route path="inventario" element={<InventarioPage />} />
            <Route path="inventario/nuevo" element={<IngresarProductoPage />} />
            <Route path="bajas" element={<BajasPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route path="pedidos" element={<PedidosPage />} />
            <Route path="escandallos" element={<EscandallosPage />} />
            <Route path="rendimiento" element={<RendimientoPage />} />
            <Route path="avisos" element={<AvisosPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
            <Route path="auditoria" element={<AuditoriaPage />} />
          </Route>
          <Route path="/error-500" element={<ErrorPage code={500} />} />
          <Route path="*" element={<ErrorPage code={404} />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRealtimeSync />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <ConfirmDialogHost />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
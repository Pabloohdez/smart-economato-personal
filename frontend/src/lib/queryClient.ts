import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  alergenosCatalogo: ["alergenos", "catalogo"] as const,
  misAlergias: ["alergenos", "mine"] as const,
  productos: ["productos"] as const,
  lotesProducto: ["lotes", "producto"] as const,
  categorias: ["categorias"] as const,
  proveedores: ["proveedores"] as const,
  pedidos: ["pedidos"] as const,
  pedidosPendientes: ["pedidos", "pendientes"] as const,
  informesGastosMensuales: ["informes", "gastos-mensuales"] as const,
  rendimientosHistorial: ["rendimientos", "historial"] as const,
  escandallos: ["escandallos"] as const,
};
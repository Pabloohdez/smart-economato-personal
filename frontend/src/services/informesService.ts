import { apiFetch } from "./apiClient";

export type GastoMensual = {
  mes: string;
  nombre_usuario: string;
  num_pedidos: number;
  total_mes: number | string;
};

export async function getGastosMensuales(): Promise<GastoMensual[]> {
  const data = await apiFetch<{ success: boolean; data?: { gastos_por_mes?: GastoMensual[] } }>(
    "/informes?tipo=gastos_mensuales",
  );

  if (!data.success || !data.data?.gastos_por_mes) {
    return [];
  }

  return data.data.gastos_por_mes;
}
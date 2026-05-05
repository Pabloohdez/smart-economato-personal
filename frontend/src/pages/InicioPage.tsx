import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";

type CardWithData = {
  title: string;
  desc: string;
  to: string;
  icon: any;
  dataKey?: "inventario" | "pedidos" | "avisos" | "rendimiento";
  quickKpi?: string;
};
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  Boxes,
  ChefHat,
  CircleAlert,
  ClipboardList,
  PackagePlus,
  PieChart,
  Truck,
  Users,
  ArrowRight,
} from "lucide-react";

import { apiFetch } from "../services/apiClient";

const rendimientoTrendPath = "M2 20 L14 18 L26 17 L38 18 L50 16 L62 15 L74 14";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

function unwrapApiData<T extends object>(payload: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!payload) return null;
  if (typeof payload === "object" && "data" in payload) {
    return ((payload as ApiEnvelope<T>).data ?? null) as T | null;
  }
  return payload as T;
}

const cards: CardWithData[] = [
  { title: "Recepción", desc: "Registrar entradas de mercancía", to: "/recepcion", icon: PackagePlus },
  { title: "Distribución", desc: "Salidas a almacenes o áreas", to: "/distribucion", icon: Truck },
  { title: "Inventario", desc: "Consultar stock y buscar artículos", to: "/inventario", icon: Boxes, dataKey: "inventario" },
  { title: "Bajas", desc: "Roturas, caducados y ajustes", to: "/bajas", icon: CircleAlert },
  { title: "Proveedores", desc: "Altas, contacto y listas", to: "/proveedores", icon: Users },
  { title: "Pedidos", desc: "Crear, revisar y recibir", to: "/pedidos", icon: ClipboardList, dataKey: "pedidos" },
  { title: "Escandallos", desc: "Recetas y costes", to: "/escandallos", icon: ChefHat },
  {
    title: "Rendimiento",
    desc: "Mermas y aprovechamiento",
    to: "/rendimiento",
    icon: PieChart,
    quickKpi: "-2% mermas esta semana",
    dataKey: "rendimiento",
  },
  { title: "Avisos", desc: "Alertas de stock, caducidad y gastos", to: "/avisos", icon: BellRing, dataKey: "avisos" },
];

export default function InicioPage() {
  type WidgetDataType = {
    inventario: number;
    pedidos: number;
    avisos: number;
    rendimiento: number;
  };

  const nav = useNavigate();
  const [widgetData, setWidgetData] = useState<WidgetDataType>({
    inventario: 0,
    pedidos: 0,
    avisos: 0,
    rendimiento: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWidgetData() {
      try {
        setLoading(true);

        // Fetch Inventario stock bajo count
        const invRes = await apiFetch<ApiEnvelope<{ count: number }> | { count: number }>("/productos/stock-bajo-count").catch(() => ({ count: 0 }));

        // Fetch Pedidos pending today
        const pedRes = await apiFetch<ApiEnvelope<{ count: number }> | { count: number }>("/pedidos/pending-today-count").catch(() => ({ count: 0 }));

        // Fetch Avisos alerts count
        const aviRes = await apiFetch<ApiEnvelope<{ count: number }> | { count: number }>("/productos/avisos/alerts-count").catch(() => ({ count: 0 }));

        // Fetch Rendimiento percentage (or use default)
        const rendRes = await apiFetch<ApiEnvelope<{ percentage: number }> | { percentage: number }>("/bajas/weekly-percentage").catch(() => ({ percentage: 0 }));

        const invData = unwrapApiData<{ count: number }>(invRes);
        const pedData = unwrapApiData<{ count: number }>(pedRes);
        const aviData = unwrapApiData<{ count: number }>(aviRes);
        const rendData = unwrapApiData<{ percentage: number }>(rendRes);

        setWidgetData({
          inventario: invData?.count ?? 0,
          pedidos: pedData?.count ?? 0,
          avisos: aviData?.count ?? 0,
          rendimiento: rendData?.percentage ?? 0,
        });
      } catch (error) {
        console.error("Error fetching widget data:", error);
        // Set default fallback values
        setWidgetData({
          inventario: 12,
          pedidos: 2,
          avisos: 4,
          rendimiento: -2,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchWidgetData();
  }, []);

  function getWidgetContent(card: CardWithData) {
    if (!card.dataKey) return null;

    const data = widgetData[card.dataKey];

    switch (card.dataKey) {
      case "inventario":
        return (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1.5 text-[12px] font-semibold text-orange-700 max-[520px]:hidden">
            <span className="text-[16px] font-bold">{loading ? "—" : data}</span>
            <span>artículos en stock bajo</span>
          </div>
        );
      case "pedidos":
        return (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-blue-700 max-[520px]:hidden">
            <span className="text-[16px] font-bold">{loading ? "—" : data}</span>
            <span>pedidos pendientes</span>
          </div>
        );
      case "avisos":
        return (
          <div className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold max-[520px]:hidden ${
            data > 0 ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700"
          }`}>
            <span className="text-[16px] font-bold">{loading ? "—" : data}</span>
            <span>{data > 0 ? "alertas" : "sin alertas"}</span>
          </div>
        );
      case "rendimiento":
        return (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700 max-[520px]:hidden">
            <svg viewBox="0 0 76 22" className="h-[18px] w-[58px]" aria-hidden="true">
              <path d={rendimientoTrendPath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{loading ? "—" : `${data}% mermas esta semana`}</span>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <StaggerPage className="inicio-page w-full h-full min-h-0 flex flex-col p-5 pt-4 max-[820px]:p-4 max-[820px]:pt-3 max-[520px]:p-3 max-[520px]:pt-2">
      <StaggerItem className="flex flex-1 min-h-0">
        <div className="w-full flex-1 min-h-0 flex">
          <div className="inicio-page__grid grid w-full flex-1 h-full min-h-0 min-w-0 grid-cols-3 grid-rows-3 gap-5 max-[900px]:grid-cols-2 max-[900px]:grid-rows-5 max-[820px]:gap-4 max-[820px]:h-auto max-[820px]:flex-none max-[520px]:grid-cols-2 max-[520px]:gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.to}
                className="inicio-page__card group flex h-full w-full flex-col rounded-[24px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-6 py-6 text-left shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-[3px] hover:border-[rgba(179,49,49,0.16)] hover:shadow-[var(--shadow-lg)] max-[820px]:px-5 max-[820px]:py-5 max-[640px]:px-4 max-[640px]:py-4 max-[520px]:rounded-[20px] max-[520px]:px-3.5 max-[520px]:py-3.5"
                type="button"
                onClick={() => nav(c.to)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      Sección
                    </div>
                    <h3 className="m-0 mt-2 text-[22px] font-extrabold tracking-[-0.03em] text-[var(--color-text-strong)] max-[820px]:text-[20px] max-[640px]:text-[18px] max-[520px]:text-[15px]">
                      {c.title}
                    </h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[rgba(179,49,49,0.14)] bg-[rgba(179,49,49,0.08)] text-[var(--color-brand-500)] transition-transform duration-300 group-hover:scale-110 max-[640px]:h-11 max-[640px]:w-11 max-[520px]:h-9 max-[520px]:w-9 max-[520px]:rounded-[14px]">
                    <Icon className="h-5 w-5 max-[520px]:h-4 max-[520px]:w-4" />
                  </div>
                </div>

                <p className="inicio-page__desc m-0 mt-4 text-[14px] leading-[1.65] font-medium text-[var(--color-text-muted)] max-[640px]:mt-3 max-[520px]:hidden">
                  {c.desc}
                </p>

                {getWidgetContent(c)}

                <div className="inicio-page__cta mt-6 inline-flex items-center gap-2 text-[13px] font-extrabold text-[var(--color-brand-600)] max-[640px]:mt-4 max-[520px]:mt-3 max-[520px]:text-[12px]">
                  <span className="max-[520px]:hidden">Abrir {c.title}</span>
                  <span className="hidden max-[520px]:inline">Abrir</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 max-[520px]:h-3.5 max-[520px]:w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </StaggerItem>
    </StaggerPage>
  );
}



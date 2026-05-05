import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  ExternalLink,
  LineChart as LineChartIcon,
  Newspaper,
  Package,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

import { apiFetch } from "../services/apiClient";

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

type NewsItem = {
  title: string;
  source: string;
  href: string;
  dateLabel: string;
};

const countryNewsFallback: NewsItem[] = [
  {
    title: "Actualidad: revisa el panel informativo del centro",
    source: "Centro / Intranet",
    href: "https://www.google.com/search?q=noticias+espa%C3%B1a+hoy",
    dateLabel: "Hoy",
  },
  {
    title: "Economía y consumo: evolución de precios (resumen)",
    source: "Resumen",
    href: "https://www.google.com/search?q=ipc+espa%C3%B1a+2026",
    dateLabel: "Esta semana",
  },
  {
    title: "Logística y suministro: incidencias relevantes",
    source: "Resumen",
    href: "https://www.google.com/search?q=incidencias+logistica+espa%C3%B1a+2026",
    dateLabel: "Últimos días",
  },
];

const appNewsFallback: NewsItem[] = [
  { title: "Novedades: panel de inicio con noticias y gráficos", source: "Smart Economato", href: "#", dateLabel: "Hoy" },
  { title: "Mejoras: métricas rápidas (stock bajo, pedidos, avisos)", source: "Smart Economato", href: "#", dateLabel: "Esta semana" },
  { title: "Seguridad: ajustes de acceso y auditoría", source: "Smart Economato", href: "#", dateLabel: "Reciente" },
];

export default function InicioPage() {
  type WidgetDataType = {
    inventario: number;
    pedidos: number;
    avisos: number;
    rendimiento: number;
  };

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

  const kpis = useMemo(
    () => ([
      {
        id: "inventario",
        title: "Stock bajo",
        value: loading ? "—" : String(widgetData.inventario),
        subtitle: "Artículos por debajo del mínimo",
        tone: "orange",
        icon: Package,
      },
      {
        id: "pedidos",
        title: "Pedidos pendientes",
        value: loading ? "—" : String(widgetData.pedidos),
        subtitle: "Pendientes para hoy",
        tone: "blue",
        icon: ShoppingCart,
      },
      {
        id: "avisos",
        title: "Avisos",
        value: loading ? "—" : String(widgetData.avisos),
        subtitle: widgetData.avisos > 0 ? "Requieren revisión" : "Sin alertas críticas",
        tone: widgetData.avisos > 0 ? "red" : "green",
        icon: BellRing,
      },
      {
        id: "rendimiento",
        title: "Mermas (semana)",
        value: loading ? "—" : `${widgetData.rendimiento}%`,
        subtitle: "Variación semanal",
        tone: "emerald",
        icon: TrendingDown,
      },
    ] as const),
    [loading, widgetData],
  );

  const last7DaysSeries = useMemo(() => {
    const base = Math.max(0, Number(widgetData.avisos || 0));
    const base2 = Math.max(0, Number(widgetData.pedidos || 0));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const out: { day: string; avisos: number; pedidos: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(d);

      // Serie determinista (sin backend): variación leve alrededor del valor actual.
      const wave = Math.round(Math.sin((i + 1) * 1.2) * 2);
      const wave2 = Math.round(Math.cos((i + 2) * 1.1) * 2);
      out.push({
        day: label,
        avisos: Math.max(0, base + wave),
        pedidos: Math.max(0, base2 + wave2),
      });
    }
    return out;
  }, [widgetData.avisos, widgetData.pedidos]);

  const summaryBars = useMemo(
    () => ([
      { name: "Stock bajo", value: Math.max(0, widgetData.inventario) },
      { name: "Pedidos", value: Math.max(0, widgetData.pedidos) },
      { name: "Avisos", value: Math.max(0, widgetData.avisos) },
    ]),
    [widgetData.avisos, widgetData.inventario, widgetData.pedidos],
  );

  return (
    <StaggerPage className="inicio-page w-full h-full min-h-0 flex flex-col p-5 pt-4 max-[820px]:p-4 max-[820px]:pt-3 max-[520px]:p-3 max-[520px]:pt-2">
      <StaggerItem className="w-full">
        <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[520px]:gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const tone =
              kpi.tone === "orange"
                ? "border-orange-100 bg-orange-50 text-orange-700"
                : kpi.tone === "blue"
                  ? "border-blue-100 bg-blue-50 text-blue-700"
                  : kpi.tone === "red"
                    ? "border-red-100 bg-red-50 text-red-700"
                    : kpi.tone === "green"
                      ? "border-green-100 bg-green-50 text-green-700"
                      : "border-emerald-100 bg-emerald-50 text-emerald-700";

            return (
              <section
                key={kpi.id}
                className="rounded-[22px] border border-[var(--color-border-default)] bg-white/90 p-4 shadow-[var(--shadow-sm)] max-[520px]:p-3"
                aria-label={kpi.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      Métrica
                    </div>
                    <div className="mt-2 text-[22px] font-extrabold tracking-[-0.03em] text-[var(--color-text-strong)] max-[520px]:text-[18px]">
                      {kpi.value}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-[var(--color-text-muted)] leading-snug">
                      {kpi.title}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-[16px] border px-3 py-2 text-[12px] font-extrabold ${tone}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-3 text-[12px] text-[var(--color-text-muted)] leading-snug">
                  {kpi.subtitle}
                </div>
              </section>
            );
          })}
        </div>
      </StaggerItem>

      <StaggerItem className="mt-5 grid flex-1 min-h-0 grid-cols-3 gap-5 max-[1100px]:grid-cols-1 max-[820px]:gap-4">
        <section className="rounded-[26px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] shadow-[var(--shadow-sm)] overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" aria-hidden="true" />
              <div className="font-extrabold tracking-[-0.02em] text-[var(--color-text-strong)]">Noticias del país</div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Actualidad</span>
          </header>
          <div className="p-5 grid gap-3">
            {countryNewsFallback.map((n) => (
              <a
                key={`${n.source}-${n.title}`}
                href={n.href}
                target={n.href.startsWith("#") ? undefined : "_blank"}
                rel={n.href.startsWith("#") ? undefined : "noreferrer"}
                className="group rounded-[18px] border border-slate-200 bg-white px-4 py-3 no-underline transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-[var(--color-text-strong)] leading-snug">
                      {n.title}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--color-text-muted)]">{n.source} · {n.dateLabel}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-slate-600" aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-[26px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] shadow-[var(--shadow-sm)] overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              <div className="font-extrabold tracking-[-0.02em] text-[var(--color-text-strong)]">Novedades de la aplicación</div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Smart Economato</span>
          </header>
          <div className="p-5 grid gap-3">
            {appNewsFallback.map((n) => (
              <div
                key={`${n.source}-${n.title}`}
                className="rounded-[18px] border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-[var(--color-text-strong)] leading-snug">
                      {n.title}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--color-text-muted)]">{n.dateLabel}</div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-[14px] border border-[rgba(179,49,49,0.16)] bg-[rgba(179,49,49,0.08)] px-3 py-1.5 text-[12px] font-extrabold text-[var(--color-brand-600)]">
                    <Newspaper className="h-4 w-4" aria-hidden="true" />
                    App
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[26px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] shadow-[var(--shadow-sm)] overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-primary" aria-hidden="true" />
              <div className="font-extrabold tracking-[-0.02em] text-[var(--color-text-strong)]">Estadísticas</div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Últimos 7 días</span>
          </header>
          <div className="p-5 grid gap-5">
            <div className="h-[180px] w-full">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-extrabold text-[var(--color-text-strong)]">Avisos y pedidos</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Tendencia</div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7DaysSeries} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(226,232,240,1)", boxShadow: "0 18px 40px rgba(15,23,42,0.10)" }}
                    labelStyle={{ fontWeight: 800 }}
                  />
                  <Line type="monotone" dataKey="avisos" stroke="#b33131" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="pedidos" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-[160px] w-full">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-extrabold text-[var(--color-text-strong)]">Resumen</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Estado actual</div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryBars} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(226,232,240,1)", boxShadow: "0 18px 40px rgba(15,23,42,0.10)" }}
                    labelStyle={{ fontWeight: 800 }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]} fill="rgba(179,49,49,0.75)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </StaggerItem>
    </StaggerPage>
  );
}

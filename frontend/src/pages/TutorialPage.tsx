import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Boxes,
  PackagePlus,
  Truck,
  BellRing,
  HandCoins,
  Building2,
  ChefHat,
  ChartPie,
  ShieldCheck,
  Search,
} from "lucide-react";

type TutorialSection = {
  id: string;
  title: string;
  desc: string;
  icon: any;
  to?: string;
  steps: string[];
  tips?: string[];
};

function normalizeRole(roleRaw: string): "administrador" | "profesor" | "alumno" | "usuario" {
  const role = String(roleRaw ?? "").trim().toLowerCase();
  if (role === "admin" || role === "administrador") return "administrador";
  if (role === "teacher" || role === "profesor") return "profesor";
  if (role === "student" || role === "alumno") return "alumno";
  if (role === "user" || role === "usuario") return "usuario";
  return "usuario";
}

export default function TutorialPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const normalizedRole = normalizeRole(String(user?.role ?? user?.rol ?? "usuario"));

  const [query, setQuery] = useState("");

  const sections = useMemo<TutorialSection[]>(
    () => [
      {
        id: "primeros-pasos",
        title: "Primeros pasos",
        desc: "Cómo moverte por el panel y entender el flujo general.",
        icon: BookOpen,
        steps: [
          "Usa el menú lateral para cambiar de módulo (Inventario, Pedidos, etc.).",
          "Revisa el panel de Inicio: métricas, caducidades y actividad reciente.",
          "Si estás en móvil, abre el menú con el botón superior izquierdo.",
        ],
        tips: [
          "Si algo no carga, comprueba tu conexión (arriba verás la última actualización).",
          "Evita usar el navegador “atrás” para flujos de alta/edición; usa los botones del módulo.",
        ],
      },
      {
        id: "recepcion",
        title: "Recepción",
        desc: "Registrar entradas de mercancía y actualizar stock.",
        icon: PackagePlus,
        to: "/recepcion",
        steps: [
          "Entra en Recepción y busca el producto o crea uno si falta.",
          "Indica cantidades y verifica proveedor/categoría.",
          "Guarda para que el stock quede actualizado y aparezca en Inventario.",
        ],
        tips: ["Registra la fecha de caducidad cuando aplique: mejora los avisos y el control."],
      },
      {
        id: "distribucion",
        title: "Distribución",
        desc: "Registrar salidas a aulas/áreas y mantener trazabilidad.",
        icon: Truck,
        to: "/distribucion",
        steps: [
          "Selecciona el producto y la cantidad que sale.",
          "Asigna destino/observaciones para trazabilidad.",
          "Confirma para descontar stock y generar movimiento.",
        ],
      },
      {
        id: "inventario",
        title: "Inventario",
        desc: "Consultar stock, buscar artículos y editar fichas.",
        icon: Boxes,
        to: "/inventario",
        steps: [
          "Usa el buscador y filtros para encontrar productos rápido.",
          "Revisa stock mínimo y caducidad (se reflejan en avisos).",
          "Edita solo lo necesario: nombre, marca, unidad y proveedor/categoría.",
        ],
        tips: ["Mantén el stock mínimo actualizado para que el panel detecte faltantes de forma fiable."],
      },
      {
        id: "pedidos",
        title: "Pedidos",
        desc: "Crear pedidos y controlar pendientes.",
        icon: ClipboardList,
        to: "/pedidos",
        steps: [
          "Selecciona proveedor y añade líneas (producto + cantidad + precio).",
          "Guarda el pedido para que quede registrado.",
          "Revisa ‘pendientes’ para priorizar recepciones del día.",
        ],
      },
      {
        id: "proveedores",
        title: "Proveedores",
        desc: "Altas y mantenimiento de proveedores.",
        icon: Building2,
        to: "/proveedores",
        steps: [
          "Crea o edita proveedores (nombre y contacto).",
          "Asocia productos a proveedores para mejorar pedidos y estadísticas.",
        ],
      },
      {
        id: "bajas",
        title: "Bajas",
        desc: "Registrar roturas, caducidades o ajustes de stock.",
        icon: HandCoins,
        to: "/bajas",
        steps: [
          "Selecciona el producto y la cantidad a dar de baja.",
          "Elige tipo y motivo (para informes y auditoría).",
          "Guarda: se descuenta stock y queda el registro.",
        ],
      },
      {
        id: "escandallos",
        title: "Escandallos",
        desc: "Recetas y cálculo de costes.",
        icon: ChefHat,
        to: "/escandallos",
        steps: [
          "Crea una receta y añade ingredientes con cantidades.",
          "Revisa el coste total y el coste por ración.",
          "Ajusta cantidades para optimizar rendimiento.",
        ],
      },
      {
        id: "rendimiento",
        title: "Rendimiento",
        desc: "Mermas y aprovechamiento.",
        icon: ChartPie,
        to: "/rendimiento",
        steps: [
          "Registra peso bruto / neto y desperdicio.",
          "Consulta tendencias para detectar mejoras en procesos.",
        ],
      },
      {
        id: "avisos",
        title: "Avisos",
        desc: "Alertas de stock y caducidad.",
        icon: BellRing,
        to: "/avisos",
        steps: [
          "Revisa avisos críticos primero (stock bajo, caducidades próximas).",
          "Resuelve corrigiendo stock mínimo, reponiendo o registrando baja.",
        ],
      },
      {
        id: "seguridad",
        title: "Seguridad y buenas prácticas",
        desc: "Accesos por rol y trazabilidad.",
        icon: ShieldCheck,
        steps: [
          "No compartas cuentas ni contraseñas.",
          "Cierra sesión al terminar (especialmente en equipos compartidos).",
          "Revisa auditoría si detectas cambios inesperados.",
        ],
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => `${s.title} ${s.desc} ${s.steps.join(" ")} ${(s.tips ?? []).join(" ")}`.toLowerCase().includes(q));
  }, [query, sections]);

  const roleHint = useMemo(() => {
    if (normalizedRole === "administrador") {
      return "Como administrador puedes gestionar altas, cambios y revisar auditoría.";
    }
    if (normalizedRole === "profesor") {
      return "Como profesor puedes operar módulos y revisar solicitudes según permisos.";
    }
    if (normalizedRole === "alumno") {
      return "Como alumno céntrate en consulta y operaciones permitidas por tu perfil.";
    }
    return "Acceso limitado: consulta con un responsable si necesitas permisos.";
  }, [normalizedRole]);

  return (
    <StaggerPage className="w-full min-h-0 flex flex-col gap-5">
      <StaggerItem className="rounded-[26px] border border-[var(--color-border-default)] bg-white/90 p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Guía de uso
            </div>
            <h1 className="m-0 mt-2 text-[26px] font-extrabold tracking-[-0.03em] text-[var(--color-text-strong)]">
              Tutorial de Smart Economato
            </h1>
            <p className="m-0 mt-2 max-w-[70ch] text-[13px] font-semibold leading-relaxed text-[var(--color-text-muted)]">
              {roleHint}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => nav("/inicio")}
            >
              Volver a Inicio <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el tutorial (ej. inventario, pedidos, caducidad...)"
              className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] pl-11 pr-4 text-[14px] font-semibold text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
            />
          </div>

          <div className="text-[12px] text-[var(--color-text-muted)]">
            Consejo: si estás empezando, abre <strong>“Primeros pasos”</strong> y luego sigue con Recepción → Inventario → Pedidos.
          </div>
        </div>
      </StaggerItem>

      <StaggerItem className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        {filtered.map((section) => {
          const Icon = section.icon;
          return (
            <details
              key={section.id}
              className="group rounded-[26px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] shadow-[var(--shadow-sm)]"
            >
              <summary className="list-none cursor-pointer select-none px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[rgba(179,49,49,0.14)] bg-[rgba(179,49,49,0.08)] text-[var(--color-brand-500)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[16px] font-extrabold tracking-[-0.02em] text-[var(--color-text-strong)]">
                          {section.title}
                        </div>
                        <div className="mt-0.5 text-[12px] font-semibold text-[var(--color-text-muted)]">
                          {section.desc}
                        </div>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-600">
                    Abrir
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
                  </span>
                </div>
              </summary>

              <div className="border-t border-[var(--color-border-default)] px-6 py-5">
                <div className="grid gap-3">
                  {section.steps.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                      <div className="text-[13px] font-semibold leading-relaxed text-[var(--color-text-strong)]">{s}</div>
                    </div>
                  ))}
                </div>

                {section.tips?.length ? (
                  <div className="mt-4 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Tips</div>
                    <ul className="mt-2 grid gap-1.5 pl-5 text-[13px] font-semibold text-emerald-900">
                      {section.tips.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {section.to ? (
                    <Link
                      to={section.to}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(179,49,49,0.16)] bg-[rgba(179,49,49,0.08)] px-4 py-2.5 text-[13px] font-extrabold text-[var(--color-brand-600)] transition hover:bg-[rgba(179,49,49,0.12)]"
                    >
                      Ir a {section.title} <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : null}

                  <Link
                    to="/inicio"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Volver al panel <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </details>
          );
        })}
      </StaggerItem>

      <StaggerItem className="rounded-[22px] border border-[var(--color-border-default)] bg-white/90 p-5 text-[13px] font-semibold text-[var(--color-text-muted)] shadow-[var(--shadow-sm)]">
        Si necesitas un tutorial “con pasos guiados” dentro de cada pantalla (tipo onboarding con flechas),
        puedo añadirlo como un asistente contextual que se active la primera vez que entras a un módulo.
      </StaggerItem>
    </StaggerPage>
  );
}


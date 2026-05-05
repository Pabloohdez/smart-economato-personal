import { NavLink, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BellRing,
  BookOpen,
  CalendarDays,
  ChartPie,
  ChefHat,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Boxes,
  Building2,
  HandCoins,
  House,
  LogOut,
  Menu,
  PackagePlus,
  Truck,
  UserCircle2,
  LayoutDashboard,
  Cog,
  CheckCircle2,
} from "lucide-react";
import RouteErrorBoundary from "../components/app/RouteErrorBoundary";
import PageTransition from "../components/ui/PageTransition";
import GuidedTour, { type GuidedTourStep } from "../components/ui/GuidedTour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { queryKeys } from "../lib/queryClient";
import { logout as logoutSession } from "../services/authService";
import { getProductos } from "../services/productosService";

const navItems = [
  { to: "/inicio", label: "Inicio", icon: House, roles: ["administrador", "profesor", "alumno"] },
  { to: "/recepcion", label: "Recepción", icon: PackagePlus, roles: ["administrador", "profesor", "alumno"] },
  { to: "/distribucion", label: "Distribución", icon: Truck, roles: ["administrador", "profesor", "alumno"] },
  { to: "/inventario", label: "Inventario", icon: Boxes, roles: ["administrador", "profesor", "alumno"] },
  { to: "/bajas", label: "Bajas", icon: HandCoins, roles: ["administrador", "profesor", "alumno"] },
  { to: "/proveedores", label: "Proveedores", icon: Building2, roles: ["administrador", "profesor", "alumno"] },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList, roles: ["administrador", "profesor", "alumno"] },
  { to: "/escandallos", label: "Escandallos", icon: ChefHat, roles: ["administrador", "profesor", "alumno"] },
  { to: "/rendimiento", label: "Rendimiento", icon: ChartPie, roles: ["administrador", "profesor", "alumno"] },
  { to: "/avisos", label: "Avisos", icon: BellRing, roles: ["administrador", "profesor", "alumno"] },
  {
    to: "/solicitudes-aprobacion",
    label: "Solicitudes",
    icon: CheckCircle2,
    separated: true,
    roles: ["administrador", "profesor"],
  },
  {
    to: "/configuracion",
    label: "Configuración",
    icon: Cog,
    separated: true,
    roles: ["administrador", "profesor", "alumno"],
  },
  { to: "/auditoria", label: "Auditoría", icon: ClipboardList, roles: ["administrador", "profesor"] },
];

function normalizeRole(roleRaw: string): "administrador" | "profesor" | "alumno" | "usuario" {
  const role = roleRaw.trim().toLowerCase();
  if (role === "admin" || role === "administrador") return "administrador";
  if (role === "teacher" || role === "profesor") return "profesor";
  if (role === "student" || role === "alumno") return "alumno";
  if (role === "user" || role === "usuario") return "usuario";
  return "usuario";
}

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const isInicio = location.pathname === "/inicio";
  const transitionKey = location.pathname;
  const { user } = useAuth();
  const userName = String(user?.nombre ?? "Administrador");
  const userEmail = String(user?.email ?? "").trim();
  const userRole = String(user?.role ?? user?.rol ?? "usuario").trim();
  const normalizedRole = normalizeRole(userRole);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const productosQuery = useQuery({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    refetchInterval: 60_000,
  });

  const avisosCount = useMemo(() => {
    const productos: any[] = Array.isArray(productosQuery.data) ? productosQuery.data : [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let caducados = 0;
    let stockBajo = 0;

    for (const p of productos) {
      const stock = Number(p.stock ?? 0);
      const stockMin = Number(p.stockMinimo ?? p.stockminimo ?? 0);
      const fechaRaw = p.fechaCaducidad ?? p.fechacaducidad ?? null;

      if (stockMin > 0 && stock <= stockMin) {
        stockBajo += 1;
      }

      if (stock > 0 && fechaRaw && fechaRaw !== "NULL" && fechaRaw !== "Sin fecha") {
        const fecha = new Date(String(fechaRaw));
        if (!Number.isNaN(fecha.getTime()) && fecha < hoy) {
          caducados += 1;
        }
      }
    }

    return caducados + stockBajo;
  }, [productosQuery.data]);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(normalizedRole)),
    [normalizedRole],
  );

  const primaryNavItems = useMemo(
    () => visibleNavItems.filter((item) => !item.separated && item.to !== "/auditoria"),
    [visibleNavItems],
  );

  const secondaryNavItems = useMemo(
    () => visibleNavItems.filter((item) => item.separated || item.to === "/auditoria"),
    [visibleNavItems],
  );

  const currentSection = useMemo(() => {
    const path = location.pathname;
    return (
      visibleNavItems.find((item) => path === item.to || path.startsWith(`${item.to}/`)) ??
      visibleNavItems.find((item) => item.to === "/inicio") ??
      null
    );
  }, [location.pathname, visibleNavItems]);

  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date()),
    [],
  );

  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";

  const tourSteps: GuidedTourStep[] = useMemo(() => {
    const base: GuidedTourStep[] = [
      {
        id: "menu",
        selector: "#app-sidebar",
        title: "Menú lateral",
        body: "Desde aquí cambias de módulo (Inventario, Pedidos, Recepción…). En móvil se abre con el botón de arriba.",
        placement: "right",
      },
      {
        id: "contenido",
        selector: "#main-content",
        title: "Área de trabajo",
        body: "Aquí aparece el contenido del módulo actual. Si hay tablas o filtros, siempre estarán dentro de esta zona.",
        placement: "top",
      },
      {
        id: "perfil",
        selector: "#app-sidebar [aria-label=\"Menú de perfil\"]",
        title: "Perfil y sesión",
        body: "Aquí puedes ver tu rol y cerrar sesión cuando termines.",
        placement: "right",
      },
    ];

    const commonHelp: GuidedTourStep = {
      id: "tutorial-btn",
      selector: '[data-tour="tutorial-button"]',
      title: "Tutorial guiado",
      body: "Pulsa aquí cuando quieras ver una guía paso a paso de la pantalla actual (funciones, botones y flujo recomendado).",
      placement: "left",
    };

    if (location.pathname === "/inicio") {
      return [
        ...base,
        commonHelp,
        {
          id: "kpis",
          selector: '[data-tour="inicio-kpis"]',
          title: "Métricas rápidas",
          body: "Resumen del estado general: stock bajo, pedidos pendientes, avisos y mermas.",
          placement: "bottom",
        },
        {
          id: "noticias",
          selector: '[data-tour="inicio-noticias"]',
          title: "Noticias del país",
          body: "Panel de actualidad. Podemos conectarlo a una fuente real (RSS/API) si lo necesitas.",
          placement: "right",
        },
        {
          id: "novedades",
          selector: '[data-tour="inicio-novedades"]',
          title: "Novedades de la aplicación",
          body: "Cambios, recordatorios y estado de conexión/sincronización.",
          placement: "right",
        },
        {
          id: "estadisticas",
          selector: '[data-tour="inicio-estadisticas"]',
          title: "Estadísticas y detalle",
          body: "Gráficos y listas útiles (stock bajo, caducidades, auditoría) para actuar rápido.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/recepcion") {
      return [
        ...base,
        commonHelp,
        {
          id: "recep-header",
          selector: '[data-tour="recepcion-header"]',
          title: "Objetivo de Recepción",
          body: "En esta pantalla registras entradas de mercancía y el stock se actualiza automáticamente.",
          placement: "bottom",
        },
        {
          id: "recep-bascula",
          selector: '[data-tour="recepcion-bascula"]',
          title: "Báscula (opcional)",
          body: "Conecta la báscula para capturar kilos y validar recepciones por peso. Si no la usas, puedes trabajar manualmente.",
          placement: "bottom",
        },
        {
          id: "recep-kg",
          selector: '[data-tour="recepcion-kg-esperados"]',
          title: "Kg esperados",
          body: "Si indicas un peso esperado, al confirmar se validará contra la lectura actual (tolerancia).",
          placement: "bottom",
        },
        {
          id: "recep-buscar",
          selector: '[data-tour="recepcion-buscar"]',
          title: "Buscar producto",
          body: "Escribe para buscar por nombre o código. Al pulsar Enter se abrirá el modal de cantidad para añadirlo a la recepción.",
          placement: "bottom",
        },
        {
          id: "recep-filtros",
          selector: '[data-tour="recepcion-filtro-proveedor"]',
          title: "Filtros",
          body: "Filtra por proveedor o categoría para encontrar productos más rápido.",
          placement: "bottom",
        },
        {
          id: "recep-importar",
          selector: '[data-tour="recepcion-importar-pedido"]',
          title: "Importar/Recibir pedido",
          body: "Abre el panel de pedidos pendientes para verificar cantidades, lotes y añadir lo recibido a la recepción.",
          placement: "bottom",
        },
        {
          id: "recep-tabla",
          selector: '[data-tour="recepcion-tabla"]',
          title: "Recepción actual",
          body: "Aquí ves lo que has añadido: stock actual, cantidad recibida y el nuevo stock. También puedes eliminar líneas.",
          placement: "top",
        },
        {
          id: "recep-notas",
          selector: '[data-tour="recepcion-observaciones"]',
          title: "Observaciones y acciones",
          body: "Añade notas y finalmente confirma para guardar la entrada de stock. También puedes cancelar para vaciar la recepción.",
          placement: "top",
        },
        {
          id: "recep-confirmar",
          selector: '[data-tour="recepcion-confirmar"]',
          title: "Confirmar recepción",
          body: "Guarda la entrada: se crean movimientos de stock y el inventario queda actualizado.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/distribucion") {
      return [
        ...base,
        commonHelp,
        {
          id: "dist-header",
          selector: '[data-tour="distribucion-header"]',
          title: "Distribución / salida de stock",
          body: "Aquí registras salidas de productos hacia cocina, bar u otros destinos. El stock baja automáticamente.",
          placement: "bottom",
        },
        {
          id: "dist-bascula",
          selector: '[data-tour="distribucion-bascula"]',
          title: "Báscula (opcional)",
          body: "Si trabajas por peso (kg/l), puedes conectar la báscula para capturar cantidades con precisión.",
          placement: "bottom",
        },
        {
          id: "dist-buscar",
          selector: '[data-tour="distribucion-buscar"]',
          title: "Buscar y seleccionar producto",
          body: "Busca por nombre o código. Al seleccionar un producto podrás ajustar la cantidad y añadirlo a la lista de salida.",
          placement: "bottom",
        },
        {
          id: "dist-carrito",
          selector: '[data-tour="distribucion-carrito"]',
          title: "Lista de salida",
          body: "Este panel es tu “carrito”. Revisa lo que va a salir, elimina líneas si hace falta y define el destino/motivo.",
          placement: "top",
        },
        {
          id: "dist-confirmar",
          selector: '[data-tour="distribucion-confirmar"]',
          title: "Confirmar salida",
          body: "Guarda la salida: se registran movimientos y el inventario se actualiza.",
          placement: "top",
        },
        {
          id: "dist-historial",
          selector: '[data-tour="distribucion-historial"]',
          title: "Historial",
          body: "Consulta salidas anteriores para auditar qué se retiró, cuándo y a qué destino.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/inventario") {
      return [
        ...base,
        commonHelp,
        {
          id: "inv-header",
          selector: '[data-tour="inventario-header"]',
          title: "Inventario",
          body: "Vista principal para consultar existencias, precios, proveedor/categoría y caducidades.",
          placement: "bottom",
        },
        {
          id: "inv-toolbar",
          selector: '[data-tour="inventario-toolbar"]',
          title: "Filtros y acciones",
          body: "Busca por texto, filtra por categoría/proveedor, activa avisos (stock bajo / caducidad) y exporta el inventario.",
          placement: "bottom",
        },
        {
          id: "inv-tabla",
          selector: '[data-tour="inventario-table"]',
          title: "Tabla de productos",
          body: "Aquí ves el listado filtrado. Revisa stock y caducidad para tomar decisiones rápidas.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/pedidos") {
      return [
        ...base,
        commonHelp,
        {
          id: "ped-header",
          selector: '[data-tour="pedidos-header"]',
          title: "Pedidos y compras",
          body: "Gestiona el historial de pedidos y crea nuevos pedidos agrupados por proveedor.",
          placement: "bottom",
        },
        {
          id: "ped-kpis",
          selector: '[data-tour="pedidos-kpis"]',
          title: "Resumen",
          body: "Indicadores rápidos de pedidos pendientes/incompletos e importe histórico.",
          placement: "bottom",
        },
        {
          id: "ped-historial",
          selector: '[data-tour="pedidos-historial"]',
          title: "Historial",
          body: "Filtra por estado, exporta/importa y entra en recepcionar cuando toque.",
          placement: "top",
        },
        {
          id: "ped-nuevo",
          selector: '[data-tour="pedidos-nuevo"]',
          title: "Crear pedido",
          body: "Crea un pedido nuevo: selecciona proveedor, busca productos, añade items y confirma.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/proveedores") {
      return [
        ...base,
        commonHelp,
        {
          id: "prov-header",
          selector: '[data-tour="proveedores-header"]',
          title: "Proveedores",
          body: "Directorio operativo de proveedores: contactos, teléfonos y correos.",
          placement: "bottom",
        },
        {
          id: "prov-toolbar",
          selector: '[data-tour="proveedores-toolbar"]',
          title: "Buscar, filtrar e importar/exportar",
          body: "Usa la búsqueda y el filtro de estado. También puedes exportar o importar proveedores desde Excel.",
          placement: "bottom",
        },
        {
          id: "prov-nuevo",
          selector: '[data-tour="proveedores-nuevo"]',
          title: "Nuevo proveedor",
          body: "Crea un proveedor nuevo (si tu rol lo permite).",
          placement: "left",
        },
        {
          id: "prov-tabla",
          selector: '[data-tour="proveedores-table"]',
          title: "Listado",
          body: "Consulta, edita o elimina proveedores según permisos.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/bajas") {
      return [
        ...base,
        commonHelp,
        {
          id: "bajas-header",
          selector: '[data-tour="bajas-header"]',
          title: "Bajas",
          body: "Registra roturas, caducados, mermas o ajustes. Esto descuenta stock y deja trazabilidad.",
          placement: "bottom",
        },
        {
          id: "bajas-stats",
          selector: '[data-tour="bajas-stats"]',
          title: "Resumen del mes",
          body: "Indicadores del mes: roturas, caducados, mermas y valor perdido total.",
          placement: "bottom",
        },
        {
          id: "bajas-registro",
          selector: '[data-tour="bajas-registro"]',
          title: "Registrar nueva baja",
          body: "Busca un producto y selecciónalo para indicar tipo y cantidad. Puedes filtrar por categoría o ver próximos a caducar.",
          placement: "top",
        },
        {
          id: "bajas-actual",
          selector: '[data-tour="bajas-actual"]',
          title: "Registro actual",
          body: "Aquí se agrupan los productos que vas a dar de baja antes de confirmar. Revisa pérdidas y elimina líneas si hace falta.",
          placement: "top",
        },
        {
          id: "bajas-acciones",
          selector: '[data-tour="bajas-acciones"]',
          title: "Motivo y confirmar",
          body: "Añade un motivo (recomendado) y confirma para aplicar la baja en stock.",
          placement: "top",
        },
        {
          id: "bajas-historial",
          selector: '[data-tour="bajas-historial"]',
          title: "Historial",
          body: "Consulta bajas registradas y filtra por fecha/tipo para auditoría.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/avisos") {
      return [
        ...base,
        commonHelp,
        {
          id: "avisos-header",
          selector: '[data-tour="avisos-header"]',
          title: "Centro de avisos",
          body: "Resumen de alertas del sistema (caducados, stock bajo y riesgo económico).",
          placement: "bottom",
        },
        {
          id: "avisos-kpis",
          selector: '[data-tour="avisos-kpis"]',
          title: "Indicadores",
          body: "Mide rápidamente cuántas alertas hay y el valor estimado en riesgo.",
          placement: "bottom",
        },
        {
          id: "avisos-caducados",
          selector: '[data-tour="avisos-caducados"]',
          title: "Lotes caducados",
          body: "Registra la baja del lote directamente desde aquí para que el aviso desaparezca y quede trazado.",
          placement: "top",
        },
        {
          id: "avisos-stock",
          selector: '[data-tour="avisos-stockbajo"]',
          title: "Stock bajo",
          body: "Crea un pedido sugerido al proveedor para reponer el stock mínimo.",
          placement: "top",
        },
        {
          id: "avisos-fin",
          selector: '[data-tour="avisos-financiero"]',
          title: "Resumen financiero",
          body: "Cuantifica pérdidas por caducidad y riesgo por stock bajo.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/rendimiento") {
      return [
        ...base,
        commonHelp,
        {
          id: "rend-header",
          selector: '[data-tour="rendimiento-header"]',
          title: "Rendimiento",
          body: "Analiza mermas y rendimiento real de ingredientes (bruto vs neto).",
          placement: "bottom",
        },
        {
          id: "rend-kpis",
          selector: '[data-tour="rendimiento-kpis"]',
          title: "Indicadores",
          body: "Vista rápida de rendimiento medio, merma media y desperdicio total.",
          placement: "bottom",
        },
        {
          id: "rend-busqueda",
          selector: '[data-tour="rendimiento-busqueda"]',
          title: "Buscar ingrediente y nuevo análisis",
          body: "Busca en el maestro de productos y crea un nuevo análisis para registrar pesos.",
          placement: "bottom",
        },
        {
          id: "rend-actual",
          selector: '[data-tour="rendimiento-actual"]',
          title: "Registro actual",
          body: "Tabla con los registros actuales antes de guardar. Puedes eliminar filas y revisar totales.",
          placement: "top",
        },
        {
          id: "rend-guardar",
          selector: '[data-tour="rendimiento-acciones"]',
          title: "Observaciones y guardar",
          body: "Añade observaciones y guarda el análisis. Si no hay conexión, se encola y se sincroniza después.",
          placement: "top",
        },
        {
          id: "rend-historial",
          selector: '[data-tour="rendimiento-historial"]',
          title: "Historial",
          body: "Consulta análisis anteriores y elimina entradas si procede.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/escandallos") {
      return [
        ...base,
        commonHelp,
        {
          id: "esc-header",
          selector: '[data-tour="escandallos-header"]',
          title: "Escandallos y recetas",
          body: "Crea y consulta recetas con ingredientes para calcular coste, PVP y margen.",
          placement: "bottom",
        },
        {
          id: "esc-toolbar",
          selector: '[data-tour="escandallos-toolbar"]',
          title: "Búsquedas y nueva receta",
          body: "Filtra por nombre o ingrediente. Usa “Nueva receta” para crear una ficha completa.",
          placement: "bottom",
        },
        {
          id: "esc-tabla",
          selector: '[data-tour="escandallos-table"]',
          title: "Listado",
          body: "Consulta recetas, abre detalle, edita o elimina.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/configuracion") {
      return [
        ...base,
        commonHelp,
        {
          id: "conf-header",
          selector: '[data-tour="configuracion-header"]',
          title: "Configuración",
          body: "Gestiona tu perfil, alergias y preferencias de notificaciones/seguridad.",
          placement: "bottom",
        },
        {
          id: "conf-tabs",
          selector: '[data-tour="configuracion-tabs"]',
          title: "Secciones",
          body: "Cambia entre Perfil, Alergias y Notificaciones. Cada sección se guarda por separado.",
          placement: "bottom",
        },
        {
          id: "conf-body",
          selector: '[data-tour="configuracion-body"]',
          title: "Contenido de la sección",
          body: "Edita campos y pulsa Guardar. Algunas opciones activan alertas y bloqueos por seguridad alimentaria.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/auditoria") {
      return [
        ...base,
        commonHelp,
        {
          id: "aud-header",
          selector: '[data-tour="auditoria-header"]',
          title: "Auditoría",
          body: "Historial de acciones: movimientos, pedidos, bajas y cambios de productos.",
          placement: "bottom",
        },
        {
          id: "aud-filtros",
          selector: '[data-tour="auditoria-filtros"]',
          title: "Filtros",
          body: "Filtra por tipo de acción, usuario y rango de fechas. Pulsa Aplicar para recargar.",
          placement: "bottom",
        },
        {
          id: "aud-tabla",
          selector: '[data-tour="auditoria-tabla"]',
          title: "Listado y detalle",
          body: "Explora registros visibles y abre el detalle para ver datos de la operación.",
          placement: "top",
        },
      ];
    }

    if (location.pathname === "/solicitudes-aprobacion") {
      return [
        ...base,
        commonHelp,
        {
          id: "sol-header",
          selector: '[data-tour="solicitudes-header"]',
          title: "Solicitudes",
          body: "Pantalla de administración para aprobar altas de cuenta y aplicar/rechazar cambios de contraseña.",
          placement: "bottom",
        },
        {
          id: "sol-altas",
          selector: '[data-tour="solicitudes-altas"]',
          title: "Altas de cuenta",
          body: "Revisa datos del usuario, asigna rol y aprueba o rechaza la solicitud.",
          placement: "top",
        },
        {
          id: "sol-pass",
          selector: '[data-tour="solicitudes-password"]',
          title: "Cambios de contraseña",
          body: "Define la nueva contraseña (mínimo 8 caracteres) y aplica o rechaza el cambio.",
          placement: "top",
        },
      ];
    }

    return base;
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const update = () => setIsSmallViewport(!!mq.matches);
    update();

    // Safari/iOS antiguos no soportan addEventListener en MediaQueryList
    const anyMq = mq as any;
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    if (typeof anyMq.addListener === "function") {
      anyMq.addListener(update);
      return () => anyMq.removeListener(update);
    }
    return;
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-mobile-open", sidebarOpen);
    return () => {
      document.body.classList.remove("sidebar-mobile-open");
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    // Solo ocultar overflow en viewport movil cuando sidebar esta abierto
    const isMobileViewport = window.innerWidth <= 820;
    // En Inicio:
    // - móvil: permitir scroll (el body puede scrollear si el main no captura bien en iOS)
    // - escritorio: mantenerlo estático
    const shouldHideScroll =
      (isMobileViewport && sidebarOpen) || (isInicio && !isMobileViewport);

    if (shouldHideScroll) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isInicio, sidebarOpen]);

  function logout() {
    logoutSession();
    nav("/login", { replace: true });
  }

  function renderNavSection(items: typeof visibleNavItems, title: string) {
    if (items.length === 0) return null;

    return (
      <div className="rounded-[24px] border border-[var(--color-border-default)] bg-white/85 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {title}
        </div>
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                [
                  "group flex min-h-[46px] items-center gap-3 rounded-[18px] px-3.5 py-2.5 no-underline text-[14px] font-medium transition-[background,color,box-shadow] duration-150",
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(179,49,49,0.12)_0%,rgba(179,49,49,0.05)_100%)] text-primary shadow-[inset_0_0_0_1px_rgba(179,49,49,0.12)]"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")
              }
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[14px] border ${isActive ? "border-primary/10 bg-primary/10 text-primary" : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-700"}`}>
                    <it.icon className="h-[17px] w-[17px] flex-shrink-0" aria-hidden="true" />
                  </span>
                  <span className="tracking-[-0.01em]">{it.label}</span>
                  <span className="ml-auto inline-flex w-4 items-center justify-center" aria-hidden="true">
                    {isActive ? (
                      <motion.span
                        layoutId="active-arrow"
                        className="inline-flex items-center justify-center text-[13px] text-primary"
                        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
                      >
                        <ChevronRight className="h-[14px] w-[14px]" />
                      </motion.span>
                    ) : null}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full min-w-0 overflow-x-hidden bg-[var(--color-bg-canvas)] text-[var(--color-text-strong)] font-[var(--font-family-base)] relative">
      <GuidedTour open={tourOpen} steps={tourSteps} onClose={() => setTourOpen(false)} />
      <div
        className={`fixed inset-0 bg-[rgba(15,23,42,0.45)] z-[90] transition-opacity duration-300 ${sidebarOpen ? "opacity-100 block" : "opacity-0 hidden"}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        className={`grid [grid-template-rows:auto_1fr_auto] gap-4 fixed top-0 left-0 bottom-0 w-[294px] h-[100dvh] overflow-hidden z-[100] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] border-r border-[#d1d9e6] shadow-[6px_0_32px_rgba(15,23,42,0.07),2px_0_8px_rgba(15,23,42,0.04)] p-[18px_14px_14px] text-[var(--color-text-strong)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] max-[820px]:w-[300px] ${sidebarOpen ? "max-[820px]:translate-x-0 max-[820px]:shadow-[10px_0_40px_rgba(0,0,0,0.14)]" : "max-[820px]:-translate-x-full"} max-[820px]:shadow-none max-[520px]:w-[252px] max-[520px]:p-[14px_12px_12px]`}
        aria-label="Navegacion principal"
      >
        <div className="flex items-center gap-3 rounded-[24px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <NavLink
            to="/inicio"
            className="inline-flex items-center gap-3 flex-1 min-w-0 no-underline"
            aria-label="Ir a Inicio"
          >
            <img
              src="/favicon.png"
              alt="CIFP Virgen de la Candelaria"
              className="block h-[50px] w-[50px] rounded-full border border-slate-200 bg-white object-contain p-1 shadow-[0_8px_18px_rgba(15,23,42,0.08)] max-[520px]:h-[44px] max-[520px]:w-[44px]"
            />

            <span className="flex flex-col min-w-0">
              <strong className="text-[var(--color-text-strong)] font-extrabold leading-tight text-[18px] tracking-[-0.02em] whitespace-normal max-[520px]:text-[15px]">
                Smart Economato
              </strong>
            </span>
          </NavLink>
        </div>

        <nav className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" aria-label="Secciones del sistema">
          {renderNavSection(primaryNavItems, "Principal")}
          {renderNavSection(secondaryNavItems, "Gestión")}
        </nav>

        <div className="border-t border-[var(--color-border-default)] pt-3">
          <button
            type="button"
            className="mb-2 inline-flex w-full min-h-[46px] items-center justify-center gap-2 rounded-[14px] border border-[var(--color-border-default)] bg-white px-3 text-[13px] font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() => setTourOpen(true)}
            aria-label="Abrir tutorial guiado"
            data-tour="tutorial-button"
          >
            <BookOpen className="h-4 w-4 text-primary" />
            Tutorial
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex w-full min-h-[46px] items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 transition hover:bg-slate-50"
                aria-label="Menú de perfil"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-brand-500)] text-xs font-bold text-white flex-shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-bold text-[var(--color-text-strong)]">{userName}</div>
                  <div className="truncate text-[11px] text-[var(--color-text-muted)]">{normalizedRole}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuLabel className="flex items-center gap-2 flex-col">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-sm font-bold text-white shadow-sm">
                  {userInitial}
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-[var(--color-text-strong)]">{userName}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">{userEmail || "Sin email"}</div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs">
                <UserCircle2 className="h-4 w-4" /> Rol: {normalizedRole}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={logout}>
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] w-full min-w-0 flex-col pl-[294px] max-[820px]:pl-0">
        <header className="sticky top-0 z-20 border-b border-[var(--color-border-default)] bg-[rgba(244,246,251,0.86)] backdrop-blur-xl">
          <div
            className={
              isInicio
                ? "flex items-center justify-between gap-4 px-6 py-3 max-[820px]:px-4"
                : "hidden max-[820px]:flex items-center justify-between gap-4 px-4 py-3"
            }
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="hidden h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-[var(--color-border-default)] text-[var(--color-text-strong)] transition-[background] duration-150 hover:bg-[#f1f5f9] max-[820px]:inline-flex"
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Abrir menú"
                aria-controls="app-sidebar"
                aria-expanded={sidebarOpen}
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[18px] font-extrabold tracking-[-0.02em] text-[var(--color-text-strong)] leading-tight max-[820px]:text-[16px]">
                  {currentSection ? (
                    <currentSection.icon className="h-[18px] w-[18px] text-[var(--color-brand-500)]" />
                  ) : (
                    <LayoutDashboard className="h-[18px] w-[18px] text-[var(--color-brand-500)]" />
                  )}
                  <span className="truncate">{currentSection?.label ?? "Panel"}</span>
                </div>
                {isInicio ? (
                  <div className="mt-0.5 text-[12px] text-[var(--color-text-muted)] leading-snug truncate max-w-[56vw]">
                    Acceso rápido a secciones del panel
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 max-[520px]:gap-2">
              <div className="hidden items-center gap-2 rounded-[18px] border border-[var(--color-border-default)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--color-text-muted)] shadow-sm md:inline-flex">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>{todayLabel}</span>
              </div>

              <button
                type="button"
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[var(--color-border-default)] bg-white px-3 text-[13px] font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => setTourOpen(true)}
                aria-label="Abrir tutorial guiado"
                data-tour="tutorial-button"
              >
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="hidden min-[520px]:inline">Tutorial</span>
              </button>
            </div>
          </div>
        </header>

        <main
          className={[
            isInicio ? "flex-1 w-full min-w-0 min-h-0 m-0 p-0" : "flex-1 w-full min-w-0 min-h-0 m-0 p-[28px_32px_32px] max-[820px]:p-5",
            isInicio
              ? (isSmallViewport
                  ? "overflow-y-scroll overflow-x-hidden touch-pan-y [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]"
                  : "overflow-hidden")
              : "overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]",
          ].join(" ")}
          id="main-content"
        >
          <RouteErrorBoundary resetKey={transitionKey}>
            <PageTransition transitionKey={transitionKey}>
              {outlet}
            </PageTransition>
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}

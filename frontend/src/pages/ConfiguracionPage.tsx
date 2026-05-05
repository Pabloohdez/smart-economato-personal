import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showAlert, showNotification } from "../utils/notifications";
import type { AlergenoCatalogo, UsuarioActivo } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { getAlergenosCatalogo, getMisAlergias, saveMisAlergias } from "../services/alergenosService";
import { queryKeys } from "../lib/queryClient";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";

type PreferenciasNotificaciones = {
  alertasProductos: boolean;
  bloqueoDistribucion: boolean;
  nuevosProductos: boolean;
  filtradoBusqueda: boolean;
  fechaActualizacion: string;
};

type ConfigAlergias = {
  alergias: string[];
  fechaActualizacion: string;
};

type TabKey = "perfil" | "alergias" | "notificaciones";

const ALERGENOS_DISPONIBLES = [
  {
    nombre: "Lácteos",
    icono: "fa-solid fa-cow",
    bg: "#e3f2fd",
    color: "#1976d2",
  },
  {
    nombre: "Gluten",
    icono: "fa-solid fa-wheat-awn",
    bg: "#fff8e1",
    color: "#f57c00",
  },
  {
    nombre: "Huevos",
    icono: "fa-solid fa-egg",
    bg: "#fffde7",
    color: "#f9a825",
  },
  {
    nombre: "Pescado",
    icono: "fa-solid fa-fish",
    bg: "#e1f5fe",
    color: "#0277bd",
  },
  {
    nombre: "Crustáceos",
    icono: "fa-solid fa-shrimp",
    bg: "#fce4ec",
    color: "#c2185b",
  },
  {
    nombre: "Moluscos",
    icono: "fa-solid fa-circle",
    bg: "#f3e5f5",
    color: "#7b1fa2",
  },
  {
    nombre: "Almendras",
    icono: "fa-solid fa-seedling",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Avellanas",
    icono: "fa-solid fa-circle-dot",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Nueces",
    icono: "fa-solid fa-brain",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Anacardos",
    icono: "fa-solid fa-seedling",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Pistachos",
    icono: "fa-solid fa-seedling",
    bg: "#f1f8e9",
    color: "#33691e",
  },
  {
    nombre: "Pacanas",
    icono: "fa-solid fa-circle-dot",
    bg: "#efebe9",
    color: "#4e342e",
  },
  {
    nombre: "Nueces de Brasil",
    icono: "fa-solid fa-seedling",
    bg: "#efebe9",
    color: "#3e2723",
  },
  {
    nombre: "Macadamias",
    icono: "fa-solid fa-circle-dot",
    bg: "#fff8e1",
    color: "#f57f17",
  },
  {
    nombre: "Soja",
    icono: "fa-solid fa-leaf",
    bg: "#f1f8e9",
    color: "#558b2f",
  },
  {
    nombre: "Sulfitos",
    icono: "fa-solid fa-wine-bottle",
    bg: "#f3e5f5",
    color: "#8e24aa",
  },
  {
    nombre: "Apio",
    icono: "fa-solid fa-carrot",
    bg: "#e8f5e9",
    color: "#2e7d32",
  },
  {
    nombre: "Mostaza",
    icono: "fa-solid fa-pepper-hot",
    bg: "#fff9c4",
    color: "#f9a825",
  },
  {
    nombre: "Sésamo",
    icono: "fa-solid fa-circle-dot",
    bg: "#ffe0b2",
    color: "#e65100",
  },
  {
    nombre: "Cacahuetes",
    icono: "fa-solid fa-seedling",
    bg: "#d7ccc8",
    color: "#5d4037",
  },
  {
    nombre: "Altramuces",
    icono: "fa-solid fa-seedling",
    bg: "#fff9c4",
    color: "#fbc02d",
  },
] as const;

export default function ConfiguracionPage() {
  const { user: authUser, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [tabActiva, setTabActiva] = useState<TabKey>("perfil");
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActivo | null>(
    null,
  );

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("");

  const [alergiasSeleccionadas, setAlergiasSeleccionadas] = useState<string[]>(
    [],
  );

  const [alertasProductos, setAlertasProductos] = useState(true);
  const [bloqueoDistribucion, setBloqueoDistribucion] = useState(true);
  const [nuevosProductos, setNuevosProductos] = useState(false);
  const [filtradoBusqueda, setFiltradoBusqueda] = useState(false);

  const [modalGuardadoSeccion, setModalGuardadoSeccion] = useState<
    "perfil" | "notificaciones" | null
  >(null);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<
// placeholder break
// placeholder end
    "green" | "orange" | "red" | ""
  >("");

  const catalogoQuery = useQuery({
    queryKey: queryKeys.alergenosCatalogo,
    queryFn: getAlergenosCatalogo,
    staleTime: 5 * 60_000,
  });

  const misAlergiasQuery = useQuery({
    queryKey: queryKeys.misAlergias,
    queryFn: getMisAlergias,
    enabled: Boolean(authUser?.id),
  });

  const guardarAlergiasMutation = useMutation({
    mutationFn: saveMisAlergias,
    onSuccess: (alergiasGuardadas) => {
      queryClient.setQueryData(queryKeys.misAlergias, alergiasGuardadas);
    },
  });

  const catalogoAlergenos: AlergenoCatalogo[] =
    catalogoQuery.data && catalogoQuery.data.length > 0
      ? catalogoQuery.data
      : [...ALERGENOS_DISPONIBLES];

  useEffect(() => {
    cargarDatosUsuario();
  }, [authUser]);

  useEffect(() => {
    if (misAlergiasQuery.data) {
      setAlergiasSeleccionadas(misAlergiasQuery.data);
      return;
    }

    if (Array.isArray(authUser?.alergias)) {
      setAlergiasSeleccionadas(authUser.alergias);
      return;
    }

    const userId = String(authUser?.id ?? "");
    if (!userId) return;
    const configStr = localStorage.getItem(`alergias_${userId}`);
    if (!configStr) return;
    const config: ConfigAlergias = JSON.parse(configStr);
    setAlergiasSeleccionadas(config.alergias || []);
  }, [authUser?.alergias, authUser?.id, misAlergiasQuery.data]);

  function cargarDatosUsuario() {
    if (!authUser) {
      mostrarMensaje("No se encontró información del usuario", "red");
      return;
    }

    const user = authUser;
    setUsuarioActual(user);

    setNombreCompleto(`${user.nombre || ""} ${user.apellidos || ""}`.trim());
    setUsuario(user.usuario || user.username || "");
    setEmail(user.email || "");
    setTelefono(user.telefono || "");
    setRol(user.rol || user.role || "usuario");

    const userId = String(user.id ?? "");
    if (userId) {
      const prefStr = localStorage.getItem(`notificaciones_${userId}`);
      if (prefStr) {
        const pref: PreferenciasNotificaciones = JSON.parse(prefStr);
        setAlertasProductos(pref.alertasProductos !== false);
        setBloqueoDistribucion(pref.bloqueoDistribucion !== false);
        setNuevosProductos(!!pref.nuevosProductos);
        setFiltradoBusqueda(!!pref.filtradoBusqueda);
      }
    }
  }

  function mostrarMensaje(texto: string, tipo: "green" | "orange" | "red") {
    setMensajeEstado(texto);
    setMensajeTipo(tipo);

    window.setTimeout(() => {
      setMensajeEstado("");
      setMensajeTipo("");
    }, 5000);
  }

  function guardarPerfil() {
    if (!usuarioActual) return;

    if (!isValidOptionalEmail(email)) {
      mostrarMensaje("El email no es válido", "red");
      return;
    }

    const normalizedEmail = normalizeOptionalEmail(email);

    const actualizado: UsuarioActivo = {
      ...usuarioActual,
      email: normalizedEmail,
      telefono: telefono.trim(),
    };

    localStorage.setItem("usuarioActivo", JSON.stringify(actualizado));
    updateUser(actualizado);
    setUsuarioActual(actualizado);
    setEmail(normalizedEmail || "");
    setModalGuardadoSeccion("perfil");
  }

  function toggleAlergia(alergeno: string) {
    setAlergiasSeleccionadas((prev) =>
      prev.includes(alergeno)
        ? prev.filter((a) => a !== alergeno)
        : [...prev, alergeno],
    );
  }

  async function guardarAlergias() {
    if (!usuarioActual?.id) return;

    const alergiasGuardadas = await guardarAlergiasMutation.mutateAsync(alergiasSeleccionadas);

    const configAlergias: ConfigAlergias = {
      alergias: alergiasGuardadas,
      fechaActualizacion: new Date().toISOString(),
    };

    localStorage.setItem(
      `alergias_${usuarioActual.id}`,
      JSON.stringify(configAlergias),
    );

    const actualizado: UsuarioActivo = {
      ...usuarioActual,
      alergias: alergiasGuardadas,
    };

    updateUser(actualizado);
    setUsuarioActual(actualizado);
    setAlergiasSeleccionadas(alergiasGuardadas);

    mostrarMensaje(
      `✅ Configuración guardada: ${alergiasSeleccionadas.length} alergia(s) registrada(s)`,
      "green",
    );

    if (alergiasGuardadas.length > 0) {
      window.setTimeout(() => {
        showAlert(
          `Has registrado ${alergiasGuardadas.length} alergia(s): ${alergiasGuardadas.join(
            ", ",
          )}. Recibirás alertas automáticas cuando busques o intentes distribuir productos que contengan estos alérgenos.`,
          "warning",
          "Importante",
        );
      }, 500);
    }
  }

  function guardarNotificaciones() {
    if (!usuarioActual?.id) return;

    const preferencias: PreferenciasNotificaciones = {
      alertasProductos,
      bloqueoDistribucion,
      nuevosProductos,
      filtradoBusqueda,
      fechaActualizacion: new Date().toISOString(),
    };

    localStorage.setItem(
      `notificaciones_${usuarioActual.id}`,
      JSON.stringify(preferencias),
    );

    mostrarMensaje("✅ Preferencias de notificaciones guardadas", "green");
    setModalGuardadoSeccion("notificaciones");
  }

  const resumenAlergias = useMemo(
    () => alergiasSeleccionadas,
    [alergiasSeleccionadas],
  );

  return (
    <StaggerPage>
      <StaggerItem className="mb-[30px] pb-5 border-b-2 border-[var(--color-border-default)]">
        <h1 className="m-0 mb-2 flex items-center gap-3 text-[28px] font-bold text-primary">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <i className="fa-solid fa-gear" />
          </span>
          Configuración del Perfil
        </h1>
        <p className="m-0 text-[14px] text-[var(--color-text-muted)]">
          Gestiona tu información personal y configuración de alergias
        </p>
      </StaggerItem>

      <StaggerItem
        className="flex gap-2.5 mb-[30px] border-b-2 border-[var(--color-border-default)] pb-2.5 max-[768px]:flex-col"
        role="tablist"
        aria-label="Secciones de configuración"
      >
        <button
          className={[
            "px-6 py-3 rounded-[10px] font-semibold text-[14px] border-2 transition flex items-center gap-2",
            tabActiva === "perfil"
              ? "bg-[var(--color-brand-500)] text-[var(--color-bg-surface)] border-[var(--color-brand-500)]"
              : "bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-default)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]",
            "max-[768px]:rounded-[10px]",
          ].join(" ")}
          role="tab"
          aria-selected={tabActiva === "perfil"}
          onClick={() => setTabActiva("perfil")}
          type="button"
        >
          <i className="fa-solid fa-user"></i> Perfil
        </button>

        <button
          className={[
            "px-6 py-3 rounded-[10px] font-semibold text-[14px] border-2 transition flex items-center gap-2",
            tabActiva === "alergias"
              ? "bg-[var(--color-brand-500)] text-[var(--color-bg-surface)] border-[var(--color-brand-500)]"
              : "bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-default)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]",
            "max-[768px]:rounded-[10px]",
          ].join(" ")}
          role="tab"
          aria-selected={tabActiva === "alergias"}
          onClick={() => setTabActiva("alergias")}
          type="button"
        >
          <i className="fa-solid fa-triangle-exclamation"></i> Alergias
        </button>

        <button
          className={[
            "px-6 py-3 rounded-[10px] font-semibold text-[14px] border-2 transition flex items-center gap-2",
            tabActiva === "notificaciones"
              ? "bg-[var(--color-brand-500)] text-[var(--color-bg-surface)] border-[var(--color-brand-500)]"
              : "bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-default)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]",
            "max-[768px]:rounded-[10px]",
          ].join(" ")}
          role="tab"
          aria-selected={tabActiva === "notificaciones"}
          onClick={() => setTabActiva("notificaciones")}
          type="button"
        >
          <i className="fa-solid fa-bell"></i> Notificaciones
        </button>
      </StaggerItem>

      {tabActiva === "perfil" && (
        <StaggerItem className="rounded-[30px] border border-slate-200/90 bg-white p-[30px] shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <h2 className="m-0 mb-[25px] flex items-center gap-2.5 text-[18px] font-semibold text-[var(--color-text-strong)]">
            <i className="fa-solid fa-id-card" /> Información Personal
          </h2>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="inputNombrePerfil"
                className="font-semibold text-[13px] text-[var(--color-text-muted)] uppercase tracking-[0.5px]"
              >
                Nombre Completo
              </label>
              <input
                type="text"
                id="inputNombrePerfil"
                className="py-3 px-4 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] cursor-not-allowed"
                value={nombreCompleto}
                readOnly
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="inputUsuarioPerfil"
                className="font-semibold text-[13px] text-[var(--color-text-muted)] uppercase tracking-[0.5px]"
              >
                Usuario
              </label>
              <input
                type="text"
                id="inputUsuarioPerfil"
                className="py-3 px-4 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] cursor-not-allowed"
                value={usuario}
                readOnly
              />
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 max-[768px]:grid-cols-1">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="inputEmailPerfil"
                  className="font-semibold text-[13px] text-[var(--color-text-muted)] uppercase tracking-[0.5px]"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="inputEmailPerfil"
                  className="py-3 px-4 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] bg-[var(--color-bg-surface)] transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="inputTelefonoPerfil"
                  className="font-semibold text-[13px] text-[var(--color-text-muted)] uppercase tracking-[0.5px]"
                >
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="inputTelefonoPerfil"
                  className="py-3 px-4 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] bg-[var(--color-bg-surface)] transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  maxLength={9}
                  inputMode="numeric"
                  pattern="[0-9]{9}"
                  placeholder="9 dígitos"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="inputRolPerfil"
                className="font-semibold text-[13px] text-[var(--color-text-muted)] uppercase tracking-[0.5px]"
              >
                Rol
              </label>
              <input
                type="text"
                id="inputRolPerfil"
                className="py-3 px-4 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] cursor-not-allowed"
                value={rol}
                readOnly
              />
            </div>

            <button
              id="btnGuardarPerfil"
              className="mt-2.5 px-8 py-3.5 rounded-[10px] font-semibold text-[15px] text-[var(--color-bg-surface)] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] shadow-[0_4px_15px_rgba(179,49,49,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] transition"
              type="button"
              onClick={guardarPerfil}
            >
              <i className="fa-solid fa-save" /> Guardar Cambios
            </button>
          </div>
        </StaggerItem>
      )}

      {tabActiva === "alergias" && (
        <>
          <StaggerItem className="bg-[linear-gradient(135deg,#fff5f5_0%,#fed7d7_100%)] border-l-4 border-l-[#c53030] p-5 rounded-[10px] flex items-start gap-[15px] mb-[30px]">
            <i className="fa-solid fa-shield-halved text-[24px] text-[#c53030] mt-0.5" />
            <div>
              <strong className="block text-[16px] text-[#742a2a] mb-1">
                Información Importante
              </strong>
              <p className="m-0 text-[14px] text-[#9b2c2c] leading-[1.5]">
                Configura tus alergias para recibir alertas automáticas. Esta
                información es crítica para tu seguridad.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem className="rounded-[30px] border border-slate-200/90 bg-white p-[30px] shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <h3 className="m-0 mb-[25px] flex items-center gap-2.5 text-[18px] font-semibold text-[var(--color-text-strong)]">
              <i className="fa-solid fa-triangle-exclamation" /> Mis Alergias Registradas
            </h3>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-[15px] mb-[30px] max-[768px]:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
              {catalogoAlergenos.map((item) => {
                const checked = alergiasSeleccionadas.includes(item.nombre);
                const backgroundColor =
                  item.colorBg ??
                  (item as AlergenoCatalogo & { bg?: string }).bg ??
                  "#eef2f7";
                const textColor =
                  item.colorTexto ??
                  (item as AlergenoCatalogo & { color?: string }).color ??
                  "#1f2937";
                const iconClass = item.icono ?? "fa-solid fa-triangle-exclamation";
                const inputId = `check-${item.nombre
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/ /g, "-")
                  .replace(/\./g, "")}`;

                return (
                  <div key={item.nombre} data-alergeno={item.nombre} className="relative">
                    <input
                      type="checkbox"
                      id={inputId}
                      className="sr-only peer"
                      checked={checked}
                      onChange={() => toggleAlergia(item.nombre)}
                    />
                    <label
                      htmlFor={inputId}
                      className="relative flex flex-col items-center gap-2.5 p-5 bg-[var(--color-bg-surface)] border-[3px] border-[var(--color-border-default)] rounded-xl cursor-pointer transition hover:border-[var(--color-border-strong)] hover:translate-y-[-3px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] peer-checked:border-[#c53030] peer-checked:bg-[#fff5f5] peer-checked:shadow-[0_0_0_4px_rgba(197,48,48,0.1)]"
                    >
                      <span className="absolute top-2 right-2 hidden peer-checked:flex w-6 h-6 rounded-full bg-[#c53030] text-white items-center justify-center text-[14px] font-bold">
                        ✓
                      </span>
                      <div
                        className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-[28px]"
                        style={{ background: backgroundColor, color: textColor }}
                      >
                        <i className={iconClass} />
                      </div>
                      <span className="font-semibold text-[14px] text-[var(--color-text-strong)] text-center">
                        {item.nombre}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="bg-[var(--color-bg-soft)] p-5 rounded-[10px] border-2 border-[var(--color-border-default)] mb-5">
              <h4 className="m-0 mb-[15px] text-[16px] text-[var(--color-text-strong)] flex items-center gap-2">
                <i className="fa-solid fa-list-check" /> Resumen de Alergias Seleccionadas
              </h4>

              <div className="flex flex-wrap gap-2.5">
                {resumenAlergias.length === 0 ? (
                  <p className="m-0 italic text-[var(--color-text-default)]">
                    No has seleccionado ninguna alergia
                  </p>
                ) : (
                  resumenAlergias.map((alergia) => (
                    <div
                      key={alergia}
                      className="px-4 py-2 bg-[var(--color-bg-surface)] border-2 border-[#c53030] text-[#c53030] rounded-[20px] font-semibold text-[13px] flex items-center gap-2"
                    >
                      <i className="fa-solid fa-triangle-exclamation" />
                      {alergia}
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              id="btnGuardarAlergias"
              className="mt-2.5 px-8 py-3.5 rounded-[10px] font-semibold text-[15px] text-[var(--color-bg-surface)] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] shadow-[0_4px_15px_rgba(179,49,49,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] transition flex items-center justify-center gap-2.5"
              type="button"
              onClick={guardarAlergias}
            >
              <i className="fa-solid fa-shield-heart" /> Guardar Configuración de Alergias
            </button>
          </StaggerItem>
        </>
      )}

      {tabActiva === "notificaciones" && (
        <StaggerItem className="rounded-[30px] border border-slate-200/90 bg-white p-[30px] shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <h3 className="m-0 mb-[25px] flex items-center gap-2.5 text-[18px] font-semibold text-[var(--color-text-strong)]">
            <i className="fa-solid fa-bell" /> Preferencias de Alertas
          </h3>

          <div className="flex flex-col gap-5 mb-[30px]">
            <div className="flex items-center justify-between gap-4 p-5 bg-[var(--color-bg-soft)] rounded-xl border-2 border-[var(--color-border-default)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface)] max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-[15px]">
              <div className="flex items-start gap-[15px] flex-1">
                <i className="fa-solid fa-triangle-exclamation text-[24px] mt-0.5" style={{ color: "#c53030" }} />
                <div>
                  <label htmlFor="switchAlertasProductos" className="cursor-pointer">
                    <strong className="block text-[15px] text-[var(--color-text-strong)] mb-1">
                      Alertas de Productos con Alérgenos
                    </strong>
                  </label>
                  <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.4]">
                    Recibir advertencias al buscar productos con tus alérgenos
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center self-start max-[768px]:self-auto cursor-pointer">
                <input
                  type="checkbox"
                  id="switchAlertasProductos"
                  className="sr-only peer"
                  checked={alertasProductos}
                  onChange={(e) => {
                    setAlertasProductos(e.target.checked);
                    if (e.target.checked) {
                      showAlert(
                        "Has activado las alertas de alérgenos. El sistema te avisará automáticamente cuando intentes distribuir un producto que contenga tus alérgenos registrados.",
                        "warning",
                        "Alertas de Alérgenos Activadas",
                      );
                    }
                  }}
                />
                <span className="w-[60px] h-[34px] rounded-full bg-[var(--color-border-strong)] transition duration-300 peer-checked:bg-[#48bb78]" />
                <span className="absolute left-1 bottom-1 w-[26px] h-[26px] rounded-full bg-[var(--color-bg-surface)] shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition duration-300 peer-checked:translate-x-[26px]" />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 p-5 bg-[var(--color-bg-soft)] rounded-xl border-2 border-[var(--color-border-default)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface)] max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-[15px]">
              <div className="flex items-start gap-[15px] flex-1">
                <i className="fa-solid fa-dolly text-[24px] mt-0.5" style={{ color: "#2f855a" }} />
                <div>
                  <label htmlFor="switchBloqueoDistribucion" className="cursor-pointer">
                    <strong className="block text-[15px] text-[var(--color-text-strong)] mb-1">
                      Bloqueo en Distribución
                    </strong>
                  </label>
                  <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.4]">
                    Impedir distribución de productos incompatibles con tus alergias
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center self-start max-[768px]:self-auto cursor-pointer">
                <input
                  type="checkbox"
                  id="switchBloqueoDistribucion"
                  className="sr-only peer"
                  checked={bloqueoDistribucion}
                  onChange={(e) => setBloqueoDistribucion(e.target.checked)}
                />
                <span className="w-[60px] h-[34px] rounded-full bg-[var(--color-border-strong)] transition duration-300 peer-checked:bg-[#48bb78]" />
                <span className="absolute left-1 bottom-1 w-[26px] h-[26px] rounded-full bg-[var(--color-bg-surface)] shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition duration-300 peer-checked:translate-x-[26px]" />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 p-5 bg-[var(--color-bg-soft)] rounded-xl border-2 border-[var(--color-border-default)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface)] max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-[15px]">
              <div className="flex items-start gap-[15px] flex-1">
                <i className="fa-solid fa-inbox text-[24px] mt-0.5" style={{ color: "#3182ce" }} />
                <div>
                  <label htmlFor="switchNuevosProductos" className="cursor-pointer">
                    <strong className="block text-[15px] text-[var(--color-text-strong)] mb-1">
                      Alertas de Nuevos Productos
                    </strong>
                  </label>
                  <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.4]">
                    Notificar cuando se añadan productos con tus alérgenos
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center self-start max-[768px]:self-auto cursor-pointer">
                <input
                  type="checkbox"
                  id="switchNuevosProductos"
                  className="sr-only peer"
                  checked={nuevosProductos}
                  onChange={(e) => setNuevosProductos(e.target.checked)}
                />
                <span className="w-[60px] h-[34px] rounded-full bg-[var(--color-border-strong)] transition duration-300 peer-checked:bg-[#48bb78]" />
                <span className="absolute left-1 bottom-1 w-[26px] h-[26px] rounded-full bg-[var(--color-bg-surface)] shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition duration-300 peer-checked:translate-x-[26px]" />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 p-5 bg-[var(--color-bg-soft)] rounded-xl border-2 border-[var(--color-border-default)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface)] max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-[15px]">
              <div className="flex items-start gap-[15px] flex-1">
                <i className="fa-solid fa-filter text-[24px] mt-0.5" style={{ color: "#805ad5" }} />
                <div>
                  <label htmlFor="switchFiltradoBusqueda" className="cursor-pointer">
                    <strong className="block text-[15px] text-[var(--color-text-strong)] mb-1">
                      Filtrado Estricto en Búsqueda
                    </strong>
                  </label>
                  <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.4]">
                    Ocultar automáticamente resultados incompatibles con tus alergias
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center self-start max-[768px]:self-auto cursor-pointer">
                <input
                  type="checkbox"
                  id="switchFiltradoBusqueda"
                  className="sr-only peer"
                  checked={filtradoBusqueda}
                  onChange={(e) => setFiltradoBusqueda(e.target.checked)}
                />
                <span className="w-[60px] h-[34px] rounded-full bg-[var(--color-border-strong)] transition duration-300 peer-checked:bg-[#48bb78]" />
                <span className="absolute left-1 bottom-1 w-[26px] h-[26px] rounded-full bg-[var(--color-bg-surface)] shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition duration-300 peer-checked:translate-x-[26px]" />
              </label>
            </div>
          </div>

          <button
            id="btnGuardarNotificaciones"
            className="mt-2.5 px-8 py-3.5 rounded-[10px] font-semibold text-[15px] text-[var(--color-bg-surface)] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] shadow-[0_4px_15px_rgba(179,49,49,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] transition flex items-center justify-center gap-2.5"
            type="button"
            onClick={guardarNotificaciones}
          >
            <i className="fa-solid fa-save" /> Guardar Preferencias
          </button>
        </StaggerItem>
      )}

      <StaggerItem
        id="mensajeEstadoConfig"
        className={[
          "text-center font-semibold min-h-6 text-[14px] px-3 py-3 rounded-lg mt-5 transition-opacity",
          mensajeTipo ? "opacity-100" : "opacity-0",
          mensajeTipo === "orange"
            ? "bg-[#fffaf0] text-[#c05621] border-2 border-[#fbd38d]"
            : mensajeTipo === "red"
              ? "bg-[#fff5f5] text-[#c53030] border-2 border-[#fc8181]"
              : "bg-transparent text-transparent border-0",
        ].join(" ")}
      >
        {mensajeEstado}
      </StaggerItem>

      <AnimatePresence>
        {modalGuardadoSeccion && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setModalGuardadoSeccion(null)}
          >
            <motion.div
              className="w-full max-w-[400px] rounded-2xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.22)] border border-slate-100 overflow-hidden"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[linear-gradient(135deg,#276749,#38a169)] px-6 py-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <i className={`text-white text-[20px] ${modalGuardadoSeccion === "perfil" ? "fa-solid fa-circle-check" : "fa-solid fa-bell"}`} />
                </span>
                <h3 className="m-0 text-white font-bold text-[18px]">
                  {modalGuardadoSeccion === "perfil" ? "Cambios guardados" : "Preferencias guardadas"}
                </h3>
              </div>
              <div className="p-6">
                <p className="m-0 text-slate-600 text-[14px] leading-relaxed">
                  {modalGuardadoSeccion === "perfil"
                    ? "Tu perfil ha sido actualizado correctamente."
                    : "Tus preferencias de notificaciones han sido actualizadas correctamente."}
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-[10px] bg-[#276749] text-white font-semibold text-sm cursor-pointer hover:bg-[#1f5238] transition-colors"
                    onClick={() => setModalGuardadoSeccion(null)}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StaggerPage>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, type ApiRequestError } from "../services/apiClient";
import Alert from "../components/ui/Alert";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import { CheckCircle2, Eye, EyeOff, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type NuevoUsuarioPayload = {
  usuario: string;
  password: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
};

type CrearUsuarioResponse = {
  success?: boolean;
  ok?: boolean;
  id?: number | string;
  message?: string;
  error?: {
    message?: string;
  };
};

export default function CrearUsuarioPage() {
  const nav = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const [msg, setMsg] = useState("");
  const [msgTipo, setMsgTipo] = useState<"success" | "error">("error");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  async function crearUsuario(payload: NuevoUsuarioPayload) {
    return apiFetch<CrearUsuarioResponse>("/usuarios", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(payload),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    
    if (!nombre.trim()) {
      setMsgTipo("error");
      setMsg("El nombre es obligatorio");
      return;
    }

    if (!apellidos.trim()) {
      setMsgTipo("error");
      setMsg("Los apellidos son obligatorios");
      return;
    }

    const normalizedEmail = normalizeOptionalEmail(email);

    if (!normalizedEmail || !isValidOptionalEmail(normalizedEmail)) {
      setMsgTipo("error");
      setMsg("El correo electrónico no es válido");
      return;
    }

    setLoading(true);

    try {
      const payload: NuevoUsuarioPayload = {
        usuario: usuario.trim(),
        password: password.trim(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: normalizedEmail,
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
      };

      const data = await crearUsuario(payload);

      if (data?.success || data?.ok || data?.id) {
        setShowSuccessModal(true);
        setTimeout(() => {
          nav("/login");
        }, 7000);
      } else {
        setMsgTipo("error");
        setMsg(data?.error?.message || data?.message || "No se pudo crear la cuenta");
      }
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError?.status === 409) {
        setMsgTipo("error");
        setMsg(
          "Ya existe una cuenta con ese usuario o correo. Verifica tu cuenta o solicita recuperar contraseña.",
        );
        return;
      }
      setMsgTipo("error");
      setMsg(error instanceof Error ? error.message : "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#dfe4ec] font-[var(--font-family-base)] text-slate-900">
      <main className="grid min-h-full w-full lg:grid-cols-[1.25fr_1fr]">
        {/* PANEL IZQUIERDO */}
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#b33131_0%,#8e2626_50%,#6b1f1f_100%)] text-white lg:flex lg:flex-col lg:min-h-screen">
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:58px_58px]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(44,113,255,0.18),transparent_44%),radial-gradient(circle_at_78%_64%,rgba(34,197,94,0.10),transparent_46%)]" aria-hidden="true" />

          {/* --- CONTENEDOR MAESTRO --- */}
          {/* El pl-[...] genera el hueco vacío a la izquierda */}
          <div className="relative z-10 flex flex-1 pl-[clamp(40px,6vw,90px)]">
            
            {/* 1. LÍNEA VERTICAL LARGA (border-l) */}
            {/* Como tiene flex-1, va obligatoriamente de arriba a abajo de la pantalla */}
            <div className="flex flex-1 flex-col border-l border-white/20">
              
              {/* Contenido Principal (Empuja el footer hacia abajo) */}
              <div className="flex flex-1 flex-col justify-center px-[clamp(32px,4vw,64px)] py-12">
                <div className="max-w-[560px]">
                  <p className="m-0 text-[10px] font-medium uppercase tracking-[0.38em] text-white/60">Sistema interno</p>
                  <h1 className="m-0 mt-5 text-[clamp(38px,4.2vw,64px)] font-semibold leading-[0.95] tracking-[-0.04em] text-white">
                    Solicitud
                    <br />
                    de alta
                  </h1>
                  <p className="m-0 mt-8 text-[clamp(14px,1vw,18px)] font-normal leading-[1.6] text-white/84">
                    Crea tu cuenta para acceder al panel operativo. Recibirás un mensaje de confirmación tras el registro.
                  </p>
                </div>

                {/* 2. LÍNEA VERTICAL CORTA (Para los 3 items) */}
                <div className="mt-14 max-w-[560px] space-y-8 border-l border-white/60 py-2 pl-6">
                  <article>
                    <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Datos</p>
                    <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">Rellena usuario, contraseña y datos de contacto.</p>
                  </article>
                  <article>
                    <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Verificación</p>
                    <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">Recibirás un enlace para verificar tu correo electrónico.</p>
                  </article>
                  <article>
                    <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Acceso</p>
                    <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">Una vez verificado, podrás iniciar sesión en el panel.</p>
                  </article>
                </div>
              </div>

              {/* 3. LÍNEA HORIZONTAL (Footer border-t) */}
              {/* Conecta directamente con la esquina de la vertical larga */}
              <div className="flex h-[90px] items-center justify-between border-t border-white/20 px-[clamp(32px,4vw,64px)] text-[11px] font-normal text-white/56">
                <span>Uso interno de Smart Economato. Acceso reservado a personal autorizado.</span>
                <span>© {new Date().getFullYear()}</span>
              </div>

            </div>
          </div>
        </section>

        {/* PANEL DERECHO */}
        <section className="relative flex min-h-screen w-full items-center justify-center bg-[#dfe4ec] px-6 py-10 lg:min-h-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[480px] rounded-[30px] border border-slate-200 bg-[#fbfcfe] shadow-2xl"
          >
            <div className="border-b border-slate-200 px-[clamp(20px,3.4vw,34px)] py-[clamp(18px,3vh,28px)]">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.28em] text-[#b33131]">Registro</p>
              <h2 className="m-0 mt-3 text-[32px] font-semibold leading-[1.02] tracking-[-0.02em] text-slate-900">Crear cuenta</h2>
              <p className="m-0 mt-3 text-[14px] font-normal leading-7 text-slate-500">
                Completa los datos para solicitar el alta. Podrás iniciar sesión después.
              </p>
            </div>

            <div className="px-[clamp(20px,3.4vw,34px)] py-[clamp(20px,3.4vw,32px)]">
              <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                <div>
                  <label htmlFor="cu-usuario" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Usuario
                  </label>
                  <input
                    id="cu-usuario"
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Nombre de usuario"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                    required
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label htmlFor="cu-password" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="cu-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 pr-12 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cu-nombre" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Nombre *
                    </label>
                    <input
                      id="cu-nombre"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="cu-apellidos" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Apellidos *
                    </label>
                    <input
                      id="cu-apellidos"
                      type="text"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      placeholder="Tus apellidos"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cu-email" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Correo electrónico
                  </label>
                  <input
                    id="cu-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@centro.es"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="cu-telefono" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Teléfono
                  </label>
                  <input
                    id="cu-telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setTelefono(val);
                    }}
                    placeholder="9 dígitos"
                    maxLength={9}
                    inputMode="numeric"
                    pattern="[0-9]{9}"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                    autoComplete="tel"
                  />
                </div>

                {msg && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-[13px] font-medium ${
                      msgTipo === "success"
                        ? "border-[#c6f6d5] bg-[#f0fff4] text-[#276749]"
                        : "border-[#f6caca] bg-[#fff4f4] text-[#9f2a2a]"
                    }`}
                    role={msgTipo === "error" ? "alert" : "status"}
                  >
                    {msg}
                  </div>
                )}

                <div className="pt-1" />

                <motion.button
                  type="submit"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,#c0392b_0%,#96281b_100%)] px-4 text-[18px] font-semibold text-white shadow-lg shadow-red-500/20 transition-all duration-150 hover:shadow-xl hover:shadow-red-500/30 disabled:cursor-not-allowed disabled:opacity-75"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Registrando...
                    </>
                  ) : (
                    "Registrarse"
                  )}
                </motion.button>
              </form>

              <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-[13px] text-slate-500">
                <p className="m-0">
                  ¿Ya tienes cuenta?{" "}
                  <Link className="font-semibold text-[#b33131] transition-colors hover:text-[#8f2323]" to="/login">
                    Iniciar sesión
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Modal de éxito */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Overlay */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Card */}
            <motion.div
              className="relative z-10 w-full max-w-md rounded-[28px] border border-white/20 bg-white p-8 shadow-[0_32px_80px_rgba(15,23,42,0.18)] text-center"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
            >
              {/* Icono animado */}
              <motion.div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d4edda,#c3e6cb)]"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2 className="h-10 w-10 text-[#276749]" strokeWidth={2} />
              </motion.div>

              <motion.h2
                className="m-0 text-[22px] font-bold text-slate-900"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                ¡Solicitud enviada!
              </motion.h2>

              <motion.p
                className="m-0 mt-3 text-[14px] leading-relaxed text-slate-500"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
              >
                Tu solicitud de alta ha sido recibida correctamente.
                <br />
                Un administrador la revisará pronto.
              </motion.p>

              <motion.p
                className="m-0 mt-4 text-[12px] text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.38 }}
              >
                Serás redirigido al inicio de sesión en unos segundos...
              </motion.p>

              <motion.button
                onClick={() => nav("/login")}
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,#276749,#1d4e35)] text-[14px] font-semibold text-white shadow-md transition hover:opacity-90"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Ir al inicio de sesión
              </motion.button>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

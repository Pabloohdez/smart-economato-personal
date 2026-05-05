import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/apiClient";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function RegistroPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    usuario: "",
    password: "",
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
  });
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validar(): string | null {
    if (!form.usuario.trim()) return "El nombre de usuario es obligatorio.";
    if (form.usuario.trim().length < 3) return "El usuario debe tener al menos 3 caracteres.";
    if (!form.password) return "La contraseÃ±a es obligatoria.";
    if (form.password.length < 8) return "La contraseÃ±a debe tener al menos 8 caracteres.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "El formato del correo electrÃ³nico no es vÃ¡lido.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    const error = validar();
    if (error) { setMsg(error); return; }
    setMsg("");
    setLoading(true);
    try {
      const response = await apiFetch<{ message?: string; mailMode?: string }>("/usuarios", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          usuario: form.usuario.trim(),
          password: form.password,
          nombre: form.nombre.trim() || undefined,
          apellidos: form.apellidos.trim() || undefined,
          email: form.email.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          rol: "usuario",
        }),
      });
      setSuccess(true);
      const backendMessage = String(response?.message ?? "").trim();
      setMsg(backendMessage || "Cuenta creada correctamente. Redirigiendo al login...");
      setTimeout(() => nav("/login", { replace: true }), 1500);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Error al crear la cuenta.");
    }
    setLoading(false);
  }

  const hasError = msg && !success;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#dfe4ec] font-[var(--font-family-base)] text-slate-900">
      <main className="grid min-h-full w-full lg:grid-cols-[1.25fr_1fr]">

        {/* PANEL IZQUIERDO */}
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#b33131_0%,#8e2626_50%,#6b1f1f_100%)] px-[clamp(30px,4.8vw,72px)] py-[clamp(28px,5vh,64px)] text-white border-r border-white/15 lg:flex lg:flex-col lg:justify-center lg:min-h-screen">
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:58px_58px]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(44,113,255,0.18),transparent_44%),radial-gradient(circle_at_78%_64%,rgba(34,197,94,0.10),transparent_46%)]" aria-hidden="true" />
          {/* LÍNEA DECORATIVA VERTICAL PARALELA */}
          <div className="absolute left-[clamp(72px,10vw,104px)] top-[180px] bottom-[100px] w-0.5 bg-gradient-to-b from-white/80 to-white/20" aria-hidden="true" />

          <div className="relative z-[1] flex w-full flex-col">
            <div className="max-w-[560px]">
              <p className="m-0 text-[10px] font-medium uppercase tracking-[0.38em] text-white/60">Sistema interno</p>
              <h1 className="m-0 mt-5 text-[clamp(38px,4.2vw,64px)] font-semibold leading-[0.95] tracking-[-0.04em] text-white">
                Solicitud
                <br />
                de alta
              </h1>
              <p className="m-0 mt-8 text-[clamp(14px,1vw,18px)] font-normal leading-[1.6] text-white/84">
                Crea tu cuenta para acceder al panel operativo. RecibirÃ¡s un mensaje de confirmaciÃ³n tras el registro.
              </p>
            </div>

            <div className="mt-14 max-w-[560px] space-y-8 border-l-[2px] border-white/60 py-2 pl-6">
              <article>
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Datos</p>
                <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">Rellena usuario, contraseÃ±a y datos de contacto opcionales.</p>
              </article>
              <article>
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Acceso</p>
                <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">PodrÃ¡s iniciar sesiÃ³n una vez que tu cuenta haya sido activada.</p>
              </article>
              <article>
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Soporte</p>
                <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">Si hay incidencias, puedes solicitar reenvÃ­o de verificaciÃ³n desde el panel de acceso.</p>
              </article>
            </div>

            <div className="mt-24 flex items-center justify-between border-t border-white/40 pt-8 text-[11px] font-normal text-white/56">
              <span>Uso interno de Smart Economato. Acceso reservado a personal autorizado.</span>
              <span>Â© {new Date().getFullYear()}</span>
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
                Completa los datos para solicitar el alta. PodrÃ¡s iniciar sesiÃ³n despuÃ©s.
              </p>
            </div>

            <div className="px-[clamp(20px,3.4vw,34px)] py-[clamp(20px,3.4vw,32px)]">
              <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate aria-describedby={msg ? "registro-msg" : undefined}>
                <div>
                  <label htmlFor="reg-usuario" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Usuario
                  </label>
                  <input
                    id="reg-usuario"
                    type="text"
                    value={form.usuario}
                    onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                    placeholder="Nombre de usuario"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                    required
                    minLength={3}
                    autoComplete="username"
                    aria-invalid={hasError ? true : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    ContraseÃ±a
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="MÃ­nimo 8 caracteres"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 pr-12 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-invalid={hasError ? true : undefined}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseÃ±a" : "Mostrar contraseÃ±a"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-nombre" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Nombre
                    </label>
                    <input
                      id="reg-nombre"
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      placeholder="Opcional"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-apellidos" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Apellidos
                    </label>
                    <input
                      id="reg-apellidos"
                      type="text"
                      value={form.apellidos}
                      onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                      placeholder="Opcional"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Correo electrÃ³nico
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="correo@centro.es (opcional)"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                    autoComplete="email"
                    aria-invalid={hasError ? true : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="reg-telefono" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    TelÃ©fono
                  </label>
                  <input
                    id="reg-telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    placeholder="TelÃ©fono (opcional)"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] px-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                    autoComplete="tel"
                  />
                </div>

                {msg ? (
                  <p
                    id="registro-msg"
                    className={`m-0 rounded-xl border px-4 py-3 text-[13px] font-medium ${
                      success
                        ? "border-[#c6f6d5] bg-[#f0fff4] text-[#276749]"
                        : "border-[#f6caca] bg-[#fff4f4] text-[#9f2a2a]"
                    }`}
                    role={hasError ? "alert" : "status"}
                  >
                    {msg}
                  </p>
                ) : null}

                <div className="pt-1" />

                <motion.button
                  type="submit"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,#c0392b_0%,#96281b_100%)] px-4 text-[18px] font-semibold text-white shadow-lg shadow-red-500/20 transition-all duration-150 hover:shadow-xl hover:shadow-red-500/30 disabled:cursor-not-allowed disabled:opacity-75"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Registrando...</>
                  ) : "Registrarse"}
                </motion.button>
              </form>

              <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-[13px] text-slate-500">
                <p className="m-0">
                  Â¿Ya tienes cuenta?{" "}
                  <Link className="font-semibold text-[#b33131] transition-colors hover:text-[#8f2323]" to="/login">
                    Iniciar sesiÃ³n
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

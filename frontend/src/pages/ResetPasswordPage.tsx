import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Alert from "../components/ui/Alert";
import { resetPassword } from "../services/authService";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setType("error");
      setMessage("Falta el token de recuperación. Abre el enlace recibido por correo.");
      return;
    }

    if (password.trim().length < 8) {
      setType("error");
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setType("error");
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(token, password);
      setType("success");
      setMessage(response.data?.message || response.message || "Contraseña actualizada.");
      window.setTimeout(() => navigate("/login"), 1400);
    } catch (error) {
      setType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="m-0 min-h-screen flex flex-col justify-center items-center bg-[linear-gradient(140deg,#fff1f1_0%,#ffe5e5_48%,#fff8f6_100%)] bg-fixed overflow-x-hidden relative font-[var(--font-family-base)] before:content-[''] before:absolute before:w-[400px] before:h-[400px] before:bg-[radial-gradient(#ffc2c2,transparent_70%)] before:top-[-100px] before:left-[-100px] before:z-0 before:opacity-60 after:content-[''] after:absolute after:w-[300px] after:h-[300px] after:bg-[radial-gradient(#ffc2c2,transparent_70%)] after:bottom-[-50px] after:right-[-50px] after:z-0 after:opacity-60">
      <div className="absolute top-5 left-10 w-[calc(100%-80px)] flex justify-between items-center z-10 max-[480px]:top-2.5 max-[480px]:left-5">
        <img
          src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
          alt="Virgen de la Candelaria"
          className="w-40 h-auto [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.1))]"
        />
      </div>

      <div className="bg-white/90 border border-white/75 p-[42px] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] text-center w-full max-w-[460px] relative z-[5] animate-fadeInUp backdrop-blur-[12px] max-[480px]:w-[88%] max-[480px]:p-[28px_20px]">
        <h2 className="mt-0 mb-[var(--space-5)] text-[1.65rem] font-bold tracking-[-0.02em] text-[var(--color-brand-500)]">
          Restablecer contraseña
        </h2>
        <p className="block mt-0 mb-[18px] text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
          Define una nueva contraseña para tu cuenta.
        </p>

        <form className="flex flex-col w-full" onSubmit={onSubmit}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nueva contraseña"
            className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
            required
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite la nueva contraseña"
            className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
            required
            autoComplete="new-password"
          />

          {message ? <Alert type={type}>{message}</Alert> : null}

          <button
            type="submit"
            className="mt-[var(--space-2)] w-full py-[15px] px-4 rounded-[var(--radius-md)] border-0 cursor-pointer text-white font-semibold tracking-[0.35px] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow,background] duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c93838_0%,var(--color-brand-500)_100%)] hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] active:translate-y-0"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-2">
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)]" to="/recuperar-password">
            Solicitar otro enlace
          </Link>
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)]" to="/login">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 w-full py-[15px] bg-white/90 backdrop-blur-[5px] text-[12px] text-center border-t border-[#eee] z-10 text-[var(--color-text-muted)]">
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}
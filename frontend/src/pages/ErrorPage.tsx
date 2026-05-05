import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

type ErrorPageProps = {
  code?: 403 | 404 | 500;
  title?: string;
  description?: string;
};

const defaults: Record<number, { title: string; description: string; icon: string; color: string }> = {
  403: {
    title: "Acceso denegado",
    description: "No tienes permiso para acceder a esta sección. Si crees que esto es un error, contacta con el administrador.",
    icon: "fa-solid fa-lock",
    color: "#d97706",
  },
  404: {
    title: "Página no encontrada",
    description: "La página que buscas no existe o ha sido eliminada. Comprueba la dirección o vuelve al inicio.",
    icon: "fa-solid fa-map-location-dot",
    color: "#3b82f6",
  },
  500: {
    title: "Error del servidor",
    description: "Se ha producido un error inesperado en el servidor. Por favor, inténtalo de nuevo más tarde.",
    icon: "fa-solid fa-server",
    color: "#b33131",
  },
};

export default function ErrorPage({ code = 404, title, description }: ErrorPageProps) {
  const navigate = useNavigate();
  const meta = defaults[code] ?? defaults[404];

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft,#f8fafc)] flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-[520px] text-center"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl shadow-[0_8px_28px_rgba(0,0,0,0.10)]"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
        >
          <i className={`${meta.icon} text-[32px]`} />
        </motion.div>

        <div
          className="mb-3 inline-block rounded-xl px-4 py-1 text-[13px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          Error {code}
        </div>

        <h1 className="m-0 mb-3 text-[2rem] font-extrabold text-slate-900">
          {title ?? meta.title}
        </h1>

        <p className="m-0 mb-8 text-[15px] text-slate-500 leading-relaxed max-w-[400px] mx-auto">
          {description ?? meta.description}
        </p>

        <div className="flex justify-center gap-3 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-500,#b33131)] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_15px_rgba(179,49,49,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(179,49,49,0.35)]"
            onClick={() => navigate("/inicio")}
          >
            <i className="fa-solid fa-house" /> Ir al inicio
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-6 py-3 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() => navigate(-1)}
          >
            <i className="fa-solid fa-arrow-left" /> Volver atrás
          </button>
        </div>
      </motion.div>
    </div>
  );
}

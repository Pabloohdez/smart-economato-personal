import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

type Props = {
  children: ReactNode;
  resetKey?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : "Se ha producido un error inesperado al cargar la página.",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("[RouteErrorBoundary] Error renderizando ruta", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[420px] flex items-center justify-center p-6">
          <div className="w-full max-w-[560px] rounded-2xl border border-red-100 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)] overflow-hidden text-center">
            <div className="bg-[linear-gradient(135deg,#b33131,#991b1b)] px-8 py-6">
              <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
                <AlertTriangle className="h-7 w-7 text-white" />
              </div>
              <h2 className="m-0 text-[20px] font-bold text-white">Error al cargar la sección</h2>
            </div>
            <div className="p-8">
              <p className="mt-0 mb-4 text-[14px] leading-relaxed text-slate-500">
                Esta sección ha fallado durante el renderizado. Puedes reintentar la carga sin abandonar la aplicación.
              </p>
              {this.state.errorMessage ? (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                  <span className="font-semibold">Detalle:</span> {this.state.errorMessage}
                </div>
              ) : null}
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-[10px] bg-[#b33131] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                  onClick={this.handleRetry}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reintentar carga
                </button>
                <a
                  href="/inicio"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 no-underline shadow-sm transition hover:bg-slate-50"
                >
                  <Home className="h-4 w-4" />
                  Ir al inicio
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
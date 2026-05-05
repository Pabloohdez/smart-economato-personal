// frontend/src/utils/alergenosUtils.ts
import { showConfirm } from "./notifications";
import type { UsuarioActivo } from "../types";

type Prefs = {
  alertas: boolean;
  bloqueo: boolean;
  nuevos?: boolean;
  filtrado?: boolean;
};

type Producto = {
  id?: number | string;
  nombre: string;
  alergenos?: string[];
  stock?: number;
  codigoBarras?: string;
};

const ICONOS_ALERGENOS: Record<string, string> = {
  "Lácteos": "fa-cow",
  "Gluten": "fa-wheat-awn",
  "Huevos": "fa-egg",
  "Pescado": "fa-fish",
  "Crustáceos": "fa-shrimp",
  "Moluscos": "fa-circle",
  "Frutos secos": "fa-seedling",
  "Soja": "fa-leaf",
  "Sulfitos": "fa-wine-bottle",
  "Apio": "fa-carrot",
  "Mostaza": "fa-pepper-hot",
  "Sésamo": "fa-circle-dot",
};

const COLORES_ALERGENOS: Record<string, { bg: string; color: string }> = {
  "Lácteos": { bg: "#e3f2fd", color: "#1976d2" },
  "Gluten": { bg: "#fff8e1", color: "#f57c00" },
  "Huevos": { bg: "#fffde7", color: "#f9a825" },
  "Pescado": { bg: "#e1f5fe", color: "#0277bd" },
  "Crustáceos": { bg: "#fce4ec", color: "#c2185b" },
  "Moluscos": { bg: "#f3e5f5", color: "#7b1fa2" },
  "Frutos secos": { bg: "#efebe9", color: "#5d4037" },
  "Soja": { bg: "#f1f8e9", color: "#558b2f" },
  "Sulfitos": { bg: "#f3e5f5", color: "#8e24aa" },
  "Apio": { bg: "#e8f5e9", color: "#2e7d32" },
  "Mostaza": { bg: "#fff9c4", color: "#f9a825" },
  "Sésamo": { bg: "#ffe0b2", color: "#e65100" },
};

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function obtenerAlergiasUsuario(): string[] {
  const userStr = localStorage.getItem("usuarioActivo");
  if (!userStr) return [];

  const usuario: UsuarioActivo = JSON.parse(userStr);
  const configStr = localStorage.getItem(`alergias_${usuario.id}`);
  if (!configStr) {
    return Array.isArray(usuario.alergias) ? usuario.alergias : [];
  }

  const config = JSON.parse(configStr);
  return config.alergias || [];
}

export function productoTieneAlergenos(producto: Producto): { tiene: boolean; alergenos: string[] } {
  const alergiasUsuario = obtenerAlergiasUsuario();
  if (alergiasUsuario.length === 0) return { tiene: false, alergenos: [] };

  const alergenosProducto = producto.alergenos || [];
  const alergenosEncontrados = alergiasUsuario.filter((alergia) =>
    alergenosProducto.some(
      (alergeno) =>
        normalizar(alergeno).includes(normalizar(alergia)) || normalizar(alergia).includes(normalizar(alergeno))
    )
  );

  return { tiene: alergenosEncontrados.length > 0, alergenos: alergenosEncontrados };
}

export function generarBadgeAlergeno(alergeno: string, esAlerta = false): string {
  const icono = ICONOS_ALERGENOS[alergeno] || "fa-triangle-exclamation";
  const colores = COLORES_ALERGENOS[alergeno] || { bg: "#fff5f5", color: "#c53030" };

  const estilo = esAlerta
    ? `background: #fff5f5; color: #c53030; border: 2px solid #fc8181;`
    : `background: ${colores.bg}; color: ${colores.color};`;

  return `
    <span class="badge-alergeno ${esAlerta ? "badge-alerta" : ""}" 
      style="${estilo} padding: 4px 10px; border-radius: 12px; 
        font-size: 11px; font-weight: 600; display: inline-flex; 
        align-items: center; gap: 5px; margin: 2px;">
      <i class="fa-solid ${icono}"></i>
      ${alergeno}
    </span>
  `;
}

export function generarBadgesProducto(producto: Producto): string {
  if (!producto.alergenos || producto.alergenos.length === 0) return "";

  const verificacion = productoTieneAlergenos(producto);
  return producto.alergenos
    .map((alergeno) => {
      const esAlerta = verificacion.alergenos.includes(alergeno);
      return generarBadgeAlergeno(alergeno, esAlerta);
    })
    .join("");
}

export async function mostrarAlertaAlergenos(producto: Producto): Promise<boolean> {
  const verificacion = productoTieneAlergenos(producto);
  if (!verificacion.tiene) return false;

  const alergenosTexto = verificacion.alergenos.join(", ");
  const confirmar = await showConfirm(
    `⚠️ ALERTA DE ALÉRGENOS ⚠️\n\n` +
      `El producto "${producto.nombre}" contiene:\n` +
      `${alergenosTexto}\n\n` +
      `Tienes alergia registrada a este/estos alérgeno(s).\n\n` +
      `¿Deseas continuar de todos modos?`
  );

  return !confirmar; // true si se bloquea
}

export function verificarPreferencias(): Prefs {
  const userStr = localStorage.getItem("usuarioActivo");
  if (!userStr) return { alertas: true, bloqueo: true };

  const usuario: UsuarioActivo = JSON.parse(userStr);
  const prefStr = localStorage.getItem(`notificaciones_${usuario.id}`);
  if (!prefStr) return { alertas: true, bloqueo: true };

  const pref = JSON.parse(prefStr);
  return {
    alertas: pref.alertasProductos !== false,
    bloqueo: pref.bloqueoDistribucion !== false,
    nuevos: pref.nuevosProductos || false,
    filtrado: pref.filtradoBusqueda || false,
  };
}

export function filtrarListaPorAlergenos<T extends Producto>(listaProductos: T[]): T[] {
  const pref = verificarPreferencias();
  if (!pref.filtrado) return listaProductos;
  return listaProductos.filter((p) => !productoTieneAlergenos(p).tiene);
}
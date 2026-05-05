import { useMemo, useState } from "react";
import type { Producto } from "../services/productosService";

type UseRecepcionSearchProps = {
  productos: Producto[];
};

export function useRecepcionSearch({ productos }: UseRecepcionSearchProps) {
  const [term, setTerm] = useState("");
  const [provFiltro, setProvFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("");

  const resultadosAutocomplete = useMemo(() => {
    const s = term.trim().toLowerCase();

    let list = productos.slice();

    if (provFiltro) {
      list = list.filter(
        (p) => String(p.proveedorId ?? "") === String(provFiltro),
      );
    }

    if (catFiltro) {
      list = list.filter(
        (p) => String(p.categoriaId ?? "") === String(catFiltro),
      );
    }

    if (!s) return list;

    return list.filter((p) => {
      const nombre = String(p.nombre ?? "").toLowerCase();
      const codigoBarras = String((p as any).codigoBarras ?? "").toLowerCase();
      const marca = String((p as any).marca ?? "").toLowerCase();
      const id = String(p.id ?? "").toLowerCase();

      return (
        nombre.includes(s) ||
        codigoBarras.includes(s) ||
        marca.includes(s) ||
        id.includes(s)
      );
    });
  }, [productos, term, provFiltro, catFiltro]);

  return {
    term,
    setTerm,
    provFiltro,
    setProvFiltro,
    catFiltro,
    setCatFiltro,
    resultadosAutocomplete,
  };
}
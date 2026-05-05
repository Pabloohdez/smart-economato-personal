import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { UsuarioActivo } from "../types";
import { getStoredUser } from "../services/sessionService";

type AuthContextType = {
  user: UsuarioActivo | null;
  updateUser: (updated: UsuarioActivo) => void;
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function loadUser(): UsuarioActivo | null {
  const raw = getStoredUser();
  return raw ? (raw as unknown as UsuarioActivo) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioActivo | null>(loadUser);

  const updateUser = useCallback((updated: UsuarioActivo) => {
    localStorage.setItem("usuarioActivo", JSON.stringify(updated));
    setUser(updated);
  }, []);

  const refreshUser = useCallback(() => {
    setUser(loadUser());
  }, []);

  return (
    <AuthContext.Provider value={{ user, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

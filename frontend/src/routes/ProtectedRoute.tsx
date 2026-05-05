import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { hasActiveSession } from "../services/sessionService";

function isLoggedIn(): boolean {
  return hasActiveSession();
}

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

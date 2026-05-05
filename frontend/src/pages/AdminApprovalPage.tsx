import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../services/apiClient";
import { showNotification, showConfirm } from "../utils/notifications";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import UiSelect from "../components/ui/UiSelect";
import { Loader2, CheckCircle2, KeyRound, Mail, Shield, User, XCircle } from "lucide-react";
import { motion } from "framer-motion";

type RequestType = "account_creation" | "password_change";

type PendingRequest = {
  id: number | string;
  token_id?: string;
  request_type: RequestType;
  usuario: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  fecha_creacion?: string;
  status?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string };
  message?: string;
};

type GenericResponse = {
  success?: boolean;
  ok?: boolean;
  message?: string;
};

const ROLE_OPTIONS = [
  { value: "alumno", label: "Alumno" },
  { value: "profesor", label: "Profesor" },
  { value: "usuario", label: "Usuario" },
  { value: "administrador", label: "Administrador" },
] as const;

export default function AdminApprovalPage() {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | string | null>(null);
  const [passwordApplyingToken, setPasswordApplyingToken] = useState<string | null>(null);
  const [roleByUser, setRoleByUser] = useState<Record<string, string>>({});
  const [passwordByToken, setPasswordByToken] = useState<Record<string, string>>({});

  const { data: pendingRequests = [], isLoading, isError, error } = useQuery<PendingRequest[]>({
    queryKey: ["pendingUsers"],
    queryFn: async () => {
      const response = await apiFetch<PendingRequest[] | ApiEnvelope<PendingRequest[]>>("/usuarios/requests", {
        method: "GET",
      });
      if (Array.isArray(response)) return response;
      if (response && typeof response === "object" && Array.isArray((response as ApiEnvelope<PendingRequest[]>).data)) {
        return (response as ApiEnvelope<PendingRequest[]>).data as PendingRequest[];
      }
      return [];
    },
    refetchInterval: 10000,
  });

  const accountRequests = useMemo(
    () => pendingRequests.filter((r) => r.request_type === "account_creation"),
    [pendingRequests],
  );

  const passwordRequests = useMemo(
    () => pendingRequests.filter((r) => r.request_type === "password_change"),
    [pendingRequests],
  );

  const approveMutation = useMutation({
    mutationFn: async ({ userId, rol }: { userId: number | string; rol: string }) => {
      const response = await apiFetch<GenericResponse>(`/usuarios/${userId}/approve`, {
        method: "POST",
        body: JSON.stringify({ rol }),
      });
      return response;
    },
    onSuccess: (data) => {
      setApprovingId(null);
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      showNotification(data?.message || "Cuenta aprobada exitosamente", "success");
    },
    onError: (requestError: any) => {
      setApprovingId(null);
      showNotification(requestError?.message || "Error al aprobar la cuenta", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: number | string) => {
      const response = await apiFetch<GenericResponse>(`/usuarios/${userId}/reject`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data) => {
      setRejectingId(null);
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      showNotification(data?.message || "Solicitud rechazada", "success");
    },
    onError: (requestError: any) => {
      setRejectingId(null);
      showNotification(requestError?.message || "Error al rechazar la solicitud", "error");
    },
  });

  const applyPasswordMutation = useMutation({
    mutationFn: async ({ tokenId, password }: { tokenId: string; password: string }) => {
      const response = await apiFetch<GenericResponse>(`/usuarios/password-change/${tokenId}/apply`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      return response;
    },
    onSuccess: (data, vars) => {
      setPasswordApplyingToken(null);
      setPasswordByToken((prev) => ({ ...prev, [vars.tokenId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      showNotification(data?.message || "Contraseña actualizada correctamente", "success");
    },
    onError: (requestError: any) => {
      setPasswordApplyingToken(null);
      showNotification(requestError?.message || "Error al cambiar la contraseña", "error");
    },
  });

  const rejectPasswordMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const response = await apiFetch<GenericResponse>(`/usuarios/password-change/${tokenId}/reject`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      showNotification(data?.message || "Solicitud de cambio de contraseña rechazada", "success");
    },
    onError: (requestError: any) => {
      showNotification(requestError?.message || "Error al rechazar la solicitud", "error");
    },
  });

  async function handleApprove(userId: number | string) {
    const id = String(userId);
    const rol = roleByUser[id] || "alumno";
    setApprovingId(userId);
    await approveMutation.mutateAsync({ userId, rol });
  }

  async function handleReject(userId: number | string) {
    const confirmResult = await showConfirm("¿Estás seguro de que deseas rechazar esta solicitud?");
    if (!confirmResult) return;

    setRejectingId(userId);
    await rejectMutation.mutateAsync(userId);
  }

  async function handleApplyPassword(tokenId: string) {
    const password = String(passwordByToken[tokenId] ?? "").trim();
    if (password.length < 8) {
      showNotification("La nueva contraseña debe tener al menos 8 caracteres.", "warning");
      return;
    }

    const confirmResult = await showConfirm({
      title: "Aplicar cambio de contraseña",
      message: "Se actualizará la contraseña del usuario con este valor. ¿Continuar?",
      confirmLabel: "Sí, actualizar",
    });
    if (!confirmResult) return;

    setPasswordApplyingToken(tokenId);
    await applyPasswordMutation.mutateAsync({ tokenId, password });
  }

  async function handleRejectPassword(tokenId: string) {
    const confirmResult = await showConfirm("¿Rechazar esta solicitud de cambio de contraseña?");
    if (!confirmResult) return;
    await rejectPasswordMutation.mutateAsync(tokenId);
  }

  return (
    <StaggerPage>
        {/* ── Header ─────────────────────────────────────────────── */}
        <StaggerItem className="mb-[30px] pb-5 border-b-2 border-[var(--color-border-default)]">
          <h1 className="m-0 mb-2 flex items-center gap-3 text-[28px] font-bold text-primary">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </span>
            Solicitudes
          </h1>
          <p className="m-0 text-[14px] text-[var(--color-text-muted)]">
            Gestiona altas de cuentas y cambios de contraseña pendientes
          </p>
        </StaggerItem>

        {isLoading ? (
          <StaggerItem>
            <div className="flex items-center justify-center min-h-[320px]">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          </StaggerItem>
        ) : isError ? (
          <StaggerItem>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error instanceof Error ? error.message : "Error al cargar las solicitudes"}</p>
            </div>
          </StaggerItem>
        ) : (
          <div className="space-y-8">

            {/* ── Solicitudes de alta ───────────────────────────────── */}
            <StaggerItem>
              <div className="flex items-center gap-2 text-slate-900 mb-4">
                <User className="h-5 w-5 text-brand-500" />
                <h2 className="text-[17px] font-bold m-0">Solicitudes de alta ({accountRequests.length})</h2>
              </div>
            </StaggerItem>

            {accountRequests.length === 0 ? (
              <StaggerItem>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3.5 text-[13px] text-blue-800">
                  No hay altas pendientes.
                </div>
              </StaggerItem>
            ) : (
              <div className="grid gap-3">
                {accountRequests.map((user, index) => {
                  const userId = String(user.id);
                  const selectedRole = roleByUser[userId] ?? "alumno";
                  return (
                    <StaggerItem key={`account-${user.id}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.10)] hover:shadow-[0_22px_52px_rgba(15,23,42,0.15)] transition-shadow"
                      >
                        {/* Info row */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="text-[12px] text-slate-500 mr-1">Usuario:</span>
                            <span className="text-[13px] font-semibold text-slate-800 truncate">{user.usuario}</span>
                          </div>
                          <div className="text-[13px] text-slate-700">
                            <span className="text-[12px] text-slate-500 mr-1">Nombre:</span>
                            {user.nombre} {user.apellidos}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="text-[13px] text-slate-700 truncate">{user.email}</span>
                          </div>
                          {user.telefono ? (
                            <div className="text-[13px] text-slate-600">{user.telefono}</div>
                          ) : null}
                        </div>

                        {/* Role selector + actions */}
                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                              Asignar rol:
                            </label>
                            <UiSelect
                              value={selectedRole}
                              searchable={false}
                              className="w-[160px]"
                              triggerClassName="h-9 min-h-9 rounded-xl border-slate-200 bg-[#f6f8fb] px-3 py-1 text-[13px] font-medium shadow-none"
                              contentClassName="rounded-xl"
                              onChange={(event) => {
                                const next = event;
                                setRoleByUser((prev) => ({ ...prev, [userId]: next }));
                              }}
                              options={ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                            />
                          </div>

                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => void handleReject(user.id)}
                              disabled={rejectingId === user.id || approvingId === user.id}
                              className="inline-flex items-center gap-1.5 rounded-xl border-0 bg-[#b33131] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#96281b] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {rejectingId === user.id ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Rechazando...</>
                              ) : (
                                <><XCircle className="w-3.5 h-3.5" />Rechazar</>
                              )}
                            </button>
                            <button
                              onClick={() => void handleApprove(user.id)}
                              disabled={approvingId === user.id || rejectingId === user.id}
                              className="inline-flex items-center gap-1.5 rounded-xl border-0 bg-[#276749] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1d4e35] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {approvingId === user.id ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Aprobando...</>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5" />Aprobar</>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </div>
            )}

            {/* ── Solicitudes de contraseña ─────────────────────────── */}
            <StaggerItem>
              <div className="flex items-center gap-2 text-slate-900 mb-4 mt-2">
                <KeyRound className="h-5 w-5 text-brand-500" />
                <h2 className="text-[17px] font-bold m-0">Cambios de contraseña ({passwordRequests.length})</h2>
              </div>
            </StaggerItem>

            {passwordRequests.length === 0 ? (
              <StaggerItem>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3.5 text-[13px] text-blue-800">
                  No hay solicitudes de cambio pendientes.
                </div>
              </StaggerItem>
            ) : (
              <div className="grid gap-3">
                {passwordRequests.map((request, index) => {
                  const tokenId = String(request.token_id ?? "");
                  const nextPassword = passwordByToken[tokenId] ?? "";
                  return (
                    <StaggerItem key={`pwd-${tokenId || request.id}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.10)] hover:shadow-[0_22px_52px_rgba(15,23,42,0.15)] transition-shadow"
                      >
                        {/* Info row */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="text-[12px] text-slate-500 mr-1">Usuario:</span>
                            <span className="text-[13px] font-semibold text-slate-800">{request.usuario}</span>
                          </div>
                          <div className="text-[13px] text-slate-700">
                            {request.nombre} {request.apellidos}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="text-[13px] text-slate-700 truncate">{request.email}</span>
                          </div>
                        </div>

                        {/* Password input + actions */}
                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                              Nueva contraseña:
                            </label>
                            <input
                              type="password"
                              value={nextPassword}
                              onChange={(event) => {
                                const value = event.target.value;
                                setPasswordByToken((prev) => ({ ...prev, [tokenId]: value }));
                              }}
                              placeholder="Mínimo 8 caracteres"
                              className="h-9 flex-1 rounded-xl border border-slate-200 bg-[#f6f8fb] px-3 text-[13px] text-slate-700 outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 min-w-[140px]"
                            />
                          </div>

                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => void handleRejectPassword(tokenId)}
                              disabled={rejectPasswordMutation.isPending || passwordApplyingToken === tokenId}
                              className="inline-flex items-center gap-1.5 rounded-xl border-0 bg-[#b33131] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#96281b] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Rechazar
                            </button>
                            <button
                              onClick={() => void handleApplyPassword(tokenId)}
                              disabled={passwordApplyingToken === tokenId}
                              className="inline-flex items-center gap-1.5 rounded-xl border-0 bg-[#276749] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1d4e35] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {passwordApplyingToken === tokenId ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Actualizando...</>
                              ) : (
                                <><KeyRound className="w-3.5 h-3.5" />Aplicar</>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </StaggerPage>
  );
}

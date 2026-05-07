const USER_KEY = "usuarioActivo";
const TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const LAST_ACTIVITY_KEY = "lastActivityAt";

// 10 minutos de inactividad → cerrar sesión.
export const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

export type SessionUser = Record<string, unknown>;

function storage() {
  // sessionStorage se borra al cerrar el navegador (cumple el requisito).
  return sessionStorage;
}

export function saveSession(token: string, user: SessionUser, refreshToken?: string) {
  storage().setItem(TOKEN_KEY, token);
  storage().setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) {
    storage().setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    storage().removeItem(REFRESH_TOKEN_KEY);
  }
  touchActivity();
}

export function clearSession() {
  storage().removeItem(TOKEN_KEY);
  storage().removeItem(USER_KEY);
  storage().removeItem(REFRESH_TOKEN_KEY);
  storage().removeItem(LAST_ACTIVITY_KEY);
}

export function getToken() {
  return storage().getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return storage().getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  const raw = storage().getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: SessionUser) {
  storage().setItem(USER_KEY, JSON.stringify(user));
  touchActivity();
}

export function hasActiveSession() {
  return Boolean(getToken() && getStoredUser());
}

export function touchActivity(now = Date.now()) {
  storage().setItem(LAST_ACTIVITY_KEY, String(now));
}

export function getLastActivityAt(): number | null {
  const raw = storage().getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

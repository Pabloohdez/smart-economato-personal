import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock, saveSessionMock, clearSessionMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  saveSessionMock: vi.fn(),
  clearSessionMock: vi.fn(),
}));

vi.mock("./apiClient", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("./sessionService", () => ({
  saveSession: saveSessionMock,
  clearSession: clearSessionMock,
}));

import { login, logout } from "./authService";

describe("authService", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    saveSessionMock.mockReset();
    clearSessionMock.mockReset();
  });

  it("guarda la sesión cuando el login devuelve token y usuario", async () => {
    const user = { id: 1, nombre: "Admin" };
    apiFetchMock.mockResolvedValue({
      success: true,
      data: { token: "jwt-token", refreshToken: "refresh-token", user },
    });

    const result = await login("admin", "secreto");

    expect(result).toEqual(user);
    expect(saveSessionMock).toHaveBeenCalledWith("jwt-token", user, "refresh-token");
    expect(clearSessionMock).not.toHaveBeenCalled();
  });

  it("limpia la sesión y lanza error si el login falla", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));

    await expect(login("admin", "incorrecta")).rejects.toThrow("boom");
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
    expect(saveSessionMock).not.toHaveBeenCalled();
  });

  it("logout limpia la sesión", () => {
    logout();

    expect(clearSessionMock).toHaveBeenCalledTimes(1);
  });
});
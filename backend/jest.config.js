module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  // Unit tests only. E2E tests run with `npm run test:e2e`.
  testRegex: [".*\\.spec\\.ts$"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  // Cobertura enfocada en módulos core (lógica). Controllers/DTOs se validan con e2e.
  collectCoverageFrom: [
    // Core crítico con pruebas unitarias (y e2e para flujos).
    "src/auth/auth.service.ts",
    "src/login/login.service.ts",
    "src/movimientos/movimientos.service.ts",
    "src/realtime/realtime.service.ts",
    "src/common/http-exception.filter.ts",
    "!src/main.ts",
    "!src/**/*.module.ts",
    "!src/**/*.controller.ts",
    "!src/**/dto/**/*.ts",
    "!src/**/database/schema.ts",
  ],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 60,
      statements: 70,
      branches: 55,
    },
  },
  testEnvironment: "node",
};
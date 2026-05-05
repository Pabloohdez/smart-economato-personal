# Memoria técnica — Smart Economato

> **Entrega académica**: documento formal con **índice**, **figuras/capturas**, **citas**, **anexos** y **trazabilidad** (repo/commits/CI/tests).

## Índice

1. Resumen ejecutivo  
2. Definición del problema y alcance  
3. Investigación / fuentes (citas)  
4. Decisiones técnicas (ADRs)  
5. Arquitectura y diseño (diagramas)  
6. Modelo de dominio y datos  
7. API / contratos  
8. Seguridad (auth/roles)  
9. Calidad: pruebas, cobertura y CI  
10. Infraestructura: despliegue y HTTPS  
11. Observabilidad (logs/auditoría)  
12. Viabilidad real (mantenimiento, costes, escalabilidad)  
13. Limitaciones y trabajo futuro  
14. Anexos (evidencias)

---

## 1. Resumen ejecutivo

Aplicación web para gestionar inventario, pedidos, bajas, recepción, distribución, auditoría y avisos del economato.

## 2. Definición del problema y alcance

- **Actores**: administrador, personal que registra stock/pedidos/bajas.
- **Procesos**: inventario, pedidos→recepción, bajas, alertas, auditoría.
- **Alcance**: aplicación web full-stack + DB remota (Supabase).

## 3. Investigación / fuentes (citas)

Listado de fuentes y comparación de alternativas en:
- `docs/REFERENCIAS.md`

## 4. Decisiones técnicas (ADRs)

Decisiones con alternativas y criterios en:
- `docs/adr/`

## 5. Arquitectura y diseño (diagramas)

- Análisis detallado: `docs/ANALISIS_ARQUITECTURA.md`
- Diagramas: `docs/DIAGRAMAS.md`

## 6. Modelo de dominio y datos

Completar con entidades y reglas (y diagrama ER si procede).

## 7. API / contratos

- Especificación: `docs/API_DOCUMENTATION.md`

## 8. Seguridad (auth/roles)

Describir:
- autenticación JWT, expiración/refresh (si aplica),
- roles/permisos por caso de uso,
- validaciones backend (DTOs/class-validator).

## 9. Calidad: pruebas, cobertura y CI

- Guía: `docs/TESTING_CI.md`
- Evidencias a adjuntar en anexos:
  - captura de CI en verde
  - salida de `npm run test:coverage` (frontend y backend)
  - salida de `npm run test:e2e` (backend)

## 10. Infraestructura: despliegue y HTTPS

- `docs/DEPLOYMENT_HTTPS.md`

## 11. Observabilidad (logs/auditoría)

- Auditoría funcional: logs de acciones (según endpoints/páginas).
- Logs técnicos: trazabilidad de errores (ver anexos y ejemplo de logs).

## 12. Viabilidad real (mantenimiento, costes, escalabilidad)

Incluir:
- costes (hosting, dominio, correo),
- mantenimiento (rotación secretos, backups, actualización deps),
- escalabilidad (caché, paginación, límites).

## 13. Limitaciones y trabajo futuro

- Aumentar e2e con flujos completos: pedido→recepción, inventario→lotes, avisos.
- Modelo de permisos más fino por casos de uso.
- Observabilidad avanzada (dashboards/alerting).

## 14. Anexos (evidencias)

Checklist de evidencias:
- **A1** Capturas responsive (móvil/tablet/desktop)
- **A2** Export/import CSV/XLSX (capturas)
- **A3** Seguridad (login, roles) (capturas)
- **A4** CI en verde (captura)
- **A5** Tests + coverage (capturas/salidas)
- **A6** Despliegue/HTTPS (config o capturas)


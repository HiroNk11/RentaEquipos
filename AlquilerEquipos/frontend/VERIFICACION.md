# Verificación del frontend

Este informe registra la primera sesión de frontend. La integración posterior con SQL Server real y cuenta Windows se documenta en [VERIFICACION-LOCAL.md](../../VERIFICACION-LOCAL.md).

Fecha: 1 de noviembre de 2026. Entorno local Windows, Node 24.22.1, Vite 8.3.5 y Microsoft Edge en modo headless.

## Resultado

| Comprobación | Resultado |
| --- | --- |
| Instalación limpia con `npm ci` en directorio aislado | Correcta, 69 paquetes |
| Compilación de producción con TypeScript estricto | Correcta |
| `npm run lint` | Sin diagnósticos |
| Reglas del modo de demostración | 16 pruebas aprobadas |
| Navegador: demostración, HTTP y OIDC simulado | 19 pruebas aprobadas |
| `npm audit --audit-level=moderate` | 0 vulnerabilidades conocidas al verificar |
| Revisión visual en escritorio y celular | Realizada con capturas |

Las pruebas de navegador se ejecutaron con configuración regional `es-AR` y zona horaria `America/Argentina/Buenos_Aires`. Se revisaron anchos de 320, 390, 768, 1440 y 1920 píxeles. Las tablas extensas desplazan su contenido dentro de su propia región; no desbordan la página.

Los nueve recorridos de demostración se repitieron dos veces en la comprobación final: 18 ejecuciones adicionales aprobadas. La captura `docs/resumen-demo.png` muestra el resumen con datos ficticios.

## Cobertura

- Inventario: búsqueda, vista de lista/tarjetas, creación, edición y eliminación.
- Clientes: alta, selección para reserva y visualización del historial.
- Disponibilidad: fechas locales convertidas a UTC, exclusión de mantenimiento y conflictos, límites de paginación explícitos.
- Reservas: alta, cancelación, retiro y devolución con mantenimiento.
- Reglas de demostración: períodos adyacentes, solapamientos parciales/totales, importes con centavos, transiciones e idempotencia.
- API interceptada: contratos de consulta y POST, 401/403/409/503, conservación del formulario al fallar y ausencia de reintentos automáticos de escrituras.
- Separación entre API y demostración, sin reemplazo silencioso de datos ante fallos.
- OIDC simulado: Authorization Code + PKCE, ausencia de client secret, cabecera Bearer, retorno a la pantalla original, cierre de sesión y permisos visuales de Consulta/Operador/Administrador.
- Comprobación de que el access token no se escribe en localStorage ni sessionStorage.
- Accesibilidad automatizada con axe en las cinco vistas y el formulario de reserva; navegación móvil con foco contenido, Escape y restauración del foco.

## Límites

Los contratos HTTP y el proveedor OIDC de las pruebas están simulados mediante Playwright. **No se validó en esta hora una operación real contra SQL Server ni un proveedor de identidad real.** Tampoco se certifican accesibilidad completa, funcionamiento con lectores de pantalla, Safari o dispositivos físicos. La API sigue siendo responsable de validar JWT, permisos y concurrencia.

El entorno restringido de Windows requirió detener explícitamente los procesos Vite de pruebas para completar su cierre. Las 19 pruebas finalizaron con código 0. Esto no afecta al servidor de previsualización del usuario. El workflow de GitHub quedó definido, pero no se ejecutó remotamente porque no se publicó el repositorio.

La auditoría es una fotografía de las advertencias disponibles en esa fecha, no una garantía de ausencia de problemas futuros. Se actualizaron dependencias compatibles y el lockfile.

No hubo `git push`, despliegue, migraciones ni cambios en React Native durante este trabajo de frontend.

## Repetir

```powershell
npm ci
npm run build
npm run lint
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=moderate
```

En Windows se puede usar Edge instalado con `$env:PLAYWRIGHT_CHANNEL = "msedge"`. Playwright inicia servidores aislados en 5174 (demo), 5175 (API interceptada) y 5176 (OIDC simulado). Esos puertos deben estar libres.

Para reutilizar servidores iniciados manualmente, definir `PLAYWRIGHT_BASE_URL` para demo; `PLAYWRIGHT_API_BASE_URL` y `PLAYWRIGHT_AUTH_BASE_URL` permiten seleccionar sus URLs respectivas. El proveedor simulado usa por defecto el origen fijo `http://127.0.0.1:5176`; cambiar ese origen requiere adaptar también el fixture y sus variables OIDC.

## Recursos

El atlas ilustrativo de herramientas se generó con la herramienta integrada de imágenes y se optimizó a `public/images/equipos-demo.webp` (1536 × 1024, 121.230 bytes). Se utiliza exclusivamente en demostración. El prompt y su procedencia se describen en el README.

Las fuentes se sirven localmente. `npm run build` genera `public/THIRD_PARTY_NOTICES.txt` con textos de licencias disponibles y metadatos de 39 dependencias de ejecución; Vite lo incluye en `dist/`.

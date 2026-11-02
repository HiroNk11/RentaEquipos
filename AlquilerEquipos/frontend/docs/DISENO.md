# Criterios de interfaz

## Sistema visual

`src/tokens.css` concentra colores semánticos, tipografía, tamaños, espaciado,
radios, sombras, duración de transiciones y altura de controles. La interfaz usa
un tema claro explícito; no hay un modo oscuro parcial dependiente del navegador.
Las variantes de estado combinan texto y color, sin depender únicamente del color.

## Carga y resultados

- `PageSkeleton` conserva la composición de cada ruta mientras se cargan los datos.
- La consulta de disponibilidad muestra equipos de esqueleto; el selector del
  formulario tiene su propio esqueleto mientras verifica las fechas.
- Los esqueletos no exponen contenido ficticio al lector de pantalla: una región
  de estado anuncia la carga, con `aria-busy` y decoración oculta.
- Los envíos mantienen controles deshabilitados y feedback de progreso. No se
  reemplazan datos ingresados por esqueletos ni se anuncia éxito antes de confirmar.
- Las búsquedas sin coincidencias ofrecen limpiar filtros; los directorios sin
  registros ofrecen el alta correspondiente, respetando los permisos del usuario.
- Un error de disponibilidad no muestra simultáneamente el mensaje inicial vacío.
  La consulta puede repetirse conservando las fechas.

## Adaptación

- Hasta 740 px: inventario en filas con imagen lateral; reservas, equipos en vista
  lista y clientes en filas etiquetadas, sin exigir desplazamiento horizontal.
- Hasta 1024 px: navegación desplegable con foco contenido y cierre con Escape;
  el contenido utiliza el ancho disponible en tablet y las filas de datos se
  reorganizan con etiquetas en una cuadrícula de cuatro columnas.
- En escritorio: navegación persistente, tablas para comparación y cuadrículas
  más amplias. Las acciones principales se mantienen junto al título.
- Los campos móviles usan 16 px para evitar zoom automático al escribir.
- Los controles de icono y las acciones principales tienen objetivos de 44 px.

## Accesibilidad e interacción

- Foco visible, nombres accesibles, encabezados de tabla conservados y alternativas
  para las imágenes o fotografías ausentes.
- Cerrar un modal devuelve el foco al disparador original; si desapareció, al
  contenido principal. Cambiar entre formularios mantiene ese disparador original.
- Estados hover, focus, active, disabled e inválido definidos para los controles.
- `prefers-reduced-motion` desactiva las animaciones y transiciones perceptibles.
- Avisos de éxito y error accesibles, con cierre manual.

## Comprobación

`tests/design.spec.ts` recorre las cinco vistas a 320, 390, 768, 1024, 1440 y
1920 px y ejecuta axe en móvil, tablet y escritorio. `tests/api.spec.ts` retiene
respuestas HTTP para comprobar esqueletos y recuperación ante errores. Estas
pruebas utilizan demostración o respuestas interceptadas y no escriben en la
base real. Las capturas se generan en `test-results/` (ignorado por Git).

Las comprobaciones automáticas no sustituyen una evaluación manual con lectores
de pantalla ni constituyen una certificación de accesibilidad.

### Verificación del 2 de noviembre de 2026

- Compilación TypeScript/Vite y lint sin errores.
- 16 pruebas unitarias y suite completa de 28 pruebas Playwright aprobadas.
- Revisión visual de capturas de esqueletos, móvil, tablet y escritorio.
- Tras ajustar las tablas de tablet, se repitieron los 12 casos de diseño y
  operaciones: sus comprobaciones aprobaron.
- 10 comprobaciones adicionales sobre la instalación publicada, con acceso
  Windows y SQL Server reales, en modo de solo lectura.
- Instalación local actualizada en `http://localhost:5280`, con respaldo SQL
  previo, la misma cuenta autorizada y el mismo inicio manual.

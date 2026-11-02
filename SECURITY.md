# Seguridad de AlquilerEquipos

Esta API esta orientada al personal del negocio. Cliente es una entidad comercial, no una cuenta de acceso.

## Autenticacion y permisos

La alternativa `Authentication:Mode=WindowsLocal` se admite solo en Windows y Development, con escucha forzada en localhost, cuentas explicitamente habilitadas, sin acceso anonimo ni proxy. Usa Negotiate del sistema operativo y las mismas politicas de negocio. La web compilada se sirve desde el mismo origen; las escrituras requieren Origin coincidente y se rechazan solicitudes API de sitios ajenos. No es una modalidad para Internet.

En WindowsLocal no se emiten JWT ni se guardan contrasenas. Ocultar datos no cierra la sesion Windows; proteger la PC mediante el bloqueo del sistema operativo. La instalacion personal usa los permisos SQL de la cuenta Windows, no una identidad tecnica restringida. Ver [USO-LOCAL.md](USO-LOCAL.md).

Los endpoints de equipos, clientes y reservas requieren JWT por defecto. Se validan firma, emisor, audiencia, vencimiento y algoritmo. No hay endpoint para emitir tokens ni implementacion de Identity o registro de usuarios.

Fuera de Development se requiere un proveedor OIDC HTTPS mediante Authentication:Authority y Authentication:Audience. Se admiten firmas RS256 y ES256. El proveedor debe emitir un sub no vacio y el claim de rol configurado en Authentication:RoleClaimType (por defecto role).

| Rol | Permisos |
| --- | --- |
| Consulta | Consultar equipos, disponibilidad, clientes y reservas |
| Operador | Consultar, crear y actualizar; cancelar, activar y devolver reservas |
| Administrador | Lo anterior y eliminar equipos/clientes sin historial que impida el borrado |

Estos roles son para operadores internos. Una futura aplicacion de autoservicio para clientes necesitara autorizacion por propietario del recurso; no se debe asignar estos roles a clientes finales.

Solo en Development se admite una firma HS256 con Issuer, Audience y SigningKey de al menos 64 bytes. El modo Authentication:AllowAnonymousDevelopment=true desactiva deliberadamente estas restricciones para pruebas locales y produce un aviso. Nunca se admite fuera de Development.

## Transporte y despliegue

- Configurar hosts y origenes CORS explicitos. CORS no reemplaza autenticacion.
- Fuera de Development se exige HTTPS para los recursos, excepto la sonda minima /health/live.
- Si un proxy termina TLS, configurar su IP en ReverseProxy:KnownProxies. No se confia en encabezados reenviados de remitentes arbitrarios.
- Mantener el puerto interno de la API accesible solo al proxy o a la red operativa.
- SQL fuera de Development requiere cifrado y validacion del certificado. TrustServerCertificate no debe activarse en ese entorno.
- Swagger solo se habilita en Development.

## Limites y errores

La API limita el cuerpo a 64 KiB, las paginas a 100 elementos y las solicitudes de negocio a 120 por minuto por IP. El proxy debe aportar limites de conexion y capacidad adecuados al despliegue. Liveness queda fuera del limite para no provocar reinicios por trafico de negocio.

Los errores usan Problem Details con traceId. Las respuestas inesperadas no incluyen consultas, credenciales ni stack traces. Los logs se escriben como JSON por consola; configurar su almacenamiento, acceso y retencion en el entorno.

## Secretos y datos

Usar User Secrets en desarrollo o el gestor de secretos del entorno. No guardar claves JWT, tokens, contrasenas SQL, certificados privados, bases, respaldos ni datos personales en Git. El frontend no debe recibir claves de firma ni secretos de clientes OIDC.

El modo de desarrollo sin autenticacion solo debe usarse sobre datos ficticios y en una interfaz local. La configuracion de escucha predeterminada es loopback.

## Alcance de validacion

Las comprobaciones HTTP y de reglas pueden ejecutarse sin SQL. La persistencia, migraciones y bloqueo concurrente deben verificarse con tests/SqlIntegration en una instancia exclusiva de pruebas. Un workflow definido no implica que su ejecucion haya aprobado.

Este repositorio no constituye una certificacion de seguridad ni un despliegue listo para Internet. El proveedor de identidad, certificados, firewall, monitoreo, respaldo y restauracion requieren configuracion y validacion del operador.

## Reportar un problema

Contactar al mantenedor mediante el enlace profesional del perfil de GitHub. No publicar credenciales, tokens ni datos de clientes en issues. Ante una credencial expuesta, revocarla en su proveedor antes de limpiar el historial.

# Pruebas del backend

## Validacion local

Desde la raiz, con SDK .NET 10.0.403 y Python 3.10+:

```powershell
./scripts/Validar-Backend.ps1
```

El script se detiene ante cualquier comando fallido. Usa restore con versiones bloqueadas y auditoria de dependencias transitivas, compila en Release y ejecuta las comprobaciones de reglas y HTTP.

Parametros utiles:

- -Configuration Debug para compilar Debug.
- -Dotnet y -Python para indicar ejecutables concretos.
- -NuGetConfig para un feed corporativo o configuracion local.
- -SkipRestore solo si ya se restauro y audito esa misma version.
- -Sql para ejecutar ademas la integracion con una instancia SQL exclusiva de pruebas.

Sin -Sql se informa expresamente que la integracion SQL no se ejecuto.

## Reglas sin servidor SQL

tests/ReservasChecks verifica:

- Solapamiento total, parcial y contenido; periodos contiguos.
- Estados que bloquean y estados que no bloquean.
- Fechas invalidas, paginacion y datos de contacto.
- Traduccion de disponibilidad a SQL y modelo sincronizado con migraciones.
- Retiro dentro del periodo, cancelacion y devolucion.
- Estados fisicos de equipo y reintentos idempotentes.
- Rechazo de transiciones invalidas sin modificar el estado.

La verificacion de traduccion no abre una conexion y no demuestra el comportamiento de los bloqueos SQL.

## HTTP y seguridad

tests/security_http.py inicia procesos temporales de la API y los termina al finalizar. Usa una clave JWT aleatoria solo en memoria y una conexion deliberadamente inaccesible; no necesita una base de datos.

Comprueba tokens invalidos, vencimiento, firma adulterada, emisor, audiencia, subject, permisos por rol, validacion de entradas, paginacion, limites, errores sin detalles internos, CORS, Swagger y sondeos.

Tambien verifica que Production rechace configuraciones anonimas y claves de desarrollo, que el trafico HTTP de negocio se rechace y que solo un proxy configurado pueda afirmar HTTPS. La prueba de proxy simula sus encabezados en loopback; no sustituye una prueba TLS con certificados reales.

El script smoke_api.py comprueba el contrato HTTP de equipos, clientes y reservas sobre una instancia ya iniciada. Para una API autenticada toma el token de ALQUILER_TEST_TOKEN, sin imprimirlo.

## Integracion SQL

Preparar una instancia exclusiva de pruebas, con un usuario que pueda crear bases temporales. Configurar la conexion mediante el entorno del proceso, sin guardarla en Git:

```powershell
# ALQUILER_SQL_TEST_CONNECTION debe estar configurada con la instancia de pruebas.
./scripts/Validar-Backend.ps1 -Sql
```

El runner reemplaza el catalogo por AlquilerEquiposTests_ seguido de un identificador aleatorio. Aplica migraciones, crea datos ficticios y elimina solo la base que creo. No usa el catalogo recibido como destino de las pruebas.

Incluye reservas concurrentes desde contextos independientes: debe persistirse exactamente una de doce solicitudes para el mismo equipo y periodo. Tambien verifica cancelacion, disponibilidad, mantenimiento, retiro, devolucion, clientes y permisos efectivos del rol SQL de ejecucion.

No ejecutar con la cuenta operativa de produccion ni sobre una instancia que no este destinada a pruebas.

## CI

.github/workflows/backend.yml prepara .NET 10 y Python. Un job verifica compilacion, reglas, HTTP e imagen Docker. Otro inicia SQL Server en un contenedor temporal con una clave generada durante la ejecucion y prueba persistencia y concurrencia.

Consultar la ejecucion real en Actions. La existencia del workflow, un build correcto o la compilacion del runner no equivalen a una integracion SQL aprobada.


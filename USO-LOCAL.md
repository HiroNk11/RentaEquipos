# Uso Local de RentaEquipos

La instalación local usa SQL Server Express y tu cuenta de Windows. La web compilada y la API se sirven juntas en **http://localhost:5280**. No es la demostración de Vite ni un sitio publicado en Internet.

## Abrir y Cerrar

Desde la carpeta del repositorio:

```powershell
./scripts/Iniciar-Local.ps1 -OpenBrowser
./scripts/Estado-Local.ps1
./scripts/Detener-Local.ps1
```

También podés abrir `Abrir-RentaEquipos.cmd` o `Detener-RentaEquipos.cmd` con doble clic. El inicio comprueba el proceso, la cuenta Windows y el acceso SQL antes de anunciar disponibilidad. Una segunda ejecución reutiliza la instancia existente.

**Detener la aplicación no borra datos.** No se instaló servicio, tarea programada ni inicio automático, según tu preferencia. Después de reiniciar Windows, ejecutá nuevamente el inicio manual.

## Primeros Registros

La base `RentaEquiposLocal` comienza sin equipos, clientes ni reservas ficticias. En el resumen se puede agregar el primer equipo y registrar el primer cliente. Luego queda habilitada la nueva reserva.

El período inicial empieza en el minuto actual para permitir retiro inmediato. El importe se acuerda manualmente; no hay cálculo de tarifas, cobros ni penalizaciones automáticas. La devolución puede dejar el equipo disponible o en mantenimiento.

El modo **Demostración** sigue siendo opcional y está identificado con una etiqueta visible. Sus cambios no se guardan en SQL. Para operar el negocio debe figurar la conexión API y tu cuenta Windows, sin la etiqueta de demostración.

## Acceso

- Usar Edge o Chrome desde la cuenta Windows habilitada. Si aparece un diálogo nativo, corresponde al sistema operativo: no hay formulario propio que guarde tu contraseña.
- Solo se admite la cuenta configurada durante la preparación, con rol Administrador. El backend admite listas explícitas de cuentas y roles para una configuración posterior.
- No se escriben contraseñas Windows, access tokens ni claves de firma en el navegador.
- **Ocultar datos** limpia la sesión en memoria de la interfaz; no cierra la sesión de Windows. Recargar puede volver a autenticar mediante SSO. Para impedir acceso físico a la PC, bloquear la sesión de Windows.
- La API escucha únicamente en loopback y rechaza orígenes ajenos y escrituras sin Origin. No usar un proxy, túnel público ni cambiarlo a `0.0.0.0`.

Se utiliza [autenticación Windows de ASP.NET Core](https://learn.microsoft.com/aspnet/core/security/authentication/windowsauth?view=aspnetcore-8.0). El acceso local se realiza por HTTP en loopback; no es una configuración de transporte para redes o Internet.

## Respaldos

```powershell
./scripts/Respaldar-Local.ps1
./scripts/Respaldar-Local.ps1 -EnsayarRestauracion
```

El primer comando crea un archivo nuevo con `COPY_ONLY` y checksum, y ejecuta `RESTORE VERIFYONLY`. La ruta se informa al terminar y pertenece a la carpeta de respaldos de SQL Server, no al repositorio.

El segundo, además, restaura ese respaldo en una base temporal con nombre generado, ejecuta `DBCC CHECKDB`, lee equipos/clientes/reservas y elimina **solo esa base temporal**. No sustituye ni modifica la base de uso diario. Se admite un archivo de datos y uno de log, como en esta instalación.

Conservar copias protegidas fuera de la PC y definir su frecuencia y retención según el uso. No se sincronizan automáticamente con la nube ni se eliminan respaldos antiguos. Pueden contener datos personales; no subirlos a GitHub.

## Preparar o Actualizar

Requisitos: Windows, PowerShell 7 con una política que permita estos scripts locales, SDK .NET 10.0.403 o posterior de .NET 10 indicado por `global.json`, runtime 10.0.14 o posterior, Node 24 y SQL Server local con permisos para crear/migrar/respaldar la base. Detener primero la aplicación y cualquier Vite que mantenga bloqueado `node_modules`. Los archivos de doble clic utilizan el shell registrado al preparar; no cambian ExecutionPolicy ni usan Bypass.

```powershell
./scripts/Detener-Local.ps1
./scripts/Preparar-Local.ps1 -SqlServer 'localhost\SQLEXPRESS'
./scripts/Iniciar-Local.ps1 -OpenBrowser
```

La preparación restaura dependencias bloqueadas, compila backend y frontend, respalda cualquier base existente antes de migrar y publica en un directorio de versión nuevo. No elimina versiones anteriores ni cambia automáticamente una instalación a otra base. `settings.previous.json` conserva la descripción de la versión anterior; volver a binarios anteriores no revierte migraciones.

`-Dotnet` y `-Node` permiten indicar ejecutables fuera de PATH. Una instalación preparada reutiliza sus rutas registradas si no se proporcionan otras. `-Port` selecciona otro puerto local. `-SkipInstall` omite `npm ci` únicamente cuando las dependencias ya están instaladas y verificadas.

La configuración, procesos y logs quedan en `artifacts/local/`, excluidos de Git. Mantener esa carpeta y el runtime .NET configurado para seguir ejecutando la instalación. La base SQL y sus respaldos son independientes de esa carpeta.

## Diagnóstico

- Ejecutar `Estado-Local.ps1` y revisar `artifacts/local/api-error.log` y `api.log`.
- Si la API responde pero SQL no, comprobar que la instancia SQL Server Express esté iniciada y que la cuenta tenga acceso.
- Ante un registro de proceso obsoleto, usar `Detener-Local.ps1`: valida PID, hora y ruta. No eliminar procesos por nombre ni borrar la base para resolver el arranque.
- Si falla SSO, usar `http://localhost:5280` en Edge desde la cuenta habilitada. No desactivar autenticación para sortear el fallo.

## Alcance

Es una instalación personal, no un despliegue público ni un servicio de alta disponibilidad. Utiliza los permisos SQL de tu cuenta Windows; no se configuró una cuenta técnica de mínimos privilegios para esta modalidad. La vista del frontend limita a 500 registros por recurso y advierte cuando está incompleta; inventarios mayores requieren ampliar la paginación operativa.

Internet sigue requiriendo alojamiento, TLS, OIDC, cuenta SQL restringida, monitoreo y validación del entorno. El modo JWT/OIDC del backend se conserva.

La instalación se actualizó a .NET 10 LTS, con parche 10.0.14. Microsoft fija su fin de soporte el **14 de noviembre de 2028**; mantener los parches de seguridad durante ese período. [Política oficial de .NET](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core). Detalles: [MIGRACION-NET10.md](MIGRACION-NET10.md).

Resultados: [VERIFICACION-LOCAL.md](VERIFICACION-LOCAL.md).

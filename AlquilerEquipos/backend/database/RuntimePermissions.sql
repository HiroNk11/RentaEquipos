-- Ejecutar como administrador de la base, despues de aplicar las migraciones.
-- No crea logins ni contiene credenciales.
IF OBJECT_ID(N'dbo.Equipos', N'U') IS NULL
    OR OBJECT_ID(N'dbo.Clientes', N'U') IS NULL
    OR OBJECT_ID(N'dbo.ReservasAlquiler', N'U') IS NULL
    THROW 50001, 'Seleccionar una base AlquilerEquipos con las migraciones aplicadas.', 1;

IF DATABASE_PRINCIPAL_ID(N'alquiler_runtime') IS NULL
    EXEC(N'CREATE ROLE [alquiler_runtime] AUTHORIZATION [dbo];');
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'alquiler_runtime' AND type = 'R')
    THROW 50002, 'alquiler_runtime existe pero no es un rol de base de datos.', 1;

GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.Equipos TO alquiler_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.Clientes TO alquiler_runtime;
GRANT SELECT, INSERT, UPDATE ON OBJECT::dbo.ReservasAlquiler TO alquiler_runtime;

-- Asociar despues un usuario SQL exclusivo mediante ALTER ROLE ... ADD MEMBER.
-- No usar un usuario que ya sea db_owner o miembro de roles de servidor elevados.

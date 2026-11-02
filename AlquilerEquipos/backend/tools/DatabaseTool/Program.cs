using AlquilerEquipos.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

if (args.Length < 2 || args[0] is not ("migrate" or "status" or "backup" or "verify" or "restore-check" or "exists"))
    throw new ArgumentException("Uso: DatabaseTool migrate|status|exists|backup|verify|restore-check <base-esperada> [archivo-backup] [--json]. Conexion mediante ConnectionStrings__AlquilerEquipos.");
var source = Environment.GetEnvironmentVariable("ConnectionStrings__AlquilerEquipos")
    ?? throw new InvalidOperationException("Configurar ConnectionStrings__AlquilerEquipos.");
var sql = new SqlConnectionStringBuilder(source);
if (!string.Equals(sql.InitialCatalog, args[1], StringComparison.Ordinal) ||
    string.IsNullOrWhiteSpace(args[1]) || new[] { "master", "model", "msdb", "tempdb" }.Contains(args[1], StringComparer.OrdinalIgnoreCase))
    throw new InvalidOperationException("La base esperada debe coincidir con la conexion y no puede ser una base del sistema.");
await using var db = new AlquilerEquiposDbContext(new DbContextOptionsBuilder<AlquilerEquiposDbContext>().UseSqlServer(source).Options);
if (args[0] == "exists")
{
    var masterBuilder = new SqlConnectionStringBuilder(source) { InitialCatalog = "master" };
    await using var connection = new SqlConnection(masterBuilder.ConnectionString);
    await connection.OpenAsync();
    await using var command = connection.CreateCommand();
    command.CommandText = "SELECT COUNT(*) FROM sys.databases WHERE name=@name;";
    command.Parameters.AddWithValue("@name", sql.InitialCatalog);
    Console.WriteLine(Convert.ToInt32(await command.ExecuteScalarAsync()) == 1 ? "true" : "false");
}
else if (args[0] == "migrate")
{
    await db.Database.MigrateAsync();
    Console.WriteLine($"Migraciones aplicadas a {sql.InitialCatalog}.");
}
else if (args[0] == "status")
{
    if (!await db.Database.CanConnectAsync()) throw new InvalidOperationException("Base no disponible.");
    var pending = (await db.Database.GetPendingMigrationsAsync()).ToArray();
    Console.WriteLine($"Base: {sql.InitialCatalog}. Equipos: {await db.Equipos.CountAsync()}. Clientes: {await db.Clientes.CountAsync()}. Reservas: {await db.ReservasAlquiler.CountAsync()}. Migraciones pendientes: {pending.Length}.");
    if (pending.Length != 0) Environment.ExitCode = 2;
}
else if (args[0] == "restore-check")
{
    await RestoreCheck.Run(source, sql.InitialCatalog, args.ElementAtOrDefault(2)
        ?? throw new ArgumentException("Indicar el respaldo que se restaurara en una base temporal."));
}
else
{
    await using var connection = new SqlConnection(source);
    await connection.OpenAsync();
    string file;
    if (args[0] == "backup")
    {
        await using var directory = connection.CreateCommand();
        directory.CommandText = "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000));";
        var folder = Convert.ToString(await directory.ExecuteScalarAsync());
        if (string.IsNullOrWhiteSpace(folder)) throw new InvalidOperationException("SQL Server no informo su directorio de respaldos.");
        file = Path.Combine(folder, $"{sql.InitialCatalog}_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}.bak");
        await using var backup = connection.CreateCommand();
        backup.CommandTimeout = 120;
        backup.CommandText = "DECLARE @statement nvarchar(max) = N'BACKUP DATABASE ' + QUOTENAME(@database) + N' TO DISK = @file WITH COPY_ONLY, CHECKSUM'; EXEC sp_executesql @statement, N'@file nvarchar(4000)', @file;";
        backup.Parameters.AddWithValue("@database", sql.InitialCatalog);
        backup.Parameters.AddWithValue("@file", file);
        await backup.ExecuteNonQueryAsync();
    }
    else file = args.ElementAtOrDefault(2) ?? throw new ArgumentException("Indicar archivo de respaldo para verificar.");
    await using var verify = connection.CreateCommand();
    verify.CommandTimeout = 120;
    verify.CommandText = "RESTORE VERIFYONLY FROM DISK = @file WITH CHECKSUM;";
    verify.Parameters.AddWithValue("@file", file);
    await verify.ExecuteNonQueryAsync();
    if (args.Contains("--json")) Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { database = sql.InitialCatalog, file, verified = true }));
    else
    {
        Console.WriteLine($"Respaldo verificado por SQL Server: {file}");
        Console.WriteLine("VERIFYONLY no reemplaza un ensayo de restauracion en otra base. No se sobreescribio ninguna base.");
    }
}

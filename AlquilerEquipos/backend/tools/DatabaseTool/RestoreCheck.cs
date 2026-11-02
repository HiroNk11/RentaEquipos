using AlquilerEquipos.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

internal static class RestoreCheck
{
    public static async Task Run(string source, string expectedDatabase, string file)
    {
        var builder = new SqlConnectionStringBuilder(source) { InitialCatalog = "master" };
        await using var connection = new SqlConnection(builder.ConnectionString);
        await connection.OpenAsync();
        await using (var header = connection.CreateCommand())
        {
            header.CommandText = "RESTORE HEADERONLY FROM DISK=@file;";
            header.Parameters.AddWithValue("@file", file);
            await using var reader = await header.ExecuteReaderAsync();
            if (!await reader.ReadAsync() || reader.GetString(reader.GetOrdinal("DatabaseName")) != expectedDatabase)
                throw new InvalidOperationException("El respaldo no corresponde a la base esperada.");
        }
        var files = new List<(string Name, string Type)>();
        await using (var list = connection.CreateCommand())
        {
            list.CommandText = "RESTORE FILELISTONLY FROM DISK=@file;";
            list.Parameters.AddWithValue("@file", file);
            await using var reader = await list.ExecuteReaderAsync();
            while (await reader.ReadAsync()) files.Add((reader.GetString(reader.GetOrdinal("LogicalName")), reader.GetString(reader.GetOrdinal("Type"))));
        }
        if (files.Count != 2 || files.Count(item => item.Type == "D") != 1 || files.Count(item => item.Type == "L") != 1)
            throw new InvalidOperationException("El ensayo automatico admite una base con un archivo de datos y uno de log.");
        string dataFolder, logFolder;
        await using (var folders = connection.CreateCommand())
        {
            folders.CommandText = "SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(4000)), CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS nvarchar(4000));";
            await using var reader = await folders.ExecuteReaderAsync();
            await reader.ReadAsync();
            dataFolder = reader.GetString(0); logFolder = reader.GetString(1);
        }
        var name = "RentaEquiposRestoreCheck_" + Guid.NewGuid().ToString("N");
        try
        {
            await using (var restore = connection.CreateCommand())
            {
                restore.CommandTimeout = 120;
                // RESTORE MOVE requires SQL literals; values remain parameters and are quoted inside SQL.
                restore.CommandText = """
                    DECLARE @statement nvarchar(max) = N'RESTORE DATABASE ' + QUOTENAME(@target) +
                    N' FROM DISK=@backup WITH CHECKSUM, MOVE ' + QUOTENAME(@logicalData, NCHAR(39)) +
                    N' TO N' + NCHAR(39) + REPLACE(@dataPath,NCHAR(39),NCHAR(39)+NCHAR(39)) + NCHAR(39) +
                    N', MOVE ' + QUOTENAME(@logicalLog,NCHAR(39)) + N' TO N' + NCHAR(39) +
                    REPLACE(@logPath,NCHAR(39),NCHAR(39)+NCHAR(39)) + NCHAR(39);
                    EXEC sp_executesql @statement,N'@backup nvarchar(4000)',@backup;
                    """;
                restore.Parameters.AddWithValue("@target", name);
                restore.Parameters.AddWithValue("@backup", file);
                restore.Parameters.AddWithValue("@logicalData", files.Single(item => item.Type == "D").Name);
                restore.Parameters.AddWithValue("@logicalLog", files.Single(item => item.Type == "L").Name);
                restore.Parameters.AddWithValue("@dataPath", Path.Combine(dataFolder, name + ".mdf"));
                restore.Parameters.AddWithValue("@logPath", Path.Combine(logFolder, name + "_log.ldf"));
                await restore.ExecuteNonQueryAsync();
            }
            using var identifiers = new SqlCommandBuilder();
            await using (var integrity = connection.CreateCommand())
            {
                integrity.CommandTimeout = 120;
                integrity.CommandText = $"DBCC CHECKDB({identifiers.QuoteIdentifier(name)}) WITH NO_INFOMSGS;";
                await integrity.ExecuteNonQueryAsync();
            }
            builder.InitialCatalog = name;
            await using (var restored = new AlquilerEquiposDbContext(new DbContextOptionsBuilder<AlquilerEquiposDbContext>().UseSqlServer(builder.ConnectionString).Options))
            {
                if ((await restored.Database.GetPendingMigrationsAsync()).Any()) throw new InvalidOperationException("El respaldo tiene migraciones pendientes.");
                Console.WriteLine($"OK: restauracion aislada y CHECKDB aprobados. Equipos: {await restored.Equipos.CountAsync()}; clientes: {await restored.Clientes.CountAsync()}; reservas: {await restored.ReservasAlquiler.CountAsync()}.");
            }
        }
        finally
        {
            SqlConnection.ClearAllPools();
            using var identifiers = new SqlCommandBuilder();
            await using var cleanup = connection.CreateCommand();
            // Only the name generated in this method can ever be dropped.
            var quoted = identifiers.QuoteIdentifier(name);
            cleanup.CommandText = $"IF DB_ID(@name) IS NOT NULL BEGIN ALTER DATABASE {quoted} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE {quoted}; END";
            cleanup.Parameters.AddWithValue("@name", name);
            await cleanup.ExecuteNonQueryAsync();
            Console.WriteLine("Base temporal de restauracion eliminada. La base original no se modifico.");
        }
    }
}

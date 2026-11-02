using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

using AlquilerEquipos.Infrastructure.Data;

namespace AlquilerEquipos.API.DesignTime;

public class AlquilerEquiposDesignTimeFactory : IDesignTimeDbContextFactory<AlquilerEquiposDbContext>
{
    public AlquilerEquiposDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__AlquilerEquipos");
        if (string.IsNullOrWhiteSpace(connection))
            throw new InvalidOperationException(
                "Para migraciones, configurar ConnectionStrings__AlquilerEquipos en el entorno del proceso.");
        return new AlquilerEquiposDbContext(new DbContextOptionsBuilder<AlquilerEquiposDbContext>()
            .UseSqlServer(connection).Options);
    }
}

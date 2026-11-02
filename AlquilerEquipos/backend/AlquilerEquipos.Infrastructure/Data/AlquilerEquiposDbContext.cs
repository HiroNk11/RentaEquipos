using AlquilerEquipos.Application.Entitites;
using Microsoft.EntityFrameworkCore;
namespace AlquilerEquipos.Infrastructure.Data;
public class AlquilerEquiposDbContext(DbContextOptions<AlquilerEquiposDbContext> options) : DbContext(options)
{
    public DbSet<Equipo> Equipos => Set<Equipo>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<ReservaAlquiler> ReservasAlquiler => Set<ReservaAlquiler>();
    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);
        m.Entity<Equipo>(e =>
        {
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(150);
            e.Property(x => x.Marca).IsRequired().HasMaxLength(100);
            e.Property(x => x.NumeroSerie).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.NumeroSerie).IsUnique();
            e.Property(x => x.Estado).HasConversion<string>().HasMaxLength(30);
            e.ToTable("Equipos", t => t.HasCheckConstraint("CK_Equipo_Estado",
                "[Estado] IN ('Disponible', 'EnUso', 'Mantenimiento')"));
        });
        m.Entity<Cliente>(e =>
        {
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(150);
            e.Property(x => x.Apellido).IsRequired().HasMaxLength(150);
            e.Property(x => x.Email).IsRequired().HasMaxLength(254);
            e.Property(x => x.Telefono).HasMaxLength(30);
            e.Property(x => x.Direccion).HasMaxLength(250);
        });
        m.Entity<ReservaAlquiler>(e =>
        {
            e.HasOne(x => x.Equipo).WithMany(x => x.Reservas).HasForeignKey(x => x.EquipoId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Cliente).WithMany(x => x.Reservas).HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.CostoTotal).HasPrecision(18, 2);
            e.Property(x => x.FechaInicio).HasConversion(
                value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc));
            e.Property(x => x.FechaFinEsperada).HasConversion(
                value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc));
            e.Property(x => x.FechaDevolucionReal).HasConversion(
                value => value, value => value.HasValue
                    ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);
            e.Property(x => x.Estado).HasConversion<string>().HasMaxLength(30);
            e.HasIndex(x => new { x.EquipoId, x.FechaInicio, x.FechaFinEsperada });
            e.ToTable("ReservasAlquiler", t =>
            {
                t.HasCheckConstraint("CK_Reserva_Fechas", "[FechaFinEsperada] > [FechaInicio]");
                t.HasCheckConstraint("CK_Reserva_Devolucion", "[FechaDevolucionReal] IS NULL OR [FechaDevolucionReal] >= [FechaInicio]");
                t.HasCheckConstraint("CK_Reserva_Costo", "[CostoTotal] >= 0");
                t.HasCheckConstraint("CK_Reserva_Estado",
                    "[Estado] IN ('Pendiente', 'Activa', 'Finalizada', 'Cancelada')");
                t.HasCheckConstraint("CK_Reserva_Finalizacion",
                    "([Estado] = 'Finalizada' AND [FechaDevolucionReal] IS NOT NULL) OR " +
                    "([Estado] <> 'Finalizada' AND [FechaDevolucionReal] IS NULL)");
            });
        });
    }
}

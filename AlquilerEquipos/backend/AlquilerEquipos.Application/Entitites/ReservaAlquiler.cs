using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Exceptions;
namespace AlquilerEquipos.Application.Entitites;
public class ReservaAlquiler
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public Equipo Equipo { get; set; } = null!;
    public int ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFinEsperada { get; set; }
    public DateTime? FechaDevolucionReal { get; set; }
    public decimal CostoTotal { get; set; }
    public EstadoReservaAlquiler Estado { get; set; } = EstadoReservaAlquiler.Pendiente;

    public bool Cancelar()
    {
        if (Estado == EstadoReservaAlquiler.Cancelada) return false;
        if (Estado != EstadoReservaAlquiler.Pendiente)
            throw new ReglaNegocioException("Solo se pueden cancelar reservas pendientes; un alquiler activo requiere devolucion.");
        Estado = EstadoReservaAlquiler.Cancelada;
        return true;
    }

    public bool Activar(Equipo equipo, DateTime ahoraUtc)
    {
        if (equipo.Id != EquipoId)
            throw new ReglaNegocioException("El equipo no corresponde a la reserva.");
        if (Estado == EstadoReservaAlquiler.Activa && equipo.Estado == EstadoEquipo.EnUso) return false;
        if (ahoraUtc.Kind != DateTimeKind.Utc)
            throw new ReglaNegocioException("La hora de operacion debe expresarse en UTC.");
        if (Estado != EstadoReservaAlquiler.Pendiente || ahoraUtc < FechaInicio || ahoraUtc >= FechaFinEsperada)
            throw new ReglaNegocioException("La reserva debe estar pendiente y dentro de su periodo para retirar el equipo.");
        if (equipo.Estado != EstadoEquipo.Disponible)
            throw new ReglaNegocioException("El equipo no esta disponible para su retiro.");
        Estado = EstadoReservaAlquiler.Activa;
        equipo.Estado = EstadoEquipo.EnUso;
        return true;
    }

    public bool RegistrarDevolucion(Equipo equipo, DateTime fechaUtc, DateTime ahoraUtc, bool requiereMantenimiento)
    {
        if (equipo.Id != EquipoId)
            throw new ReglaNegocioException("El equipo no corresponde a la reserva.");
        if (Estado == EstadoReservaAlquiler.Finalizada) return false;
        if (Estado != EstadoReservaAlquiler.Activa || equipo.Estado != EstadoEquipo.EnUso)
            throw new ReglaNegocioException("Solo se puede devolver un alquiler activo con el equipo en uso.");
        if (ahoraUtc.Kind != DateTimeKind.Utc || fechaUtc.Kind != DateTimeKind.Utc ||
            fechaUtc < FechaInicio || fechaUtc > ahoraUtc)
            throw new ReglaNegocioException("La devolucion requiere UTC y no puede ser anterior al inicio ni posterior a la hora actual.");
        FechaDevolucionReal = fechaUtc;
        Estado = EstadoReservaAlquiler.Finalizada;
        equipo.Estado = requiereMantenimiento ? EstadoEquipo.Mantenimiento : EstadoEquipo.Disponible;
        return true;
    }
}


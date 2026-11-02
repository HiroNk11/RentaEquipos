using System.Linq.Expressions;
using AlquilerEquipos.Application.Entitites;
using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Exceptions;
namespace AlquilerEquipos.Application.Services;
public static class Disponibilidad
{
    public static DateTime EnUtc(DateTime fecha) => fecha.Kind switch
    {
        DateTimeKind.Local => fecha.ToUniversalTime(),
        DateTimeKind.Unspecified => DateTime.SpecifyKind(fecha, DateTimeKind.Utc),
        _ => fecha
    };
    public static void ValidarFechas(DateTime inicio, DateTime fin)
    {
        inicio = EnUtc(inicio);
        fin = EnUtc(fin);
        if (inicio == default || fin <= inicio)
            throw new ReglaNegocioException("El fin debe ser posterior al inicio y las fechas son obligatorias.");
    }

    // Intervalos semiabiertos: se admite una reserva que empiece al terminar otra.
    public static Expression<Func<ReservaAlquiler, bool>> Conflictos(DateTime inicio, DateTime fin)
    {
        inicio = EnUtc(inicio);
        fin = EnUtc(fin);
        ValidarFechas(inicio, fin);
        return r => (r.Estado == EstadoReservaAlquiler.Activa || r.Estado == EstadoReservaAlquiler.Pendiente)
            && r.FechaInicio < fin && r.FechaFinEsperada > inicio;
    }
}


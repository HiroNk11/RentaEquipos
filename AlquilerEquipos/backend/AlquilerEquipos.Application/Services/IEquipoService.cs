using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Enums;
namespace AlquilerEquipos.Application.Services;
public interface IEquipoService
{
    Task<IReadOnlyList<EquipoDto>> ListarAsync(CancellationToken ct, ConsultaPagina? pagina = null);
    Task<IReadOnlyList<EquipoDto>> DisponiblesAsync(DateTime fechaInicio, DateTime fechaFin, CancellationToken ct, ConsultaPagina? pagina = null);
    Task<EquipoDto> ObtenerAsync(int id, CancellationToken ct);
    Task<EquipoDto> CrearAsync(GuardarEquipoDto dto, CancellationToken ct);
    Task ActualizarAsync(int id, GuardarEquipoDto dto, CancellationToken ct);
    Task CambiarEstadoAsync(int id, EstadoEquipo estado, CancellationToken ct);
    Task EliminarAsync(int id, CancellationToken ct);
}


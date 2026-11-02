using AlquilerEquipos.Application.DTO;
namespace AlquilerEquipos.Application.Services;
public interface IReservaService
{
    Task<IReadOnlyList<ReservaDto>> ListarAsync(CancellationToken ct, ConsultaReservas? consulta = null);
    Task<ReservaDto> ObtenerAsync(int id, CancellationToken ct);
    Task<ReservaDto> CrearAsync(CrearReservaDto dto, CancellationToken ct);
    Task CancelarAsync(int id, CancellationToken ct);
    Task ActivarAsync(int id, CancellationToken ct);
    Task DevolverAsync(int id, DevolverReservaDto dto, CancellationToken ct);
}


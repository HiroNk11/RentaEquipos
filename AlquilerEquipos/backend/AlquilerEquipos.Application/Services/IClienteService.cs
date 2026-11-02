using AlquilerEquipos.Application.DTO;

namespace AlquilerEquipos.Application.Services;

public interface IClienteService
{
    Task<IReadOnlyList<ClienteDto>> ListarAsync(ConsultaPagina consulta, CancellationToken ct);
    Task<ClienteDto> ObtenerAsync(int id, CancellationToken ct);
    Task<ClienteDto> CrearAsync(GuardarClienteDto dto, CancellationToken ct);
    Task ActualizarAsync(int id, GuardarClienteDto dto, CancellationToken ct);
    Task EliminarAsync(int id, CancellationToken ct);
}


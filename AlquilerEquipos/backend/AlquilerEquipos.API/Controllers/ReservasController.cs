using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
namespace AlquilerEquipos.API.Controllers;
[ApiController]
[Authorize(Policy = "Lectura")]
[Route("api/reservas")]
public class ReservasController(IReservaService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ReservaDto>>> Listar(
        [FromQuery] ConsultaReservas consulta, CancellationToken ct) =>
        Ok(await service.ListarAsync(ct, consulta));
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReservaDto>> Obtener(int id, CancellationToken ct) =>
        Ok(await service.ObtenerAsync(id, ct));
    [HttpPost]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(typeof(ReservaDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<ReservaDto>> Crear(CrearReservaDto dto, CancellationToken ct)
    {
        var reserva = await service.CrearAsync(dto, ct);
        return CreatedAtAction(nameof(Obtener), new { id = reserva.Id }, reserva);
    }
    [HttpPatch("{id:int}/cancelar")]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Cancelar(int id, CancellationToken ct)
    {
        await service.CancelarAsync(id, ct);
        return NoContent();
    }

    [HttpPatch("{id:int}/activar")]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Activar(int id, CancellationToken ct)
    {
        await service.ActivarAsync(id, ct);
        return NoContent();
    }

    [HttpPatch("{id:int}/devolver")]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Devolver(int id, DevolverReservaDto dto, CancellationToken ct)
    {
        await service.DevolverAsync(id, dto, ct);
        return NoContent();
    }
}


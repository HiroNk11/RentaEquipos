using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
namespace AlquilerEquipos.API.Controllers;
[ApiController]
[Authorize(Policy = "Lectura")]
[Route("api/equipos")]
public class EquiposController(IEquipoService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EquipoDto>>> Listar(
        [FromQuery] ConsultaPagina consulta, CancellationToken ct) =>
        Ok(await service.ListarAsync(ct, consulta));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EquipoDto>> Obtener(int id, CancellationToken ct) =>
        Ok(await service.ObtenerAsync(id, ct));

    [HttpGet("disponibles")]
    public async Task<ActionResult<IReadOnlyList<EquipoDto>>> Disponibles(
        [FromQuery, System.ComponentModel.DataAnnotations.Required] DateTime? fechaInicio,
        [FromQuery, System.ComponentModel.DataAnnotations.Required] DateTime? fechaFin,
        [FromQuery] ConsultaPagina consulta, CancellationToken ct) =>
        Ok(await service.DisponiblesAsync(fechaInicio!.Value, fechaFin!.Value, ct, consulta));

    [HttpPost]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(typeof(EquipoDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<EquipoDto>> Crear(GuardarEquipoDto dto, CancellationToken ct)
    {
        var equipo = await service.CrearAsync(dto, ct);
        return CreatedAtAction(nameof(Obtener), new { id = equipo.Id }, equipo);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Actualizar(int id, GuardarEquipoDto dto, CancellationToken ct)
    {
        await service.ActualizarAsync(id, dto, ct);
        return NoContent();
    }

    [HttpPatch("{id:int}/estado")]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CambiarEstado(int id, CambiarEstadoEquipoDto dto, CancellationToken ct)
    {
        await service.CambiarEstadoAsync(id, dto.Estado!.Value, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Administracion")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        await service.EliminarAsync(id, ct);
        return NoContent();
    }
}


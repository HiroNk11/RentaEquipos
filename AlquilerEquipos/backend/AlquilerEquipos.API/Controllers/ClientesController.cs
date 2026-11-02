using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlquilerEquipos.API.Controllers;

[ApiController]
[Authorize(Policy = "Lectura")]
[Route("api/clientes")]
public class ClientesController(IClienteService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClienteDto>>> Listar(
        [FromQuery] ConsultaPagina consulta, CancellationToken ct) => Ok(await service.ListarAsync(consulta, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ClienteDto>> Obtener(int id, CancellationToken ct) =>
        Ok(await service.ObtenerAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(typeof(ClienteDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<ClienteDto>> Crear(GuardarClienteDto dto, CancellationToken ct)
    {
        var cliente = await service.CrearAsync(dto, ct);
        return CreatedAtAction(nameof(Obtener), new { id = cliente.Id }, cliente);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Escritura")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Actualizar(int id, GuardarClienteDto dto, CancellationToken ct)
    {
        await service.ActualizarAsync(id, dto, ct);
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


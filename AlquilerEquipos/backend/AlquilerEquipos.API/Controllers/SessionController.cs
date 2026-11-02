using System.Security.Claims;
using AlquilerEquipos.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlquilerEquipos.API.Controllers;

[ApiController]
[Authorize(Policy = "Lectura")]
[Route("api/session")]
public class SessionController(IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public IActionResult Obtener() => Ok(new
    {
        name = User.Identity?.Name ?? User.FindFirst("sub")?.Value,
        roles = User.FindAll(ClaimTypes.Role).Concat(User.FindAll("role")).Select(claim => claim.Value).Distinct(),
        authentication = configuration.IsWindowsLocal() ? "WindowsLocal" : "Bearer"
    });
}

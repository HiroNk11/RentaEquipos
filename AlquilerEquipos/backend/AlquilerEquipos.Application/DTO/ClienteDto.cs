using System.ComponentModel.DataAnnotations;

namespace AlquilerEquipos.Application.DTO;

public class GuardarClienteDto
{
    [Required, StringLength(150)] public string Nombre { get; set; } = string.Empty;
    [Required, StringLength(150)] public string Apellido { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(254)] public string Email { get; set; } = string.Empty;
    [StringLength(30)] public string? Telefono { get; set; }
    [StringLength(250)] public string? Direccion { get; set; }
}
public record ClienteDto(int Id, string Nombre, string Apellido, string Email, string? Telefono, string? Direccion);


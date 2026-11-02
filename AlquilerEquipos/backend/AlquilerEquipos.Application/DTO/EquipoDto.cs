using System.ComponentModel.DataAnnotations;
using AlquilerEquipos.Application.Enums;
namespace AlquilerEquipos.Application.DTO;
public record EquipoDto(int Id, string Nombre, string Marca, string NumeroSerie, EstadoEquipo Estado);
public class GuardarEquipoDto
{
    [Required, StringLength(150)]
    public string Nombre { get; set; } = string.Empty;
    [Required, StringLength(100)]
    public string Marca { get; set; } = string.Empty;
    [Required, StringLength(100)]
    public string NumeroSerie { get; set; } = string.Empty;
}
public class CambiarEstadoEquipoDto
{
    [Required, EnumDataType(typeof(EstadoEquipo))]
    public EstadoEquipo? Estado { get; set; }
}


using System.ComponentModel.DataAnnotations;
using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Services;
namespace AlquilerEquipos.Application.DTO;
public class CrearReservaDto : IValidatableObject
{
    [Range(1, int.MaxValue)] public int EquipoId { get; set; }
    [Range(1, int.MaxValue)] public int ClienteId { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFinEsperada { get; set; }
    [Range(typeof(decimal), "0", "9999999999999999.99",
        ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
    public decimal CostoTotal { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (FechaInicio == default ||
            Disponibilidad.EnUtc(FechaFinEsperada) <= Disponibilidad.EnUtc(FechaInicio))
            yield return new ValidationResult("El fin debe ser posterior al inicio y las fechas son obligatorias.",
                new[] { nameof(FechaInicio), nameof(FechaFinEsperada) });
    }
}
public record ReservaDto(int Id, int EquipoId, int ClienteId, DateTime FechaInicio,
    DateTime FechaFinEsperada, DateTime? FechaDevolucionReal, decimal CostoTotal, EstadoReservaAlquiler Estado);


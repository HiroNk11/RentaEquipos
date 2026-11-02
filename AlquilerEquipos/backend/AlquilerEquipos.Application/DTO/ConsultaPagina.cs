using System.ComponentModel.DataAnnotations;
using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Exceptions;

namespace AlquilerEquipos.Application.DTO;

public class ConsultaPagina
{
    [Range(1, 10000)] public int Pagina { get; set; } = 1;
    [Range(1, 100)] public int TamanioPagina { get; set; } = 50;

    public void Validar()
    {
        if (Pagina is < 1 or > 10000 || TamanioPagina is < 1 or > 100)
            throw new ReglaNegocioException("Pagina debe estar entre 1 y 10000; tamanioPagina entre 1 y 100.");
    }
    public int CalcularOmitidos() => (Pagina - 1) * TamanioPagina;
}

public class ConsultaReservas : ConsultaPagina
{
    [Range(1, int.MaxValue)] public int? EquipoId { get; set; }
    [Range(1, int.MaxValue)] public int? ClienteId { get; set; }
    [EnumDataType(typeof(EstadoReservaAlquiler))] public EstadoReservaAlquiler? Estado { get; set; }
}

using AlquilerEquipos.Application.Enums;
namespace AlquilerEquipos.Application.Entitites;
public class Equipo
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string NumeroSerie { get; set; } = string.Empty;
    public EstadoEquipo Estado { get; set; } = EstadoEquipo.Disponible;
    public ICollection<ReservaAlquiler> Reservas { get; set; } = new List<ReservaAlquiler>();
}


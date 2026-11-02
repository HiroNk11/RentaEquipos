namespace AlquilerEquipos.Application.Entitites;
public class Cliente
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public ICollection<ReservaAlquiler> Reservas { get; set; } = new List<ReservaAlquiler>();
}


namespace AlquilerEquipos.Application.Exceptions;

public sealed class ConflictoReservaException(string message) : ReglaNegocioException(message);

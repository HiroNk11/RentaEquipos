using System.ComponentModel.DataAnnotations;
using AlquilerEquipos.Application.Exceptions;

namespace AlquilerEquipos.Application.Services;

public static class ValidacionEntrada
{
    public static void Validar(object value)
    {
        var errors = new List<ValidationResult>();
        if (!Validator.TryValidateObject(value, new ValidationContext(value), errors, true))
            throw new ReglaNegocioException(string.Join(" ", errors.Select(error => error.ErrorMessage)));
    }
}


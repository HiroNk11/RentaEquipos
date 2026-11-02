using AlquilerEquipos.Application.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AlquilerEquipos.API.Exceptions;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IProblemDetailsService problems)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, title) = exception switch
        {
            NotFoundException => (404, "Recurso no encontrado."),
            ConflictoReservaException => (409, "El equipo ya esta reservado en ese periodo."),
            ReglaNegocioException => (400, "Operacion no permitida."),
            BadHttpRequestException badRequest => (badRequest.StatusCode, "Solicitud HTTP invalida."),
            DbUpdateConcurrencyException => (409, "El recurso cambio; actualizar y volver a intentar."),
            DbUpdateException { InnerException: SqlException { Number: 547 } } =>
                (409, "Una relacion cambio; volver a consultar los recursos."),
            SqlException { Number: 1205 or 1222 or -2 } => (503, "Base de datos ocupada; volver a intentar."),
            DbUpdateException { InnerException: SqlException { Number: 1205 or 1222 or -2 } } =>
                (503, "Base de datos ocupada; volver a intentar."),
            _ => (500, "No se pudo completar la solicitud.")
        };
        if (status >= 500)
            logger.LogError("Solicitud fallida. Tipo: {ExceptionType}, TraceId: {TraceId}",
                exception.GetType().Name, context.TraceIdentifier);
        context.Response.StatusCode = status;
        if (status == 503) context.Response.Headers.RetryAfter = "2";
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = exception is ReglaNegocioException or NotFoundException ? exception.Message : null
        };
        problem.Extensions["traceId"] = context.TraceIdentifier;
        if (!await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem
        }))
            await context.Response.WriteAsJsonAsync(problem, options: null,
                contentType: "application/problem+json", cancellationToken: ct);
        return true;
    }
}

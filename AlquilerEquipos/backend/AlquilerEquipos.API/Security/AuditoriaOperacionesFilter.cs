using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AlquilerEquipos.API.Security;

public class AuditoriaOperacionesFilter(ILogger<AuditoriaOperacionesFilter> logger) : IAsyncResultFilter
{
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        var result = await next();
        var http = context.HttpContext;
        if (result.Canceled || http.Response.StatusCode is < 200 or >= 300 ||
            http.Request.Method is "GET" or "HEAD" or "OPTIONS")
            return;
        http.Request.RouteValues.TryGetValue("id", out var id);
        if (context.Result is CreatedAtActionResult created && created.RouteValues is not null)
            created.RouteValues.TryGetValue("id", out id);
        logger.LogInformation(new EventId(1001, "BusinessRequestCompleted"),
            "Solicitud {Method} {Controller}.{Action} completada. Recurso {ResourceId}, Actor {Actor}, Estado {Status}, TraceId {TraceId}",
            http.Request.Method, http.Request.RouteValues["controller"], http.Request.RouteValues["action"],
            id, http.User.FindFirst("sub")?.Value ?? "development-anonymous",
            http.Response.StatusCode, http.TraceIdentifier);
    }
}

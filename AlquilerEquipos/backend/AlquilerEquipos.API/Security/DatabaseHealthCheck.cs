using AlquilerEquipos.Infrastructure.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace AlquilerEquipos.API.Security;

public class DatabaseHealthCheck(IServiceScopeFactory scopeFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(3));
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AlquilerEquiposDbContext>();
            return await db.Database.CanConnectAsync(timeout.Token)
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("Database unavailable.");
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            return HealthCheckResult.Unhealthy("Database unavailable.");
        }
    }
}


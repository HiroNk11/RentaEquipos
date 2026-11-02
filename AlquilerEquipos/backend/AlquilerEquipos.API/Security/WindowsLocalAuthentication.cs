using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Negotiate;

namespace AlquilerEquipos.API.Security;

public static class WindowsLocalAuthentication
{
    public static bool IsWindowsLocal(this IConfiguration config) => config["Authentication:Mode"] == "WindowsLocal";

    public static IServiceCollection AddWindowsLocalAuthentication(this IServiceCollection services,
        IConfiguration config, IHostEnvironment environment)
    {
        if (!OperatingSystem.IsWindows() || !environment.IsDevelopment())
            throw new InvalidOperationException("WindowsLocal solo se admite en Windows y Development, limitado a loopback.");
        if (config.GetValue<bool>("Authentication:AllowAnonymousDevelopment") ||
            !string.IsNullOrWhiteSpace(config["Authentication:Authority"]) ||
            config.GetSection("ReverseProxy:KnownProxies").GetChildren().Any())
            throw new InvalidOperationException("WindowsLocal no admite bypass anonimo, OIDC ni proxy.");
        var users = config.GetSection("WindowsLocal:Users").Get<LocalUser[]>() ?? Array.Empty<LocalUser>();
        if (users.Length == 0 || users.Any(user => string.IsNullOrWhiteSpace(user.Name) ||
            user.Role is not ("Administrador" or "Operador" or "Consulta")) ||
            users.Select(user => user.Name).Distinct(StringComparer.OrdinalIgnoreCase).Count() != users.Length)
            throw new InvalidOperationException("Configurar cuentas Windows explicitas y roles validos en WindowsLocal:Users.");
        var allowed = users.ToDictionary(user => user.Name, user => user.Role, StringComparer.OrdinalIgnoreCase);
        services.AddAuthentication(NegotiateDefaults.AuthenticationScheme).AddNegotiate(options =>
        {
            options.Events = new NegotiateEvents
            {
                OnAuthenticated = context =>
                {
                    var name = context.Principal?.Identity?.Name;
                    if (name is null || !allowed.TryGetValue(name, out var role))
                    {
                        context.Fail("Cuenta Windows no habilitada.");
                        return Task.CompletedTask;
                    }
                    var identity = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.Name, name), new Claim("sub", name), new Claim(ClaimTypes.Role, role)
                    }, NegotiateDefaults.AuthenticationScheme);
                    context.Principal = new ClaimsPrincipal(identity);
                    return Task.CompletedTask;
                }
            };
        });
        return services.AddBusinessAuthorization(false);
    }

    public static async Task Boundary(HttpContext context, RequestDelegate next)
    {
        var host = context.Request.Host.Host;
        var allowedHost = host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            IPAddress.TryParse(host.Trim('[', ']'), out var address) && IPAddress.IsLoopback(address);
        var origin = context.Request.Headers.Origin.ToString();
        var ownOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
        var unsafeMethod = !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method) &&
            !HttpMethods.IsOptions(context.Request.Method);
        if (context.Connection.RemoteIpAddress is not { } remote || !IPAddress.IsLoopback(remote) || !allowedHost ||
            context.Request.Headers["Sec-Fetch-Site"] == "cross-site" &&
                (context.Request.Path.StartsWithSegments("/api") || context.Request.Path.StartsWithSegments("/health/ready") || unsafeMethod) ||
            origin.Length > 0 && !string.Equals(origin, ownOrigin, StringComparison.OrdinalIgnoreCase) ||
            unsafeMethod && origin.Length == 0)
        {
            await Results.Problem(statusCode: 403, title: "Acceso local del mismo origen requerido.").ExecuteAsync(context);
            return;
        }
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
        context.Response.Headers.XFrameOptions = "DENY";
        await next(context);
    }

    private sealed class LocalUser
    {
        public string Name { get; set; } = "";
        public string Role { get; set; } = "";
    }
}

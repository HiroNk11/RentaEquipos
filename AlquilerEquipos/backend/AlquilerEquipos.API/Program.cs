using System.Threading.RateLimiting;
using AlquilerEquipos.API.Exceptions;
using AlquilerEquipos.API.Security;
using AlquilerEquipos.Application.Services;
using AlquilerEquipos.Infrastructure.Data;
using AlquilerEquipos.Infrastructure.Services;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var windowsLocal = builder.Configuration.IsWindowsLocal();
if (windowsLocal)
{
    var port = builder.Configuration.GetValue<int?>("WindowsLocal:Port") ?? 5280;
    if (port is < 1024 or > 65535 || builder.Configuration.GetSection("Kestrel:Endpoints").GetChildren().Any())
        throw new InvalidOperationException("WindowsLocal requiere un puerto local valido y no admite endpoints Kestrel adicionales.");
    builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(port));
}
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole();
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
    options.Limits.MaxRequestBodySize = 64 * 1024;
});
var connection = builder.Configuration.GetConnectionString("AlquilerEquipos");
if (string.IsNullOrWhiteSpace(connection))
    throw new InvalidOperationException("Configurar ConnectionStrings:AlquilerEquipos.");
if (!builder.Environment.IsDevelopment())
{
    var sql = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(connection);
    if (sql.TrustServerCertificate || sql.Encrypt.ToString() is "False" or "Optional")
        throw new InvalidOperationException("SQL fuera de Development requiere cifrado y certificado valido.");
}
builder.Services.AddDbContext<AlquilerEquiposDbContext>(options => options.UseSqlServer(connection));
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
    context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier);
builder.Services.AddApiAuthentication(builder.Configuration, builder.Environment);
if (!builder.Environment.IsDevelopment() &&
    (string.IsNullOrWhiteSpace(builder.Configuration["AllowedHosts"]) ||
     builder.Configuration["AllowedHosts"]!.Contains('*')))
    throw new InvalidOperationException("Configurar AllowedHosts explicitos fuera de Development.");
builder.Services.AddScoped<IEquipoService, EquipoService>();
builder.Services.AddScoped<IReservaService, ReservaService>();
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<AuditoriaOperacionesFilter>();
builder.Services.AddControllers(options => options.Filters.AddService<AuditoriaOperacionesFilter>()).AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter(allowIntegerValues: false)));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "AlquilerEquipos API",
        Version = "v1",
        Description = "Equipos y reservas. JWT con roles Administrador, Operador o Consulta."
    });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        Type = Microsoft.OpenApi.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    options.AddSecurityRequirement(document => new Microsoft.OpenApi.OpenApiSecurityRequirement
    {
        [new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
    });
});
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
if (origins.Any(origin => origin.Contains('*') ||
    !Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
    uri.Scheme is not ("https" or "http") || uri.AbsolutePath != "/" ||
    !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment) ||
    (!builder.Environment.IsDevelopment() && uri.Scheme != Uri.UriSchemeHttps)))
    throw new InvalidOperationException("Configurar origenes CORS explicitos; fuera de Development deben ser HTTPS.");
builder.Services.AddCors(options => options.AddPolicy("Frontend",
    policy => policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await Results.Problem(statusCode: 429, title: "Demasiadas solicitudes.")
            .ExecuteAsync(context.HttpContext);
    };
});
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("sql");
var proxies = builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? Array.Empty<string>();
var proxyAddresses = proxies.Select(address => System.Net.IPAddress.TryParse(address, out var ip)
    ? ip : throw new InvalidOperationException("ReverseProxy:KnownProxies requiere direcciones IP.")).ToArray();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    foreach (var address in proxyAddresses) options.KnownProxies.Add(address);
});
var app = builder.Build();
app.UseExceptionHandler();
if (windowsLocal) app.Use(WindowsLocalAuthentication.Boundary);
if (proxyAddresses.Length > 0) app.UseForwardedHeaders();
app.UseStatusCodePages(async context =>
{
    await Results.Problem(statusCode: context.HttpContext.Response.StatusCode)
        .ExecuteAsync(context.HttpContext);
});
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    if (context.Request.Path.StartsWithSegments("/api"))
        context.Response.Headers.CacheControl = "no-store";
    await next();
});
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
    app.Use(async (context, next) =>
    {
        if (!context.Request.IsHttps && context.Request.Path != "/health/live")
        {
            await Results.Problem(statusCode: 400, title: "Se requiere HTTPS.")
                .ExecuteAsync(context);
            return;
        }
        await next();
    });
}
if (app.Environment.IsDevelopment() && !windowsLocal)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }))
    .AllowAnonymous().DisableRateLimiting().ExcludeFromDescription();
app.MapHealthChecks("/health/ready", new HealthCheckOptions()).RequireAuthorization("Lectura");
app.MapControllers();
if (app.Configuration.GetValue<bool>("Web:ServeFrontend"))
{
    if (!File.Exists(Path.Combine(app.Environment.WebRootPath ?? "", "index.html")))
        throw new InvalidOperationException("Falta el frontend compilado en wwwroot. Ejecutar la preparacion local.");
    app.UseDefaultFiles();
    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = context => context.Context.Response.Headers.CacheControl =
            context.Context.Request.Path.StartsWithSegments("/assets") ? "public,max-age=31536000,immutable" : "no-cache"
    });
    app.Map("/api/{**path}", () => Results.Problem(statusCode: 404, title: "Endpoint no encontrado.")).RequireAuthorization("Lectura");
    app.MapFallbackToFile("index.html").AllowAnonymous();
}
if (app.Environment.IsDevelopment() &&
    app.Configuration.GetValue<bool>("Authentication:AllowAnonymousDevelopment"))
    app.Logger.LogWarning("Modo anonimo de desarrollo habilitado explicitamente.");
app.Run();

public partial class Program { }

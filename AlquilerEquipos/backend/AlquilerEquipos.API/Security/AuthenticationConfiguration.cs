using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace AlquilerEquipos.API.Security;

public static class AuthenticationConfiguration
{
    public static IServiceCollection AddApiAuthentication(
        this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        if (configuration["Authentication:Mode"] == "WindowsLocal")
            return services.AddWindowsLocalAuthentication(configuration, environment);
        var allowAnonymous = configuration.GetValue<bool>("Authentication:AllowAnonymousDevelopment");
        var authority = configuration["Authentication:Authority"];
        var audience = configuration["Authentication:Audience"];
        var issuer = configuration["Authentication:Issuer"];
        var signingKey = configuration["Authentication:SigningKey"];
        // Las herramientas EF inspeccionan el modelo; no atienden solicitudes HTTP.
        var designTime = Microsoft.EntityFrameworkCore.EF.IsDesignTime;

        if (!designTime && allowAnonymous && !environment.IsDevelopment())
            throw new InvalidOperationException("El acceso anonimo solo se permite en Development.");
        if (!designTime && !allowAnonymous)
        {
            if (string.IsNullOrWhiteSpace(audience))
                throw new InvalidOperationException("Configurar Authentication:Audience.");
            if (!string.IsNullOrWhiteSpace(authority))
            {
                if (!Uri.TryCreate(authority, UriKind.Absolute, out var uri) ||
                    uri.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(uri.UserInfo))
                    throw new InvalidOperationException("Authentication:Authority requiere una URL HTTPS.");
            }
            else if (!environment.IsDevelopment() || string.IsNullOrWhiteSpace(issuer) ||
                string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 64)
            {
                throw new InvalidOperationException(
                    "Configurar Authority HTTPS. Solo en Development se admite Issuer y SigningKey de al menos 64 bytes.");
            }
        }

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.SaveToken = false;
            options.IncludeErrorDetails = false;
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    if (context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
                        context.NoResult();
                    return Task.CompletedTask;
                }
            };
            options.RequireHttpsMetadata = true;
            options.Audience = audience;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                RequireExpirationTime = true,
                RequireSignedTokens = true,
                ClockSkew = TimeSpan.FromSeconds(30),
                NameClaimType = "sub",
                RoleClaimType = configuration["Authentication:RoleClaimType"] ?? "role"
            };
            if (!string.IsNullOrWhiteSpace(authority))
            {
                options.Authority = authority;
                options.TokenValidationParameters.ValidAlgorithms =
                    new[] { SecurityAlgorithms.RsaSha256, SecurityAlgorithms.EcdsaSha256 };
            }
            else if (!designTime && !allowAnonymous)
            {
                options.TokenValidationParameters.ValidIssuer = issuer;
                options.TokenValidationParameters.ValidAudience = audience;
                options.TokenValidationParameters.IssuerSigningKey =
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey!));
                options.TokenValidationParameters.ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 };
            }
        });
        services.AddBusinessAuthorization(allowAnonymous);
        return services;
    }

    internal static IServiceCollection AddBusinessAuthorization(this IServiceCollection services, bool allowAnonymous)
    {
        services.AddAuthorization(options =>
        {
            void Policy(string name, params string[] roles) => options.AddPolicy(name, policy =>
            {
                if (allowAnonymous) policy.RequireAssertion(_ => true);
                else policy.RequireAuthenticatedUser().RequireRole(roles)
                    .RequireAssertion(context => !string.IsNullOrWhiteSpace(context.User.FindFirst("sub")?.Value));
            });
            Policy("Lectura", "Administrador", "Operador", "Consulta");
            Policy("Escritura", "Administrador", "Operador");
            Policy("Administracion", "Administrador");
            if (!allowAnonymous)
                options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        });
        return services;
    }
}

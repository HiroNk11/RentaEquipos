using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Entitites;
using AlquilerEquipos.Application.Exceptions;
using AlquilerEquipos.Application.Services;
using AlquilerEquipos.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AlquilerEquipos.Infrastructure.Services;

public class ClienteService(AlquilerEquiposDbContext db) : IClienteService
{
    private static ClienteDto Map(Cliente c) => new(c.Id, c.Nombre, c.Apellido, c.Email, c.Telefono, c.Direccion);
    private async Task<Cliente> Buscar(int id, CancellationToken ct) =>
        await db.Clientes.FindAsync(new object[] { id }, ct)
        ?? throw new NotFoundException("Cliente no encontrado.");
    public async Task<IReadOnlyList<ClienteDto>> ListarAsync(ConsultaPagina consulta, CancellationToken ct)
    {
        consulta.Validar();
        return await db.Clientes.AsNoTracking().OrderBy(c => c.Id)
            .Skip(consulta.CalcularOmitidos()).Take(consulta.TamanioPagina)
            .Select(c => new ClienteDto(c.Id, c.Nombre, c.Apellido, c.Email, c.Telefono, c.Direccion))
            .ToListAsync(ct);
    }
    public async Task<ClienteDto> ObtenerAsync(int id, CancellationToken ct) => Map(await Buscar(id, ct));
    private static void Aplicar(Cliente cliente, GuardarClienteDto dto)
    {
        ValidacionEntrada.Validar(dto);
        cliente.Nombre = dto.Nombre.Trim();
        cliente.Apellido = dto.Apellido.Trim();
        cliente.Email = dto.Email.Trim();
        cliente.Telefono = dto.Telefono?.Trim();
        cliente.Direccion = dto.Direccion?.Trim();
    }
    public async Task<ClienteDto> CrearAsync(GuardarClienteDto dto, CancellationToken ct)
    {
        var cliente = new Cliente();
        Aplicar(cliente, dto);
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync(ct);
        return Map(cliente);
    }
    public async Task ActualizarAsync(int id, GuardarClienteDto dto, CancellationToken ct)
    {
        var cliente = await Buscar(id, ct);
        Aplicar(cliente, dto);
        await db.SaveChangesAsync(ct);
    }
    public async Task EliminarAsync(int id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var cliente = await db.Clientes.FromSqlInterpolated(
            $"SELECT * FROM [Clientes] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {id}")
            .SingleOrDefaultAsync(ct) ?? throw new NotFoundException("Cliente no encontrado.");
        if (await db.ReservasAlquiler.AnyAsync(r => r.ClienteId == id, ct))
            throw new ReglaNegocioException("No se puede eliminar un cliente con historial de reservas.");
        db.Clientes.Remove(cliente);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}


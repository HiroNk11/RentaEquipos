using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlquilerEquipos.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReglasEstados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_Reserva_Estado",
                table: "ReservasAlquiler",
                sql: "[Estado] IN ('Pendiente', 'Activa', 'Finalizada', 'Cancelada')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reserva_Finalizacion",
                table: "ReservasAlquiler",
                sql: "([Estado] = 'Finalizada' AND [FechaDevolucionReal] IS NOT NULL) OR ([Estado] <> 'Finalizada' AND [FechaDevolucionReal] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Equipo_Estado",
                table: "Equipos",
                sql: "[Estado] IN ('Disponible', 'EnUso', 'Mantenimiento')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Reserva_Estado",
                table: "ReservasAlquiler");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reserva_Finalizacion",
                table: "ReservasAlquiler");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Equipo_Estado",
                table: "Equipos");
        }
    }
}

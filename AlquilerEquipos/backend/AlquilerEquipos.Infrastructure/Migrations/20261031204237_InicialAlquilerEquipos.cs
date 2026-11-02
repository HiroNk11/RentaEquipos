using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlquilerEquipos.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InicialAlquilerEquipos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clientes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Apellido = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    Telefono = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Direccion = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clientes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Equipos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Marca = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NumeroSerie = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReservasAlquiler",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EquipoId = table.Column<int>(type: "int", nullable: false),
                    ClienteId = table.Column<int>(type: "int", nullable: false),
                    FechaInicio = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaFinEsperada = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaDevolucionReal = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CostoTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservasAlquiler", x => x.Id);
                    table.CheckConstraint("CK_Reserva_Costo", "[CostoTotal] >= 0");
                    table.CheckConstraint("CK_Reserva_Devolucion", "[FechaDevolucionReal] IS NULL OR [FechaDevolucionReal] >= [FechaInicio]");
                    table.CheckConstraint("CK_Reserva_Fechas", "[FechaFinEsperada] > [FechaInicio]");
                    table.ForeignKey(
                        name: "FK_ReservasAlquiler_Clientes_ClienteId",
                        column: x => x.ClienteId,
                        principalTable: "Clientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservasAlquiler_Equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "Equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Equipos_NumeroSerie",
                table: "Equipos",
                column: "NumeroSerie",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReservasAlquiler_ClienteId",
                table: "ReservasAlquiler",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservasAlquiler_EquipoId_FechaInicio_FechaFinEsperada",
                table: "ReservasAlquiler",
                columns: new[] { "EquipoId", "FechaInicio", "FechaFinEsperada" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReservasAlquiler");

            migrationBuilder.DropTable(
                name: "Clientes");

            migrationBuilder.DropTable(
                name: "Equipos");
        }
    }
}

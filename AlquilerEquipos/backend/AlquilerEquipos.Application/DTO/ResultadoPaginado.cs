using System;
using System.Collections.Generic;
using System.Text;

namespace AlquilerEquipos.Application.DTO
{
    public class ResultadoPaginado<T>
    {
        public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
        public int Pagina { get; set; }
        public int TamanioPagina { get; set; }
        public int TotalRegistros { get; set; }
        public int TotalPaginas { get; set; }
    }
}

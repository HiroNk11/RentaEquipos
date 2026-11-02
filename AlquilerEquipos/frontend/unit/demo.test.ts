import test from "node:test";
import assert from "node:assert/strict";
import {
  demoAvailable,
  demoCreateReserva,
  demoAct,
  demoEstado,
  demoRemove,
  demoSaveEquipo,
  demoSaveCliente,
} from "../src/lib/demo.ts";
import type {
  Snapshot,
  ReservaInput,
  EstadoReserva,
} from "../src/domain/types.ts";
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
  configurable: true,
});
const iso = (offset: number) =>
  new Date(Date.now() + offset * 3_600_000).toISOString();
function fixture(): Snapshot {
  return {
    partial: false,
    equipos: [
      {
        id: 1,
        nombre: "Taladro",
        marca: "Prueba",
        numeroSerie: "EQ-1",
        estado: "Disponible",
      },
      {
        id: 2,
        nombre: "Sierra",
        marca: "Prueba",
        numeroSerie: "EQ-2",
        estado: "Mantenimiento",
      },
    ],
    clientes: [
      {
        id: 1,
        nombre: "Ana",
        apellido: "Prueba",
        email: "ana@example.invalid",
        telefono: null,
        direccion: null,
      },
    ],
    reservas: [],
  };
}
const input = (): ReservaInput => ({
  equipoId: 1,
  clienteId: 1,
  fechaInicio: iso(-1),
  fechaFinEsperada: iso(1),
  costoTotal: 100,
});
function reserved(state: EstadoReserva = "Pendiente") {
  const data = demoCreateReserva(fixture(), input());
  data.reservas[0].estado = state;
  if (state === "Activa") data.equipos[0].estado = "EnUso";
  return data;
}

test("la disponibilidad excluye mantenimiento", () => {
  assert.deepEqual(
    demoAvailable(fixture(), iso(1), iso(2)).map((e) => e.id),
    [1],
  );
});
test("los períodos semiabiertos permiten reservas adyacentes", () => {
  const data = reserved(),
    r = data.reservas[0];
  assert.equal(demoAvailable(data, r.fechaFinEsperada, iso(3)).length, 1);
  assert.equal(demoAvailable(data, iso(-3), r.fechaInicio).length, 1);
});
test("el solapamiento parcial y total bloquea reservas", () => {
  const data = reserved();
  for (const [a, b] of [
    [-2, 0],
    [0, 2],
    [-2, 2],
    [-0.5, 0.5],
  ])
    assert.equal(demoAvailable(data, iso(a), iso(b)).length, 0);
});
test("solo pendientes y activas bloquean un período", () => {
  for (const state of [
    "Pendiente",
    "Activa",
    "Cancelada",
    "Finalizada",
  ] as EstadoReserva[]) {
    assert.equal(
      demoAvailable(reserved(state), iso(-0.5), iso(0.5)).length,
      ["Pendiente", "Activa"].includes(state) ? 0 : 1,
    );
  }
});
test("fechas inválidas, iguales o invertidas se rechazan", () => {
  for (const [a, b] of [
    ["bad", iso(1)],
    [iso(1), iso(-1)],
    ["2030-01-01", "2030-01-01"],
  ])
    assert.throws(() => demoAvailable(fixture(), a, b));
});
test("el POST vuelve a comprobar conflictos y existencia de cliente", () => {
  assert.throws(() => demoCreateReserva(reserved(), input()), /disponible/);
  assert.throws(
    () => demoCreateReserva(fixture(), { ...input(), clienteId: 99 }),
    /cliente/,
  );
});
test("centavos y cero se conservan sin error de punto flotante", () => {
  for (const amount of [0, 0.29, 1234.56, 9999999999.99])
    assert.equal(
      demoCreateReserva(fixture(), { ...input(), costoTotal: amount })
        .reservas[0].costoTotal,
      amount,
    );
});
test("importes negativos, no finitos o con más de dos decimales se rechazan", () => {
  for (const amount of [-1, NaN, Infinity, 1.234, 10000000000])
    assert.throws(
      () => demoCreateReserva(fixture(), { ...input(), costoTotal: amount }),
      /importe/,
    );
});
test("el retiro y la devolución mantienen la reserva y el equipo consistentes", () => {
  const data = reserved(),
    id = data.reservas[0].id,
    active = demoAct(data, id, "activar");
  assert.equal(active.reservas[0].estado, "Activa");
  assert.equal(active.equipos[0].estado, "EnUso");
  const returned = demoAct(active, id, "devolver", {
    fechaDevolucionReal: null,
    requiereMantenimiento: false,
  });
  assert.equal(returned.reservas[0].estado, "Finalizada");
  assert.equal(returned.equipos[0].estado, "Disponible");
  assert.ok(returned.reservas[0].fechaDevolucionReal);
  assert.equal(data.reservas[0].estado, "Pendiente");
});
test("devolución con mantenimiento y acciones repetidas son idempotentes", () => {
  let data = reserved(),
    id = data.reservas[0].id;
  data = demoAct(data, id, "activar");
  assert.equal(demoAct(data, id, "activar"), data);
  data = demoAct(data, id, "devolver", {
    fechaDevolucionReal: null,
    requiereMantenimiento: true,
  });
  assert.equal(data.equipos[0].estado, "Mantenimiento");
  assert.equal(demoAct(data, id, "devolver"), data);
});
test("cancelar libera el período y no permite cancelar un alquiler activo", () => {
  const data = reserved(),
    id = data.reservas[0].id,
    canceled = demoAct(data, id, "cancelar");
  assert.equal(demoAvailable(canceled, iso(-0.5), iso(0.5)).length, 1);
  assert.equal(demoAct(canceled, id, "cancelar"), canceled);
  assert.throws(() => demoAct(reserved("Activa"), id, "cancelar"));
});
test("retiro fuera del período o con equipo indisponible se rechaza", () => {
  let data = reserved(),
    id = data.reservas[0].id;
  data.reservas[0].fechaInicio = iso(2);
  data.reservas[0].fechaFinEsperada = iso(3);
  assert.throws(() => demoAct(data, id, "activar"));
  data = reserved();
  data.equipos[0].estado = "Mantenimiento";
  assert.throws(() => demoAct(data, id, "activar"));
});
test("no se puede liberar equipo activo ni devolver con fecha inválida", () => {
  const data = reserved("Activa"),
    id = data.reservas[0].id;
  assert.throws(() => demoEstado(data, 1, "Disponible"));
  for (const value of ["invalid", iso(2), iso(-2)])
    assert.throws(() =>
      demoAct(data, id, "devolver", {
        fechaDevolucionReal: value,
        requiereMantenimiento: false,
      }),
    );
});
test("el historial impide eliminar clientes y equipos", () => {
  const data = reserved("Finalizada");
  assert.throws(() => demoRemove(data, "equipos", 1));
  assert.throws(() => demoRemove(data, "clientes", 1));
  assert.equal(demoRemove(fixture(), "equipos", 1).equipos.length, 1);
});
test("equipos: serie única, campos obligatorios y edición sin perder estado", () => {
  const data = fixture();
  assert.throws(() =>
    demoSaveEquipo(data, {
      nombre: "Otro",
      marca: "Prueba",
      numeroSerie: " eq-1 ",
    }),
  );
  assert.throws(() =>
    demoSaveEquipo(data, {
      nombre: "  ",
      marca: "Prueba",
      numeroSerie: "EQ-3",
    }),
  );
  const edited = demoSaveEquipo(
    data,
    { nombre: " Sierra actualizada ", marca: "Nueva", numeroSerie: "EQ-2" },
    2,
  );
  assert.equal(edited.equipos[1].nombre, "Sierra actualizada");
  assert.equal(edited.equipos[1].estado, "Mantenimiento");
});
test("clientes: campos obligatorios e identificadores inexistentes", () => {
  const data = fixture(),
    client = data.clientes[0];
  assert.throws(() => demoSaveCliente(data, { ...client, nombre: " " }));
  assert.throws(() => demoSaveCliente(data, client, 99));
  assert.throws(() => demoEstado(data, 99, "Disponible"));
  assert.throws(() => demoRemove(data, "clientes", 99));
});

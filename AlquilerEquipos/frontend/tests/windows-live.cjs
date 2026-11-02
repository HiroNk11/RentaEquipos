const { chromium, request } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
(async () => {
  const url = process.env.RENTA_LIVE_BASE_URL || "http://localhost:5280";
  const target = new URL(url);
  if (target.hostname !== "localhost" || target.protocol !== "http:")
    throw new Error("Solo se comprueba localhost.");
  const write = process.argv.includes("--write");
  if (
    write &&
    (target.port !== "5281" ||
      !/^RentaEquiposAcceptance_[a-f0-9]{32}$/.test(
        process.env.RENTA_ACCEPTANCE_DATABASE || "",
      ))
  )
    throw new Error(
      "Las escrituras requieren la base temporal generada por WindowsLive.ps1 y el puerto 5281.",
    );
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--auth-server-allowlist=localhost"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let checks = 0;
  const check = (value, message) => {
    assert.ok(value, message);
    checks++;
  };
  async function api(route, method = "GET", body) {
    return page.evaluate(
      async ({ route, method, body }) => {
        const response = await fetch("/api/" + route, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const text = await response.text();
        return {
          status: response.status,
          data: text ? JSON.parse(text) : null,
        };
      },
      { route, method, body },
    );
  }
  async function visible(locator) {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    checks++;
  }
  try {
    await page.goto(url);
    await visible(
      page.getByRole("heading", { name: "Resumen de operaciones" }),
    );
    const session = await api("session");
    check(
      session.status === 200 && session.data.authentication === "WindowsLocal",
      "Sesion Windows real",
    );
    check(
      (await page.locator(".demo-banner").count()) === 0,
      "No es demostracion",
    );
    const root = await page.request.get(url);
    check(
      (root.headers()["content-security-policy"] || "").includes(
        "frame-ancestors 'none'",
      ),
      "CSP local",
    );
    if (write) {
      await page.getByRole("link", { name: "Equipos", exact: true }).click();
      await page.getByRole("button", { name: "Nuevo equipo" }).click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByLabel("Nombre del equipo")
        .fill("Equipo de verificación");
      await dialog.getByLabel("Marca o línea").fill("Prueba integrada");
      await dialog.getByLabel("Número de serie").fill("ACCEPT-001");
      await dialog.getByRole("button", { name: "Agregar equipo" }).click();
      await dialog.waitFor({ state: "hidden" });
      await page.getByRole("link", { name: "Clientes", exact: true }).click();
      await page.getByRole("button", { name: "Nuevo cliente" }).click();
      await dialog.getByLabel("Nombre", { exact: true }).fill("Prueba");
      await dialog.getByLabel("Apellido", { exact: true }).fill("Integrada");
      await dialog
        .getByLabel("Correo electrónico")
        .fill("acceptance@example.invalid");
      await dialog.getByRole("button", { name: "Registrar cliente" }).click();
      await dialog.waitFor({ state: "hidden" });
      await page
        .getByRole("link", { name: "Reservas", exact: false })
        .first()
        .click();
      await page.getByRole("button", { name: "Nueva reserva" }).click();
      await dialog
        .getByRole("combobox", { name: "Cliente", exact: true })
        .selectOption({ label: "Prueba Integrada" });
      const dates = await page.evaluate(() => {
        const input = (d) =>
          new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        return {
          start: input(new Date(Date.now() - 5 * 60000)),
          end: input(new Date(Date.now() + 24 * 3600000)),
        };
      });
      await dialog.getByLabel("Retiro", { exact: true }).fill(dates.start);
      await dialog
        .getByLabel("Devolución prevista", { exact: true })
        .fill(dates.end);
      await page.waitForFunction(() => {
        const select = document.querySelector("#reserva-equipo");
        return select && !select.disabled && select.options.length > 1;
      });
      await dialog
        .getByRole("combobox", { name: "Equipo", exact: true })
        .selectOption({ index: 1 });
      await dialog.getByLabel("Importe acordado").fill("1234.56");
      await dialog.getByRole("button", { name: "Crear reserva" }).click();
      await dialog.waitFor({ state: "hidden" });
      let list = await api("reservas");
      check(
        list.status === 200 && list.data.length === 1,
        "Reserva persistida en SQL",
      );
      const r = list.data[0];
      check(r.costoTotal === 1234.56, "Centavos reales");
      const conflict = await api("reservas", "POST", {
        equipoId: r.equipoId,
        clienteId: r.clienteId,
        fechaInicio: r.fechaInicio,
        fechaFinEsperada: r.fechaFinEsperada,
        costoTotal: 100,
      });
      check(conflict.status === 409, "Solapamiento rechazado por SQL/API");
      await page.reload();
      await visible(
        page.getByRole("button", { name: "#" + r.id, exact: true }),
      );
      await page.getByRole("button", { name: "#" + r.id, exact: true }).click();
      await dialog.getByRole("button", { name: "Registrar retiro" }).click();
      await dialog.getByRole("button", { name: "Registrar retiro" }).click();
      await dialog.waitFor({ state: "hidden" });
      check(
        (await api("equipos/" + r.equipoId)).data.estado === "EnUso",
        "Retiro real",
      );
      await page.getByRole("button", { name: "#" + r.id, exact: true }).click();
      await dialog
        .getByRole("button", { name: "Registrar devolución" })
        .click();
      await dialog.getByRole("checkbox").check();
      await dialog
        .getByRole("button", { name: "Registrar devolución" })
        .click();
      await dialog.waitFor({ state: "hidden" });
      check(
        (await api("reservas/" + r.id)).data.estado === "Finalizada",
        "Devolucion real",
      );
      check(
        (await api("equipos/" + r.equipoId)).data.estado === "Mantenimiento",
        "Mantenimiento real",
      );
      const range = new URLSearchParams({
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFinEsperada,
      });
      check(
        (await api("equipos/disponibles?" + range)).data.length === 0,
        "Mantenimiento excluido",
      );
      check(
        (
          await api("equipos/" + r.equipoId + "/estado", "PATCH", {
            estado: "Disponible",
          })
        ).status === 204,
        "Salida de mantenimiento",
      );
      const second = await api("reservas", "POST", {
        equipoId: r.equipoId,
        clienteId: r.clienteId,
        fechaInicio: new Date(Date.now() + 2 * 86400000).toISOString(),
        fechaFinEsperada: new Date(Date.now() + 3 * 86400000).toISOString(),
        costoTotal: 0.29,
      });
      check(second.status === 201, "Segunda reserva");
      await page.reload();
      await visible(
        page.getByRole("button", { name: "#" + second.data.id, exact: true }),
      );
      await page
        .getByRole("button", { name: "#" + second.data.id, exact: true })
        .click();
      await dialog.getByRole("button", { name: "Cancelar reserva" }).click();
      await dialog.getByRole("button", { name: "Cancelar reserva" }).click();
      await dialog.waitFor({ state: "hidden" });
      check(
        (await api("reservas/" + second.data.id)).data.estado === "Cancelada",
        "Cancelacion real",
      );
    }
    const anonymous = await request.newContext();
    try {
      check(
        (await anonymous.get(url + "/api/equipos")).status() === 401,
        "Sin credenciales no hay acceso",
      );
      check(
        (
          await anonymous.get(url + "/api/equipos", {
            headers: { Origin: "https://evil.example.invalid" },
          })
        ).status() === 403,
        "Origen ajeno rechazado",
      );
      check(
        (
          await anonymous.post(url + "/api/equipos", {
            data: { nombre: "No guardar" },
          })
        ).status() === 403,
        "Escritura sin Origin rechazada",
      );
      check(
        (
          await anonymous.get(url + "/", {
            headers: { "Sec-Fetch-Site": "cross-site" },
          })
        ).status() === 200,
        "Enlace externo a la web permitido",
      );
    } finally {
      await anonymous.dispose();
    }
    check(errors.length === 0, "Sin errores JavaScript: " + errors.join(";"));
    const folder =
      process.env.RENTA_LIVE_ARTIFACTS ||
      path.resolve("test-results/windows-live");
    await fs.mkdir(folder, { recursive: true });
    await page.screenshot({
      path: path.join(folder, "desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByRole("heading").first().waitFor();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Vista movil sin desbordamiento",
    );
    await page.screenshot({
      path: path.join(folder, "mobile.png"),
      fullPage: true,
    });
    console.log(
      `OK: ${checks} comprobaciones Windows/SQL reales (${write ? "base temporal con CRUD y ciclo completo" : "solo lectura"}).`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

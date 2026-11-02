import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-01T15:00:00Z"));
});
async function go(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator(".demo-banner")).toBeVisible();
}
test("resumen, navegación y recursos visuales", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await go(page);
  await expect(
    page.getByRole("heading", { name: "Resumen de operaciones" }),
  ).toBeVisible();
  await expect(
    page.locator(".stat").first().getByText("6", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".atlas-tool")).toHaveCount(4);
  expect((await page.request.get("/images/equipos-demo.webp")).status()).toBe(
    200,
  );
  await page.getByRole("link", { name: "Equipos", exact: true }).click();
  await expect(page.locator(".equipment-card")).toHaveCount(9);
  await page.getByRole("searchbox").fill("SDS");
  await expect(page.locator(".equipment-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Vista de lista" }).click();
  await expect(page.getByRole("cell", { name: "EQ-ROT-002" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("alta, edición y eliminación de equipo", async ({ page }) => {
  await go(page, "/equipos");
  await page.getByRole("button", { name: "Nuevo equipo" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del equipo").fill("Compresor de prueba");
  await dialog.getByLabel("Marca o línea").fill("Pruebas");
  await dialog.getByLabel("Número de serie").fill("TEST-COMP-001");
  await dialog.getByRole("button", { name: "Agregar equipo" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("searchbox").fill("TEST-COMP");
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click();
  await dialog.getByRole("button", { name: "Editar", exact: true }).click();
  await dialog.getByLabel("Nombre del equipo").fill("Compresor actualizado");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("button", { name: "Compresor actualizado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click();
  await dialog.getByRole("button", { name: "Eliminar equipo" }).click();
  await dialog.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No encontramos equipos" }),
  ).toBeVisible();
});
test("cliente, reserva, disponibilidad y cancelación", async ({ page }) => {
  await go(page, "/clientes");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Ana");
  await dialog.getByLabel("Apellido", { exact: true }).fill("Prueba");
  await dialog.getByLabel("Correo electrónico").fill("ana@example.invalid");
  await dialog.getByRole("button", { name: "Registrar cliente" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "Disponibilidad", exact: true }).click();
  await page.getByLabel("Retiro", { exact: true }).fill("2030-01-15T09:00");
  await page
    .getByLabel("Devolución prevista", { exact: true })
    .fill("2030-01-16T18:00");
  await page.getByRole("button", { name: "Consultar disponibilidad" }).click();
  await expect(page.locator(".equipment-card")).toHaveCount(8);
  await page
    .getByRole("button", {
      name: "Reservar Taladro inalámbrico 20 V",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption({ label: "Ana Prueba" });
  await expect(
    dialog.getByRole("combobox", { name: "Equipo", exact: true }),
  ).toHaveValue("1");
  await dialog.getByLabel("Importe acordado").fill("0.29");
  await dialog.getByRole("button", { name: "Crear reserva" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Consultar disponibilidad" }).click();
  await expect(page.locator(".equipment-card")).toHaveCount(7);
  await page
    .getByRole("link", { name: "Reservas", exact: false })
    .first()
    .click();
  await page.getByRole("searchbox").fill("Ana Prueba");
  await page.getByRole("button", { name: "#1009", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Registrar retiro" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancelar reserva" }).click();
  await dialog.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(
    page.getByRole("table").getByText("Cancelada", { exact: true }),
  ).toBeVisible();
});
test("retiro y devolución con mantenimiento", async ({ page }) => {
  await go(page, "/reservas");
  await page.getByRole("button", { name: "#1003", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Registrar retiro" }).click();
  await dialog.getByRole("button", { name: "Registrar retiro" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "#1003", exact: true }).click();
  await dialog.getByRole("button", { name: "Registrar devolución" }).click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Registrar devolución" }).click();
  await page.getByRole("link", { name: "Equipos", exact: true }).click();
  await page.getByRole("searchbox").fill("EQ-TAL-001");
  await expect(
    page.locator(".equipment-card").getByText("Mantenimiento", { exact: true }),
  ).toBeVisible();
});
test("accesibilidad del resumen y formulario", async ({ page }) => {
  await go(page);
  await page.evaluate(() => document.fonts.ready);
  const summary = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    summary.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Nueva reserva" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Equipo", exact: true }),
  ).toBeEnabled();
  const form = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    form.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("móvil: navegación y vistas sin desbordamiento de página", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page);
  await page.waitForTimeout(250);
  for (const route of [
    "/",
    "/equipos",
    "/disponibilidad",
    "/reservas",
    "/clientes",
  ]) {
    await page.goto(route);
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/mobile-${route.replace("/", "") || "resumen"}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Equipos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Equipos e inventario" }),
  ).toBeVisible();
});

test("accesibilidad de inventario, reservas, clientes y disponibilidad", async ({
  page,
}) => {
  for (const route of [
    "/equipos",
    "/reservas",
    "/clientes",
    "/disponibilidad",
  ]) {
    await go(page, route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
test("menú móvil contiene el foco y Escape lo devuelve al disparador", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page);
  const menu = page.getByRole("button", { name: "Abrir menú" });
  await menu.click();
  await expect(page.locator(".workspace")).toHaveAttribute("inert", "");
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Restablecer datos" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "RentaEquipos GESTIÓN DE ALQUILERES" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.locator(".workspace")).not.toHaveAttribute("inert", "");
});
test("adaptación a 320, 768 y 1920 píxeles", async ({ page }) => {
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/equipos",
      "/reservas",
      "/clientes",
      "/disponibilidad",
    ]) {
      await go(page, route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await go(page, "/equipos");
    await page.screenshot({
      path: `test-results/inventario-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Nuevo equipo" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Nombre del equipo")).toBeFocused();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Escape");
  }
});

test("el retiro por defecto permite alquiler inmediato en el minuto actual", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-01T15:07:30Z"));
  await go(page);
  await page.getByRole("button", { name: "Nueva reserva" }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Retiro", { exact: true }),
  ).toHaveValue("2026-11-01T12:07");
});

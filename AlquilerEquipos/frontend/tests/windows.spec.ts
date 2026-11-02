import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.PLAYWRIGHT_WINDOWS_BASE_URL || "http://127.0.0.1:5177",
});
test("sesión Windows: carga, bloqueo de pantalla y reingreso sin tokens", async ({
  page,
}) => {
  const headers: string[] = [];
  await page.route("**/api/**", async (route) => {
    headers.push(route.request().headers().authorization || "");
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      json:
        path === "/api/session"
          ? {
              name: "PC\\Persona",
              roles: ["Administrador"],
              authentication: "WindowsLocal",
            }
          : path === "/api/equipos"
            ? [
                {
                  id: 1,
                  nombre: "Equipo persistente",
                  marca: "Prueba",
                  numeroSerie: "WIN-1",
                  estado: "Disponible",
                },
              ]
            : [],
    });
  });
  await page.goto("/equipos");
  await expect(
    page.getByRole("button", { name: "Equipo persistente", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nuevo equipo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ocultar datos" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu espacio te espera" }),
  ).toBeVisible();
  await expect(page.locator(".equipment-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Equipo persistente", exact: true }),
  ).toBeVisible();
  expect(headers.every((value) => value === "")).toBe(true);
  const saved = await page.evaluate(() =>
    JSON.stringify({ ...sessionStorage, ...localStorage }),
  );
  expect(saved).not.toContain("PC\\Persona");
  expect(saved).not.toContain("access_token");
});
test("cuenta Windows rechazada no carga datos comerciales", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path !== "/api/session") requests++;
    await route.fulfill({ status: 403, json: { title: "Denied" } });
  });
  await page.goto("/");
  await expect(
    page.getByText(
      "Tu cuenta de Windows no está habilitada para este espacio.",
    ),
  ).toBeVisible();
  await expect(page.locator(".equipment-card")).toHaveCount(0);
  expect(requests).toBe(0);
});
test("no se acepta un servidor Bearer como sesión Windows", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        name: "Otra cuenta",
        roles: ["Administrador"],
        authentication: "Bearer",
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("El servidor no tiene habilitado el acceso Windows local."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva reserva" })).toHaveCount(
    0,
  );
});

test("base vacía ofrece altas iniciales y evita una reserva incompleta", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).pathname === "/api/session"
          ? {
              name: "PC\\Persona",
              roles: ["Administrador"],
              authentication: "WindowsLocal",
            }
          : [],
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Nueva reserva" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Agregar primer equipo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar primer cliente" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Agregar primer equipo" }).click();
  await expect(
    page.getByRole("dialog", { name: "Nuevo equipo" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Registrar primer cliente" }).click();
  await expect(
    page.getByRole("dialog", { name: "Nuevo cliente" }),
  ).toBeVisible();
});

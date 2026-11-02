import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({
  baseURL: process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:5175",
});
const equipment = {
  id: 21,
  nombre: "Compresor API",
  marca: "Pruebas HTTP",
  numeroSerie: "API-021",
  estado: "Disponible",
};
const client = {
  id: 31,
  nombre: "Cliente",
  apellido: "API",
  email: "api@example.invalid",
  telefono: null,
  direccion: null,
};

test("esqueletos por pantalla durante carga y actualización, sin spinner", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/equipos",
    "/clientes",
    "/reservas",
    "/disponibilidad",
  ]) {
    await page.unrouteAll({ behavior: "wait" });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await routes(page, async () => {
      await gate;
      return false;
    });
    await page.goto(path);
    const loading = page.getByRole("status", { name: "Cargando tu espacio" });
    try {
      await expect(loading).toBeVisible();
      await expect(loading).toHaveAttribute("aria-busy", "true");
      await expect(page.locator(".spin")).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "No encontramos equipos" }),
      ).toHaveCount(0);
      const a11y = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(a11y.violations).toEqual([]);
      await page.screenshot({
        path: `test-results/skeleton-${path.replace("/", "") || "resumen"}.png`,
        fullPage: true,
      });
    } finally {
      release();
    }
    await expect(loading).toHaveCount(0);
    await expect(page.locator("main h1")).toBeVisible();
  }
});

test("disponibilidad muestra esqueletos, error recuperable y resultado vacío", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let failed = true;
  await routes(page, async (route) => {
    if (new URL(route.request().url()).pathname !== "/api/equipos/disponibles")
      return false;
    await gate;
    await route.fulfill(
      failed
        ? { status: 500, json: { title: "Error temporal" } }
        : { json: [] },
    );
    return true;
  });
  await page.goto("/disponibilidad");
  const submit = page.getByRole("button", { name: "Consultar disponibilidad" });
  await submit.click();
  try {
    await expect(
      page.getByRole("status", { name: "Consultando disponibilidad" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Consultando..." }),
    ).toBeDisabled();
    await expect(
      page.getByText("Elegí las fechas del próximo alquiler"),
    ).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Elegí las fechas del próximo alquiler"),
  ).toHaveCount(0);
  failed = false;
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Sin disponibilidad para este período" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
async function routes(
  page: Page,
  handler?: (route: Route) => Promise<boolean>,
) {
  await page.route("**/api/**", async (route) => {
    if (handler && (await handler(route))) return;
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/equipos") return route.fulfill({ json: [equipment] });
    if (path === "/api/clientes") return route.fulfill({ json: [client] });
    if (path === "/api/reservas") return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { title: "Not found" } });
  });
}
test("carga API sin fotografías ficticias ni mezcla de demostración", async ({
  page,
}) => {
  await routes(page);
  await page.goto("/equipos");
  await expect(
    page.getByRole("button", { name: "Compresor API", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await expect(page.locator(".atlas-tool")).toHaveCount(0);
  await expect(page.locator(".tool-image svg")).toHaveCount(1);
});
test("401 no reemplaza datos por demostración y permite reintentar", async ({
  page,
}) => {
  let denied = true;
  await routes(page, async (route) => {
    if (denied) {
      await route.fulfill({ status: 401, json: { title: "Unauthorized" } });
      return true;
    }
    return false;
  });
  await page.goto("/");
  await expect(
    page.getByText("Tu sesión venció o no está autorizada. Volvé a ingresar."),
  ).toBeVisible();
  await expect(page.locator(".equipment-card")).toHaveCount(0);
  denied = false;
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.locator(".stat").first().getByText("1", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
});
test("disponibilidad envía UTC, rango y paginación; POST conserva contrato", async ({
  page,
}) => {
  let range: URL | undefined, body: Record<string, unknown> | undefined;
  await routes(page, async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname === "/api/equipos/disponibles") {
      range = url;
      await route.fulfill({ json: [equipment] });
      return true;
    }
    if (url.pathname === "/api/reservas" && request.method() === "POST") {
      body = request.postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          ...body,
          id: 99,
          estado: "Pendiente",
          fechaDevolucionReal: null,
        },
      });
      return true;
    }
    return false;
  });
  await page.goto("/reservas");
  await page.getByRole("button", { name: "Nueva reserva" }).click();
  const d = page.getByRole("dialog");
  await d
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption("31");
  await d.getByLabel("Retiro", { exact: true }).fill("2030-03-10T10:00");
  await d
    .getByLabel("Devolución prevista", { exact: true })
    .fill("2030-03-11T18:00");
  await expect(
    d.getByRole("combobox", { name: "Equipo", exact: true }),
  ).toBeEnabled();
  await d
    .getByRole("combobox", { name: "Equipo", exact: true })
    .selectOption("21");
  await d.getByLabel("Importe acordado").fill("1234.56");
  await d.getByRole("button", { name: "Crear reserva" }).click();
  await expect(d).not.toBeVisible();
  expect(range?.searchParams.get("pagina")).toBe("1");
  expect(range?.searchParams.get("tamanioPagina")).toBe("100");
  expect(range?.searchParams.get("fechaInicio")).toMatch(/Z$/);
  expect(body).toMatchObject({
    equipoId: 21,
    clienteId: 31,
    costoTotal: 1234.56,
  });
  expect(body?.fechaInicio).toBe(range?.searchParams.get("fechaInicio"));
  expect(body?.fechaInicio).toBe("2030-03-10T13:00:00.000Z");
  await expect(
    page.getByRole("table").getByText("$ 1.234,56", { exact: true }),
  ).toBeVisible();
});
test("409 preserva formulario y no reintenta automáticamente", async ({
  page,
}) => {
  let posts = 0;
  await routes(page, async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path === "/api/equipos/disponibles") {
      await route.fulfill({ json: [equipment] });
      return true;
    }
    if (path === "/api/reservas" && request.method() === "POST") {
      posts++;
      await route.fulfill({
        status: 409,
        json: {
          title: "Conflicto",
          detail: "El equipo ya tiene una reserva en ese período.",
        },
      });
      return true;
    }
    return false;
  });
  await page.goto("/reservas");
  await page.getByRole("button", { name: "Nueva reserva" }).click();
  const d = page.getByRole("dialog");
  await d
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption("31");
  await expect(
    d.getByRole("combobox", { name: "Equipo", exact: true }),
  ).toBeEnabled();
  await d
    .getByRole("combobox", { name: "Equipo", exact: true })
    .selectOption("21");
  await d.getByLabel("Importe acordado").fill("100");
  await d.getByRole("button", { name: "Crear reserva" }).click();
  await expect(d.getByRole("alert")).toHaveText(
    "El equipo ya tiene una reserva en ese período.",
  );
  await expect(d.getByLabel("Importe acordado")).toHaveValue("100");
  expect(posts).toBe(1);
});
test("errores 403 y escrituras inciertas se presentan sin éxito falso", async ({
  page,
}) => {
  let status = 403,
    posts = 0;
  await routes(page, async (route) => {
    if (route.request().method() === "POST") {
      posts++;
      await route.fulfill({ status, json: { title: "Error" } });
      return true;
    }
    return false;
  });
  await page.goto("/equipos");
  await page.getByRole("button", { name: "Nuevo equipo" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nombre del equipo").fill("Nuevo");
  await d.getByLabel("Marca o línea").fill("Test");
  await d.getByLabel("Número de serie").fill("X");
  await d.getByRole("button", { name: "Agregar equipo" }).click();
  await expect(d.getByRole("alert")).toHaveText(
    "Tu cuenta no tiene permiso para esta acción.",
  );
  status = 503;
  await d.getByRole("button", { name: "Agregar equipo" }).click();
  await expect(d.getByRole("alert")).toContainText(
    "No se pudo confirmar el resultado",
  );
  expect(posts).toBe(2);
  await expect(d).toBeVisible();
});
test("cambio explícito de espacio aísla los datos", async ({ page }) => {
  await routes(page);
  await page.goto("/equipos");
  await expect(
    page.getByRole("button", { name: "Compresor API", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Conexión API", exact: false })
    .click();
  await page.getByRole("button", { name: "Abrir demostración" }).click();
  await expect(page.locator(".demo-banner")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compresor API", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cambiar espacio" }).click();
  await page.getByRole("button", { name: "Conectar con la API" }).click();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Compresor API", exact: true }),
  ).toBeVisible();
});

test("paginación acotada advierte vista parcial y no inventa disponibilidad", async ({
  page,
}) => {
  const pages = new Set<number>();
  await routes(page, async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname === "/api/equipos" ||
      url.pathname === "/api/equipos/disponibles"
    ) {
      const number = Number(url.searchParams.get("pagina"));
      pages.add(number);
      await route.fulfill({
        json: Array.from({ length: 100 }, (_, i) => ({
          ...equipment,
          id: (number - 1) * 100 + i + 1,
          nombre: `Equipo ${number}-${i}`,
        })),
      });
      return true;
    }
    return false;
  });
  await page.goto("/disponibilidad");
  await expect(
    page.getByText("Vista parcial:", { exact: false }),
  ).toBeVisible();
  expect([...pages].sort()).toEqual([1, 2, 3, 4, 5]);
  pages.clear();
  await page.getByRole("button", { name: "Consultar disponibilidad" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "No se muestran resultados incompletos",
  );
  await expect(page.locator(".equipment-card")).toHaveCount(0);
  expect([...pages].sort()).toEqual([1, 2, 3, 4, 5]);
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("diseño adaptativo y accesibilidad en móvil, tablet y escritorio", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/equipos",
      "/clientes",
      "/reservas",
      "/disponibilidad",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width <= 1024)
        await expect(
          page.getByRole("button", { name: "Abrir menú" }),
        ).toBeVisible();
      if (width <= 1024 && route === "/reservas") {
        const table = page.getByRole("region", { name: "Listado de reservas" });
        expect(
          await table.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        await expect(
          table.getByRole("columnheader", { name: "Equipo", exact: true }),
        ).toBeAttached();
      }
      if ([390, 768, 1440].includes(width)) {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          result.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
      }
      if ([390, 768, 1440].includes(width))
        await page.screenshot({
          path: `test-results/design-${width}-${route.replace("/", "") || "resumen"}.png`,
          fullPage: true,
        });
    }
  }
});

test("filtros vacíos ofrecen recuperación y respetan movimiento reducido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/equipos");
  await page.getByRole("searchbox").fill("no-existe-ningun-equipo");
  await expect(
    page.getByRole("heading", { name: "No encontramos equipos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.locator(".equipment-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Nuevo equipo" }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Nombre del equipo"),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Nuevo equipo" }),
  ).toBeFocused();
});

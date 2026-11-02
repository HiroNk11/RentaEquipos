import { test, expect, type Page } from "@playwright/test";
test.use({
  baseURL: process.env.PLAYWRIGHT_AUTH_BASE_URL || "http://127.0.0.1:5176",
});
const origin = "http://127.0.0.1:5176",
  authority = origin + "/oidc";
const jwt = (claims: object) =>
  Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  ) +
  "." +
  Buffer.from(JSON.stringify(claims)).toString("base64url") +
  ".testsignature";
async function identity(page: Page, role: string) {
  let nonce = "",
    token = "",
    challenge = "";
  const headers: string[] = [];
  await page.route("**/oidc/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/.well-known/openid-configuration"))
      return route.fulfill({
        json: {
          issuer: authority,
          authorization_endpoint: authority + "/authorize",
          token_endpoint: authority + "/token",
          userinfo_endpoint: authority + "/userinfo",
          end_session_endpoint: authority + "/logout",
          jwks_uri: authority + "/jwks",
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
          code_challenge_methods_supported: ["S256"],
        },
      });
    if (url.pathname.endsWith("/authorize")) {
      nonce = url.searchParams.get("nonce") || "";
      challenge = url.searchParams.get("code_challenge") || "";
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("response_type")).toBe("code");
      return route.fulfill({
        status: 302,
        headers: {
          location:
            origin +
            "/?code=test-code&state=" +
            encodeURIComponent(url.searchParams.get("state") || ""),
        },
      });
    }
    if (url.pathname.endsWith("/token")) {
      const fields = new URLSearchParams(route.request().postData() || "");
      expect(fields.get("code_verifier")).toBeTruthy();
      expect(fields.has("client_secret")).toBe(false);
      const now = Math.floor(Date.now() / 1000),
        common = {
          iss: authority,
          sub: "test-user",
          iat: now,
          exp: now + 3600,
        };
      token = jwt({ ...common, aud: "alquiler-api", role });
      return route.fulfill({
        json: {
          access_token: token,
          id_token: jwt({
            ...common,
            aud: "renta-test",
            nonce,
            name: "Persona de prueba",
            role,
          }),
          token_type: "Bearer",
          scope: "openid profile",
          expires_in: 3600,
        },
      });
    }
    if (url.pathname.endsWith("/userinfo"))
      return route.fulfill({
        json: { sub: "test-user", name: "Persona de prueba", role },
      });
    if (url.pathname.endsWith("/logout"))
      return route.fulfill({
        status: 302,
        headers: { location: origin + "/" },
      });
    return route.fulfill({
      status: 404,
      json: { error: "unsupported_mock_endpoint" },
    });
  });
  await page.route("**/api/**", async (route) => {
    headers.push(route.request().headers().authorization || "");
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json:
        path === "/api/equipos"
          ? [
              {
                id: 1,
                nombre: "Equipo autenticado",
                marca: "Prueba",
                numeroSerie: "AUTH-001",
                estado: "Disponible",
              },
            ]
          : [],
    });
  });
  return { headers, token: () => token, challenge: () => challenge };
}
for (const role of ["Consulta", "Operador", "Administrador"]) {
  test(`OIDC PKCE y permisos visuales de ${role}`, async ({ page }) => {
    const mock = await identity(page, role);
    await page.goto("/equipos");
    await expect(
      page.getByRole("heading", { name: "Tu espacio te espera" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("button", { name: "Equipo autenticado", exact: true }),
    ).toBeVisible();
    expect(mock.challenge().length).toBeGreaterThan(20);
    expect(mock.headers.length).toBeGreaterThan(0);
    expect(
      mock.headers.every((value) => value === "Bearer " + mock.token()),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Nuevo equipo" }),
    ).toHaveCount(role === "Consulta" ? 0 : 1);
    await page
      .getByRole("button", { name: "Ver detalle", exact: true })
      .click();
    const d = page.getByRole("dialog");
    await expect(
      d.getByRole("button", { name: "Editar", exact: true }),
    ).toHaveCount(role === "Consulta" ? 0 : 1);
    await expect(
      d.getByRole("button", { name: "Eliminar equipo", exact: true }),
    ).toHaveCount(role === "Administrador" ? 1 : 0);
    await page.keyboard.press("Escape");
    const storage = await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    );
    expect(storage).not.toContain(mock.token());
    expect(storage).not.toContain("id_token");
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Tu espacio te espera" }),
    ).toBeVisible();
  });
}

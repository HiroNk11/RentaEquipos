import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const lock = JSON.parse(
  await readFile(path.join(root, "package-lock.json"), "utf8"),
);
const sections = [
  "RentaEquipos Web - Third-party runtime notices\n\nGenerated from package-lock.json. These notices do not define the license of the application itself.",
];
let count = 0;
for (const [relative, info] of Object.entries(lock.packages).sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  if (!relative.startsWith("node_modules/") || info.dev) continue;
  const directory = path.join(root, relative);
  const manifest = JSON.parse(
    await readFile(path.join(directory, "package.json"), "utf8"),
  );
  const files = (await readdir(directory)).filter((name) =>
    /^(licen[cs]e|copying|notice)(\.|$)/i.test(name),
  );
  const notices = await Promise.all(
    files.map(
      async (name) =>
        name + "\n\n" + (await readFile(path.join(directory, name), "utf8")),
    ),
  );
  if (!files.length) {
    const repository =
      typeof manifest.repository === "string"
        ? manifest.repository
        : manifest.repository?.url;
    notices.push(
      `Upstream package does not include a root license text. Declared license: ${manifest.license || info.license || "not specified"}. Source: ${repository || manifest.homepage || manifest.name}.`,
    );
  }
  sections.push(
    `${"=".repeat(72)}\n${manifest.name} ${manifest.version}\nLicense: ${manifest.license || info.license || "See notice"}\n\n${notices.join("\n\n")}`,
  );
  count++;
}
await writeFile(
  path.join(root, "public", "THIRD_PARTY_NOTICES.txt"),
  sections.join("\n\n") + "\n",
);
console.log(`Generated notices for ${count} runtime packages.`);

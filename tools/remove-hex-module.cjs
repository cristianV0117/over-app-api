#!/usr/bin/env node
/**
 * Elimina un módulo generado con generate-hex-module y lo quita de app.module.ts.
 *
 * Uso:
 *   npm run remove:hex -- <nombre-base> [--with-schema]
 *
 * Ejemplos:
 *   npm run remove:hex -- webhook              → borra src/webhooks y WebhooksModule
 *   npm run remove:hex -- webhook --with-schema → también borra webhook.schema.ts
 *
 * No borra schemas compartidos sin --with-schema (p. ej. login-log usado en Users).
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

function pluralizeKebab(kebab) {
  const parts = kebab.split("-");
  const last = parts[parts.length - 1];
  let pl = last;
  if (last === "log") pl = "logs";
  else if (last === "status") pl = "statuses";
  else if (last.endsWith("y") && last.length > 1 && !/^[aeiou]y$/.test(last))
    pl = last.slice(0, -1) + "ies";
  else if (last.endsWith("s")) pl = last;
  else pl = last + "s";
  return [...parts.slice(0, -1), pl].join("-");
}

function toSingularLastSegment(segment) {
  if (segment === "logs") return "log";
  if (segment === "statuses") return "status";
  if (segment.endsWith("ies")) return segment.slice(0, -3) + "y";
  if (segment.endsWith("s") && segment.length > 1) return segment.slice(0, -1);
  return segment;
}

function folderKebabToEntityPascal(folderKebab) {
  const parts = folderKebab.split("-");
  const lastSing = toSingularLastSegment(parts[parts.length - 1]);
  const allParts = [...parts.slice(0, -1), lastSing];
  return allParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

function pascalFromKebab(kebab) {
  return kebab
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function resolveNames(nameArg) {
  if (!nameArg) {
    console.error(
      "Uso: npm run remove:hex -- <nombre-base> [--with-schema]\nEjemplo: npm run remove:hex -- webhook"
    );
    process.exit(1);
  }
  const baseKebab = toKebab(nameArg);
  const folderKebab = pluralizeKebab(baseKebab);
  const entityPascal = folderKebabToEntityPascal(folderKebab);
  const pluralPascal = pascalFromKebab(folderKebab);
  const entityKebabSingular = toKebab(entityPascal);
  return {
    folderKebab,
    entityKebabSingular,
    entityPascal,
    pluralPascal,
  };
}

function schemaPath(names) {
  return path.join(
    srcDir,
    "shared/infrastructure/mongo/schemas",
    `${names.entityKebabSingular}.schema.ts`
  );
}

function removeDir(target) {
  if (!fs.existsSync(target)) {
    console.warn(`No existe: ${path.relative(root, target)}`);
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Eliminado: ${path.relative(root, target)}`);
}

function unpatchAppModule(names) {
  const appPath = path.join(srcDir, "app.module.ts");
  let text = fs.readFileSync(appPath, "utf8");
  const moduleClass = `${names.pluralPascal}Module`;
  if (!text.includes(moduleClass)) {
    console.warn(`app.module.ts no referencia ${moduleClass}; nada que quitar ahí.`);
    return;
  }

  const importLine = `import { ${moduleClass} } from "./${names.folderKebab}/infrastructure/modules/${names.folderKebab}.module";`;
  const variants = [
    importLine + "\n",
    importLine + "\r\n",
    importLine,
  ];
  for (const v of variants) {
    text = text.split(v).join("");
  }

  text = text.replace(new RegExp(`^\\s*${moduleClass},\\s*\\n`, "m"), "");
  text = text.replace(new RegExp(`\\n\\s*${moduleClass},`, "g"), "");
  text = text.replace(new RegExp(`,\\s*${moduleClass}\\s*`, "g"), "");

  fs.writeFileSync(appPath, text, "utf8");
  console.log(`Actualizado: ${path.relative(root, appPath)}`);
}

function main() {
  const args = process.argv.slice(2);
  const withSchema = args.includes("--with-schema");
  const nameArg = args.find((a) => !a.startsWith("--"));
  const names = resolveNames(nameArg);

  const featureDir = path.join(srcDir, names.folderKebab);
  removeDir(featureDir);

  unpatchAppModule(names);

  if (withSchema) {
    const sp = schemaPath(names);
    if (fs.existsSync(sp)) {
      fs.unlinkSync(sp);
      console.log(`Eliminado schema: ${path.relative(root, sp)}`);
    } else {
      console.warn(`No hay schema en: ${path.relative(root, sp)}`);
    }
  } else if (fs.existsSync(schemaPath(names))) {
    console.log(
      `Nota: el schema ${path.relative(root, schemaPath(names))} sigue existiendo. Usa --with-schema para borrarlo (ojo si lo usa otro módulo).`
    );
  }

  console.log("\nListo. Ejecuta npm run build para verificar.");
}

main();

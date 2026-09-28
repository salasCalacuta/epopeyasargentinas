const fs = require("fs");
const path = require("path");
const root = "d:/Juego/web";
const files = ["index.html", "privacidad.html", "terminos.html", "condiciones.html"];
const missing = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(root, f), "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((h) => !h.startsWith("mailto:") && !h.startsWith("http") && !h.startsWith("#"));
  for (const h of hrefs) {
    const p = path.join(root, h.split("?")[0]);
    if (!fs.existsSync(p)) missing.push(`${f} -> ${h}`);
  }
}
console.log(missing.length ? "MISSING " + missing.join("; ") : "local hrefs ok");
console.log(
  "legal txt",
  fs.existsSync(root + "/legal/terminos-condiciones.txt"),
  fs.existsSync(root + "/legal/condiciones-de-uso.txt")
);
const g = fs.readFileSync(root + "/game.js", "utf8");
["btn-inicio", "btn-pausa", "btn-volver", "btn-historial", "btn-stats", "btn-intro"].forEach((id) => {
  console.log(id, g.includes(`"${id}"`) || g.includes(`'${id}'`) ? "handler ok" : "MISSING");
});

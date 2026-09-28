const fs = require("fs");
const q = JSON.parse(fs.readFileSync("preguntas-hoja3.json", "utf8"));
function esc(s) {
  return '"' + String(s).replace(/"/g, '""') + '"';
}
let csv = "pregunta,opcion1,opcion2,opcion3,correcta,bonus,fuente\n";
for (const p of q) {
  csv += [
    esc(p.pregunta),
    esc(p.opciones[0]),
    esc(p.opciones[1]),
    esc(p.opciones[2]),
    p.correcta,
    p.bonus ? "si" : "no",
    esc(p.fuente || ""),
  ].join(",") + "\n";
}
fs.writeFileSync("preguntas-hoja3.csv", csv, "utf8");
fs.writeFileSync("../MaterialSeba/preguntas-hoja3-invasiones-1806.csv", csv, "utf8");
console.log("csv rows", q.length);

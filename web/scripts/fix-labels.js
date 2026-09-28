const fs = require("fs");
let s = fs.readFileSync("game.js", "utf8");
s = s.replace(/label:\s*"Abrir[^"]*"/g, 'label: "Abrir para más información"');
fs.writeFileSync("game.js", s);
console.log("labels", (s.match(/Abrir para más información/g) || []).length);

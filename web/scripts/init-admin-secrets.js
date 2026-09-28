const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const secretsDir = path.join(__dirname, "..", ".agente");
const secretsPath = path.join(secretsDir, "admin-secrets.json");
if (!fs.existsSync(secretsDir)) fs.mkdirSync(secretsDir, { recursive: true });

const user = process.env.ADMIN_USER;
const pass = process.env.ADMIN_PASS;
if (!user || !pass) {
  console.error("Definí ADMIN_USER y ADMIN_PASS en el entorno (no se guardan en el repo).");
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(pass, salt, 64).toString("hex");

const payload = {
  user,
  salt,
  hash,
  createdAt: new Date().toISOString(),
  note: "No servir por HTTP. Solo lectura del server.js",
};
fs.writeFileSync(secretsPath, JSON.stringify(payload, null, 2), { mode: 0o600 });
console.log("Admin secrets escritos en", secretsPath);
console.log("Usuario:", user, "(clave NO guardada en texto plano)");

/**
 * Servidor Epopeyas Argentinas
 * - Auth básica del juego (leo/juego) opcional vía AUTH_ENABLED
 * - Panel admin /admin con sesión httpOnly + scrypt (secretos fuera del webroot público)
 * - APIs: preguntas, stats, ads, versiones, telemetría
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3460);
const ROOT = __dirname;
const IS_RENDER = process.env.RENDER === "true" || !!process.env.RENDER_EXTERNAL_URL;
// En Render el juego es público por defecto; auth básica opcional con AUTH_ENABLED=1
const AUTH_ENABLED = process.env.AUTH_ENABLED === "1" || (!IS_RENDER && process.env.AUTH_ENABLED !== "0");
const USER = process.env.GAME_USER || "leo";
const PASS = process.env.GAME_PASS || "juego";

const AGENTE_DIR = path.join(ROOT, ".agente");
const DATA_DIR = path.join(ROOT, "data");
const ADS_DIR = path.join(DATA_DIR, "ads");
const SECRETS_PATH = path.join(AGENTE_DIR, "admin-secrets.json");
const SESSIONS_PATH = path.join(AGENTE_DIR, "admin-sessions.json");
const STATS_PATH = path.join(DATA_DIR, "stats.json");
const ADS_PATH = path.join(DATA_DIR, "ads.json");
const VERSIONES_PATH = path.join(DATA_DIR, "versiones.json");
const PREGUNTAS_PATH = path.join(ROOT, "preguntas.json");
const BANCO_PATH = path.join(ROOT, "preguntas-banco.js");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY = 12 * 1024 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 8;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const BLOCKED_PREFIXES = [".agente", "node_modules", "scripts", "admin"];
const BLOCKED_FILES = new Set([
  "agente-preguntas-config.json",
  "agente-online-config.json",
  "url-publica.txt",
  "TUNEL-FIJO.md",
  "package-lock.json",
]);

/** @type {Map<string, {count:number,reset:number}>} */
const loginAttempts = new Map();
/** @type {Map<string, {user:string,exp:number}>} */
let sessions = new Map();

function ensureDirs() {
  [AGENTE_DIR, DATA_DIR, ADS_DIR, path.join(ROOT, "admin")].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  if (!fs.existsSync(STATS_PATH)) fs.writeFileSync(STATS_PATH, JSON.stringify({ sesiones: [], eventos: [] }, null, 2));
  if (!fs.existsSync(ADS_PATH)) fs.writeFileSync(ADS_PATH, JSON.stringify({ entreNiveles: [] }, null, 2));
  if (!fs.existsSync(VERSIONES_PATH)) {
    fs.writeFileSync(VERSIONES_PATH, JSON.stringify([{ version: "1.12", fecha: new Date().toISOString().slice(0, 10), cambios: [] }], null, 2));
  }
}

function loadSessions() {
  try {
    const raw = JSON.parse(fs.readFileSync(SESSIONS_PATH, "utf8"));
    sessions = new Map(Object.entries(raw || {}));
  } catch {
    sessions = new Map();
  }
}

function saveSessions() {
  const obj = {};
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (v.exp > now) obj[k] = v;
  }
  sessions = new Map(Object.entries(obj));
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(obj, null, 2), { mode: 0o600 });
}

function writeAdminSecrets(user, pass, note) {
  if (!fs.existsSync(AGENTE_DIR)) fs.mkdirSync(AGENTE_DIR, { recursive: true });
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pass, salt, 64).toString("hex");
  fs.writeFileSync(
    SECRETS_PATH,
    JSON.stringify(
      {
        user,
        salt,
        hash,
        createdAt: new Date().toISOString(),
        note: note || "Generado desde variables de entorno",
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
}

function ensureAdminSecrets() {
  const user = String(process.env.ADMIN_USER || "").trim();
  const pass = String(process.env.ADMIN_PASS || "");
  if (user && pass) {
    // En Render el disco es efímero: recrear desde env si falta el archivo.
    if (!fs.existsSync(SECRETS_PATH) || IS_RENDER) {
      writeAdminSecrets(user, pass, "Sincronizado desde ADMIN_USER/ADMIN_PASS");
      console.log("Admin secrets listos desde entorno (usuario:", user + ")");
    }
    return;
  }
  if (!fs.existsSync(SECRETS_PATH) && IS_RENDER) {
    console.warn("AVISO: faltan ADMIN_USER/ADMIN_PASS. El panel /tefi no podrá autenticar hasta configurarlos.");
  }
}

function cookieAttrs(req) {
  const xf = String(req.headers["x-forwarded-proto"] || "");
  const secure = xf.split(",")[0].trim() === "https" || process.env.FORCE_SECURE_COOKIE === "1";
  // Lax: el POST de login en la misma pestaña guarda la cookie de forma fiable detrás de proxy HTTPS.
  return `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function loadSecrets() {
  ensureAdminSecrets();
  if (!fs.existsSync(SECRETS_PATH)) {
    throw new Error("Falta admin secrets. Definí ADMIN_USER y ADMIN_PASS o ejecutá node scripts/init-admin-secrets.js");
  }
  return JSON.parse(fs.readFileSync(SECRETS_PATH, "utf8"));
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function verifyAdmin(user, pass) {
  const u = String(user || "").trim();
  const p = String(pass || "");
  const envUser = String(process.env.ADMIN_USER || "").trim();
  const envPass = String(process.env.ADMIN_PASS || "");
  // Prioridad: variables de entorno (Render / reinicios).
  if (envUser && envPass) {
    return timingSafeEqualStr(u, envUser) && timingSafeEqualStr(p, envPass);
  }
  try {
    const sec = loadSecrets();
    if (!timingSafeEqualStr(u, sec.user)) return false;
    const hash = crypto.scryptSync(p, sec.salt, 64).toString("hex");
    return timingSafeEqualStr(hash, sec.hash);
  } catch (e) {
    console.warn("verifyAdmin:", e.message || e);
    return false;
  }
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  raw.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i < 0) return;
    out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function getSession(req) {
  const c = parseCookies(req);
  const sid = c.epopeyas_admin;
  if (!sid || !sessions.has(sid)) return null;
  const s = sessions.get(sid);
  if (s.exp < Date.now()) {
    sessions.delete(sid);
    saveSessions();
    return null;
  }
  return s;
}

function createSession(user) {
  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, { user, exp: Date.now() + SESSION_TTL_MS });
  saveSessions();
  return sid;
}

function destroySession(req) {
  const c = parseCookies(req);
  const sid = c.epopeyas_admin;
  if (sid) {
    sessions.delete(sid);
    saveSessions();
  }
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function rateLimitLogin(ip) {
  const now = Date.now();
  let e = loginAttempts.get(ip);
  if (!e || e.reset < now) {
    e = { count: 0, reset: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, e);
  }
  e.count += 1;
  return e.count <= LOGIN_MAX;
}

function unauthorized(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Epopeyas privadas"',
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  res.end("Acceso restringido");
}

function checkGameAuth(req) {
  if (!AUTH_ENABLED) return true;
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  return timingSafeEqualStr(decoded.slice(0, i), USER) && timingSafeEqualStr(decoded.slice(i + 1), PASS);
}

function isBlockedPath(rel) {
  const n = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (BLOCKED_FILES.has(n)) return true;
  return BLOCKED_PREFIXES.some((p) => n === p || n.startsWith(p + "/"));
}

function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  if (isBlockedPath(rel)) return null;
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJsonFile(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(p, data) {
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

function regenerarBanco(preguntas) {
  const js = `/* generado automáticamente — no editar a mano */\nwindow.PREGUNTAS = ${JSON.stringify(preguntas, null, 2)};\n`;
  fs.writeFileSync(BANCO_PATH, js);
}

function sanitizePregunta(p) {
  if (!p || typeof p !== "object") return null;
  const pregunta = String(p.pregunta || "").trim();
  const opciones = Array.isArray(p.opciones) ? p.opciones.map((o) => String(o)) : [];
  if (!pregunta || opciones.length < 2) return null;
  let correcta = Number(p.correcta);
  if (!Number.isFinite(correcta) || correcta < 0 || correcta >= opciones.length) correcta = 0;
  return {
    pregunta,
    opciones: opciones.slice(0, 4),
    correcta,
    bonus: !!p.bonus,
  };
}

function statsResumen() {
  const data = readJsonFile(STATS_PATH, { sesiones: [], eventos: [] });
  const sesiones = Array.isArray(data.sesiones) ? data.sesiones : [];
  const now = Date.now();
  const mesMs = 30 * 24 * 60 * 60 * 1000;
  const delMes = sesiones.filter((s) => s && now - new Date(s.inicio || 0).getTime() < mesMs);

  const porHora = Array.from({ length: 24 }, () => 0);
  const porDia = {};
  let tiempoTotal = 0;
  const niveles = {};

  delMes.forEach((s) => {
    const d = new Date(s.inicio || 0);
    if (!Number.isNaN(d.getTime())) {
      porHora[d.getHours()] += 1;
      const key = d.toISOString().slice(0, 10);
      porDia[key] = (porDia[key] || 0) + 1;
    }
    tiempoTotal += Number(s.segundosJuego || 0);
    const niv = String(s.nivelMax || "inicio");
    niveles[niv] = (niveles[niv] || 0) + 1;
  });

  return {
    totalSesiones: sesiones.length,
    sesionesMes: delMes.length,
    frecuenciaMensual: porDia,
    horarios: porHora,
    tiempoJuegoSegundosPromedio: delMes.length ? Math.round(tiempoTotal / delMes.length) : 0,
    tiempoJuegoSegundosTotal: tiempoTotal,
    alcanceNivel: niveles,
  };
}

function requireAdmin(req, res) {
  const s = getSession(req);
  if (!s) {
    sendJson(res, 401, { error: "no_autorizado" });
    return null;
  }
  return s;
}

async function handleApi(req, res, urlPath) {
  const method = req.method || "GET";

  if (urlPath === "/api/telemetry" && method === "POST") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw.toString("utf8") || "{}");
      const data = readJsonFile(STATS_PATH, { sesiones: [], eventos: [] });
      if (!Array.isArray(data.sesiones)) data.sesiones = [];
      if (!Array.isArray(data.eventos)) data.eventos = [];

      if (body.tipo === "sesion_inicio") {
        data.sesiones.push({
          id: String(body.id || crypto.randomBytes(8).toString("hex")),
          inicio: new Date().toISOString(),
          ua: String((req.headers["user-agent"] || "").slice(0, 180)),
          segundosJuego: 0,
          nivelMax: "inicio",
        });
      } else if (body.tipo === "sesion_tick" || body.tipo === "sesion_fin") {
        const id = String(body.id || "");
        const s = data.sesiones.find((x) => x.id === id);
        if (s) {
          s.segundosJuego = Math.max(0, Number(body.segundosJuego) || s.segundosJuego || 0);
          if (body.nivelMax) s.nivelMax = String(body.nivelMax).slice(0, 40);
          if (body.tipo === "sesion_fin") s.fin = new Date().toISOString();
        }
      } else {
        data.eventos.push({
          t: new Date().toISOString(),
          tipo: String(body.tipo || "evento").slice(0, 40),
          detalle: String(body.detalle || "").slice(0, 120),
        });
        if (data.eventos.length > 2000) data.eventos = data.eventos.slice(-1500);
      }
      if (data.sesiones.length > 5000) data.sesiones = data.sesiones.slice(-4000);
      writeJsonAtomic(STATS_PATH, data);
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 400, { error: "payload_invalido" });
    }
    return true;
  }

  if (urlPath === "/api/ads/active" && method === "GET") {
    const ads = readJsonFile(ADS_PATH, { entreNiveles: [] });
    const list = (ads.entreNiveles || []).filter((a) => a && a.activo !== false && a.archivo);
    sendJson(res, 200, { ad: list[0] || null });
    return true;
  }

  if (urlPath === "/api/admin/login" && method === "POST") {
    const ip = clientIp(req);
    if (!rateLimitLogin(ip)) {
      sendJson(res, 429, { error: "demasiados_intentos" });
      return true;
    }
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw.toString("utf8") || "{}");
      const user = String(body.user || "").trim();
      const pass = String(body.pass || "");
      if (!user || !pass || !verifyAdmin(user, pass)) {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
        sendJson(res, 401, { error: "credenciales" });
        return true;
      }
      const sid = createSession(user);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": `epopeyas_admin=${sid}; ${cookieAttrs(req)}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
      });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      sendJson(res, 400, { error: "payload_invalido" });
    }
    return true;
  }

  if (urlPath === "/api/admin/logout" && method === "POST") {
    destroySession(req);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": `epopeyas_admin=; ${cookieAttrs(req)}; Max-Age=0`,
    });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (urlPath === "/api/admin/me" && method === "GET") {
    const s = getSession(req);
    if (!s) return sendJson(res, 401, { error: "no_autorizado" }), true;
    sendJson(res, 200, { user: s.user });
    return true;
  }

  if (urlPath === "/api/admin/preguntas") {
    if (!requireAdmin(req, res)) return true;
    if (method === "GET") {
      sendJson(res, 200, { preguntas: readJsonFile(PREGUNTAS_PATH, []) });
      return true;
    }
    if (method === "PUT") {
      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString("utf8") || "{}");
        const list = Array.isArray(body.preguntas) ? body.preguntas.map(sanitizePregunta).filter(Boolean) : null;
        if (!list) {
          sendJson(res, 400, { error: "formato" });
          return true;
        }
        writeJsonAtomic(PREGUNTAS_PATH, list);
        regenerarBanco(list);
        sendJson(res, 200, { ok: true, total: list.length });
      } catch {
        sendJson(res, 400, { error: "payload_invalido" });
      }
      return true;
    }
  }

  if (urlPath === "/api/admin/stats" && method === "GET") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, statsResumen());
    return true;
  }

  if (urlPath === "/api/admin/versiones" && method === "GET") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, { versiones: readJsonFile(VERSIONES_PATH, []) });
    return true;
  }

  if (urlPath === "/api/admin/estado" && method === "GET") {
    if (!requireAdmin(req, res)) return true;
    const estadoPath = path.join(AGENTE_DIR, "estado.json");
    const urlPathFile = path.join(ROOT, "url-publica.txt");
    let urlArchivo = "";
    try {
      urlArchivo = fs.readFileSync(urlPathFile, "utf8").trim();
    } catch {}
    let cloudflared = false;
    try {
      const { execSync } = require("child_process");
      const out = execSync("tasklist /FI \"IMAGENAME eq cloudflared.exe\"", { encoding: "utf8" });
      cloudflared = /cloudflared\.exe/i.test(out);
    } catch {}
    const guardado = readJsonFile(estadoPath, {});
    const localOk = true; // si respondemos esta API, el servidor local está activo
    sendJson(res, 200, {
      servidorLocal: localOk,
      tunelProceso: cloudflared,
      online: !!(localOk && (cloudflared || guardado.online)),
      urlPublica: guardado.urlPublica || urlArchivo || "",
      urlFija: !!guardado.urlFija,
      tunelModo: guardado.tunelModo || "quick",
      publicoOk: !!guardado.publicoOk,
      actualizado: guardado.actualizado || guardado.ultimoAvisoUrl || null,
      mensaje: guardado.mensaje || (cloudflared ? "Servidor activo." : "Servidor activo; tunel no detectado."),
      hostnameConfigurado: guardado.hostnameConfigurado || "",
      versionJuego: "1.16",
      notaUrlFija:
        "Los tuneles rapidos (trycloudflare) cambian de URL al reiniciar. Para URL fija: Cloudflare Zero Trust -> token en agente-online-config.json (tunel.modo=token).",
    });
    return true;
  }

  if (urlPath === "/api/admin/ads") {
    if (!requireAdmin(req, res)) return true;
    if (method === "GET") {
      sendJson(res, 200, readJsonFile(ADS_PATH, { entreNiveles: [] }));
      return true;
    }
    if (method === "POST") {
      try {
        const raw = await readBody(req);
        const ctype = String(req.headers["content-type"] || "");
        if (ctype.includes("multipart/form-data")) {
          sendJson(res, 400, { error: "usar_json_base64" });
          return true;
        }
        const body = JSON.parse(raw.toString("utf8") || "{}");
        const nombre = String(body.nombre || "aviso").replace(/[^\w.\-]/g, "_").slice(0, 80);
        const ext = String(body.ext || "jpg").replace(/[^\w]/g, "").slice(0, 5) || "jpg";
        const b64 = String(body.data || "").replace(/^data:[^;]+;base64,/, "");
        if (!b64) {
          sendJson(res, 400, { error: "sin_archivo" });
          return true;
        }
        const buf = Buffer.from(b64, "base64");
        if (buf.length < 32 || buf.length > 10 * 1024 * 1024) {
          sendJson(res, 400, { error: "tamano" });
          return true;
        }
        const file = `${Date.now()}-${nombre}.${ext}`;
        fs.writeFileSync(path.join(ADS_DIR, file), buf);
        const ads = readJsonFile(ADS_PATH, { entreNiveles: [] });
        if (!Array.isArray(ads.entreNiveles)) ads.entreNiveles = [];
        ads.entreNiveles.forEach((a) => {
          a.activo = false;
        });
        ads.entreNiveles.unshift({
          id: crypto.randomBytes(6).toString("hex"),
          archivo: `data/ads/${file}`,
          tipo: ext === "mp4" || ext === "webm" ? "video" : "imagen",
          activo: true,
          creado: new Date().toISOString(),
        });
        writeJsonAtomic(ADS_PATH, ads);
        sendJson(res, 200, { ok: true, ads });
      } catch {
        sendJson(res, 400, { error: "payload_invalido" });
      }
      return true;
    }
    if (method === "DELETE") {
      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString("utf8") || "{}");
        const id = String(body.id || "");
        const ads = readJsonFile(ADS_PATH, { entreNiveles: [] });
        ads.entreNiveles = (ads.entreNiveles || []).filter((a) => a.id !== id);
        writeJsonAtomic(ADS_PATH, ads);
        sendJson(res, 200, { ok: true, ads });
      } catch {
        sendJson(res, 400, { error: "payload_invalido" });
      }
      return true;
    }
  }

  return false;
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

ensureDirs();
ensureAdminSecrets();
loadSessions();

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  const parsed = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const urlPath = parsed.pathname;

  if (urlPath === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  // APIs: telemetría/ads/admin login sin Basic del juego; resto de /api/admin/* por cookie
  if (urlPath.startsWith("/api/")) {
    const publicApis = new Set([
      "/api/telemetry",
      "/api/ads/active",
      "/api/admin/login",
      "/api/admin/logout",
      "/api/admin/me",
    ]);
    const isAdminApi = urlPath.startsWith("/api/admin/");
    if (!publicApis.has(urlPath) && !isAdminApi) {
      if (!checkGameAuth(req)) {
        unauthorized(res);
        return;
      }
    }

    try {
      const handled = await handleApi(req, res, urlPath);
      if (handled) return;
    } catch (e) {
      sendJson(res, 500, { error: "interno" });
      return;
    }
    sendJson(res, 404, { error: "no_encontrado" });
    return;
  }

  // Panel admin: /tefi (ruta /admin oculta)
  if (urlPath === "/tefi" || urlPath === "/tefi/") {
    serveFile(res, path.join(ROOT, "admin", "index.html"));
    return;
  }
  if (urlPath === "/admin" || urlPath === "/admin/") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  // Archivos de publicidad visibles sin Basic (el panel y el juego los piden por URL)
  if (urlPath.startsWith("/data/ads/") && (req.method || "GET") === "GET") {
    const filePath = safePath(req.url);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    serveFile(res, filePath);
    return;
  }

  if (!checkGameAuth(req)) {
    unauthorized(res);
    return;
  }

  if (urlPath === "/url") {
    const urlFile = path.join(ROOT, "url-publica.txt");
    fs.readFile(urlFile, "utf8", (err, data) => {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(err ? "sin url todavia" : String(data || "").trim());
    });
    return;
  }

  const filePath = safePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  serveFile(res, filePath);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Epopeyas en http://0.0.0.0:${PORT}`);
  console.log(`Admin: /tefi`);
  console.log(`AUTH_ENABLED=${AUTH_ENABLED ? "1" : "0"} RENDER=${IS_RENDER ? "yes" : "no"}`);
});

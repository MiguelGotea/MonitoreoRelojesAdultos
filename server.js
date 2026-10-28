"use strict";

const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const config = require("./lib/config");
const { IgpsClient, normalizeTracking } = require("./lib/igps-client");
const { Store } = require("./lib/store");

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("PORT must be valid");
const store = new Store(path.join(process.cwd(), "data", "store.json"));
store.load();
const client = new IgpsClient(config.provider);
let refreshing = null;

function headers(contentType) {
  return { "Content-Type": contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" };
}
function sendJson(response, status, payload) { response.writeHead(status, headers("application/json; charset=utf-8")); response.end(JSON.stringify(payload)); }
function authorized(request, response) {
  if (!config.dashboardUser || !config.dashboardPassword) { sendJson(response, 503, { error: "dashboard_not_configured" }); return false; }
  const expected = Buffer.from(`${config.dashboardUser}:${config.dashboardPassword}`);
  const given = Buffer.from((request.headers.authorization || "").replace(/^Basic\s+/i, ""), "base64");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    response.writeHead(401, { ...headers("application/json; charset=utf-8"), "WWW-Authenticate": 'Basic realm="Monitoreo privado"' });
    response.end(JSON.stringify({ error: "authentication_required" }));
    return false;
  }
  return true;
}
async function refresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    if (!config.accounts.length) throw new Error("No hay cuentas IGPS configuradas en .env");
    const devices = [];
    for (const account of config.accounts) {
      const providerDevices = await client.login(account);
      for (const device of providerDevices) {
        const tracking = await client.getTracking(device);
        devices.push({ id: `${account.alias}-${device.deviceId}`, alias: account.alias, name: device.providerName, refreshedAt: new Date().toISOString(), location: normalizeTracking(tracking) });
      }
    }
    store.replace(devices);
    return store.state;
  })();
  try { return await refreshing; } catch (error) { store.fail(error); throw error; } finally { refreshing = null; }
}
function dashboard() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Monitoreo familiar</title><style>body{margin:0;background:#0f172a;color:#e2e8f0;font:16px system-ui,sans-serif}main{max-width:1050px;margin:auto;padding:32px}header{display:flex;justify-content:space-between;align-items:center;gap:20px}button{background:#38bdf8;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}.muted{color:#94a3b8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:24px}.card{background:#1e293b;border-radius:12px;padding:20px}.danger{color:#fda4af}dt{color:#94a3b8;font-size:.85rem;margin-top:12px}dd{margin:3px 0;font-weight:600}</style></head><body><main><header><div><h1>Monitoreo familiar</h1><p class="muted">Telemetría de consumo: no constituye diagnóstico médico.</p></div><button id="refresh">Actualizar ahora</button></header><p id="status" class="muted">Cargando datos…</p><section id="devices" class="grid"></section></main><script>const status=document.querySelector('#status'),devices=document.querySelector('#devices');const esc=s=>String(s??'Sin dato').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function render(data){status.className=data.lastError?'danger':'muted';status.textContent=data.lastError?'Última actualización con error: '+data.lastError:'Actualizado: '+(data.updatedAt?new Date(data.updatedAt).toLocaleString():'Aún sin sincronizar');devices.innerHTML=data.devices.map(d=>'<article class="card"><h2>'+esc(d.alias)+'</h2><p class="muted">'+esc(d.name)+'</p><dl><dt>Última posición</dt><dd>'+esc(d.location.positionAt)+'</dd><dt>Estado</dt><dd>'+esc(d.location.online)+'</dd><dt>Dirección</dt><dd>'+esc(d.location.address)+'</dd><dt>Batería</dt><dd>'+esc(d.location.battery)+'</dd><dt>Temperatura reportada</dt><dd>'+esc(d.location.temperature)+'</dd><dt>Velocidad</dt><dd>'+esc(d.location.speed)+'</dd><dt>Coordenadas</dt><dd>'+(d.location.latitude??'—')+', '+(d.location.longitude??'—')+'</dd></dl></article>').join('')||'<p class="muted">Sin datos todavía. Usa Actualizar ahora tras configurar las cuentas.</p>'}async function load(){const r=await fetch('/api/dashboard');render(await r.json())}document.querySelector('#refresh').onclick=async()=>{status.textContent='Actualizando…';const r=await fetch('/api/refresh',{method:'POST'});render(await r.json())};load()</script></body></html>`;
}
const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/healthz") return sendJson(response, 200, { status: "ok", service: "monitoreo-relojes-adultos" });
  if (!authorized(request, response)) return;
  if (request.method === "GET" && request.url === "/api/dashboard") return sendJson(response, 200, store.state);
  if (request.method === "POST" && request.url === "/api/refresh") { try { return sendJson(response, 200, await refresh()); } catch { return sendJson(response, 502, store.state); } }
  if (request.method === "GET" && request.url === "/") { response.writeHead(200, headers("text/html; charset=utf-8")); return response.end(dashboard()); }
  return sendJson(response, 404, { error: "not_found" });
});
server.listen(config.port, config.host, () => console.log(`monitoreo-relojes-adultos on ${config.host}:${config.port}`));
if (config.accounts.length) refresh().catch((error) => console.error(`Initial refresh failed: ${error.message}`));
setInterval(() => refresh().catch((error) => console.error(`Scheduled refresh failed: ${error.message}`)), config.refreshSeconds * 1000).unref();
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));

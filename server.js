"use strict";

const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const config = require("./lib/config");
const { IgpsClient, normalizeTracking } = require("./lib/igps-client");
const { Geocoder, usableAddress } = require("./lib/geocoder");
const { Store } = require("./lib/store");

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("PORT must be valid");
const store = new Store(path.join(process.cwd(), "data", "store.json"));
store.load();
const client = new IgpsClient(config.provider);
const geocoder = new Geocoder(config.geocoding);
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
        const location = normalizeTracking(tracking);
        if (!usableAddress(location.address)) location.address = await geocoder.reverse(location.latitude, location.longitude);
        devices.push({ id: `${account.alias}-${device.deviceId}`, alias: account.alias, name: device.providerName, refreshedAt: new Date().toISOString(), location });
      }
    }
    store.replace(devices);
    return store.state;
  })();
  try { return await refreshing; } catch (error) { store.fail(error); throw error; } finally { refreshing = null; }
}
function dashboard() {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monitoreo familiar</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0f172a;color:#e2e8f0;font:16px system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;align-items:center;gap:20px}h1{margin:0 0 6px}button{background:#38bdf8;border:0;border-radius:8px;padding:10px 14px;font-weight:750;cursor:pointer;color:#062033}.muted{color:#94a3b8}.danger{color:#fda4af}.tabs{display:flex;gap:8px;border-bottom:1px solid #334155;margin:24px 0 18px}.tab{background:transparent;color:#cbd5e1;border-radius:8px 8px 0 0}.tab[aria-selected="true"]{background:#1e293b;color:#fff}.panel[hidden]{display:none}.map-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.subtle{background:#334155;color:#e2e8f0}.map{height:510px;border-radius:12px;overflow:hidden;border:1px solid #334155}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px}.card{background:#1e293b;border-radius:12px;padding:20px}.card h2{margin:0}.card p{overflow-wrap:anywhere}dt{color:#94a3b8;font-size:.85rem;margin-top:12px}dd{margin:3px 0;font-weight:600}.notice{border-left:4px solid #38bdf8;padding:12px 16px;background:#172554;border-radius:8px}.leaflet-container{background:#cbd5e1;color:#0f172a}@media(max-width:620px){main{padding:18px}header,.map-toolbar{align-items:stretch;flex-direction:column}.map{height:420px}}
</style></head><body><main>
<header><div><h1>Monitoreo familiar</h1><p class="muted">Telemetría de consumo: no constituye diagnóstico médico.</p></div><button id="refresh">Actualizar ahora</button></header>
<p id="status" class="muted">Cargando datos…</p>
<nav class="tabs" aria-label="Secciones"><button class="tab" data-tab="mapa" aria-selected="true">Mapa y recorrido</button><button class="tab" data-tab="resumen" aria-selected="false">Resumen</button><button class="tab" data-tab="salud" aria-selected="false">Salud</button></nav>
<section class="panel" id="mapa"><div class="map-toolbar"><p class="muted">La ruta se guarda solo mientras esta página permanece abierta. La fuente se consulta cada 5 minutos.</p><button id="clear-route" class="subtle">Borrar líneas</button></div><div id="map" class="map" role="application" aria-label="Mapa de ubicaciones y recorridos"></div></section>
<section class="panel" id="resumen" hidden><div id="devices" class="grid"></div></section>
<section class="panel" id="salud" hidden><div id="health" class="grid"></div></section>
</main><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script>
const status=document.querySelector('#status'),devices=document.querySelector('#devices'),health=document.querySelector('#health');
const esc=s=>String(s??'Sin dato').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=s=>s===null||s===undefined||s===''?'Sin dato':s;
const map=L.map('map',{zoomControl:true}).setView([12.1364,-86.2514],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
const tracks=new Map(),markers=new Map();let hasFitted=false;
function coordinate(d){const l=d.location||{};return Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)?[l.latitude,l.longitude]:null}
function addPoint(d){const point=coordinate(d);if(!point)return;let track=tracks.get(d.id);if(!track){track={points:[],line:L.polyline([],{color:d.alias==='Mamá'?'#f472b6':'#38bdf8',weight:5,opacity:.85}).addTo(map)};tracks.set(d.id,track)}const last=track.points.at(-1);if(!last||last[0]!==point[0]||last[1]!==point[1]){track.points.push(point);track.line.setLatLngs(track.points)}const text='<strong>'+esc(d.alias)+'</strong><br>'+esc(value(d.location.address))+'<br><small>'+esc(value(d.location.positionAt))+'</small>';const marker=markers.get(d.id);if(marker){marker.setLatLng(point).setPopupContent(text)}else{markers.set(d.id,L.marker(point).addTo(map).bindPopup(text))}}
function drawMap(list){const points=[];list.forEach(d=>{addPoint(d);const p=coordinate(d);if(p)points.push(p)});if(points.length&&!hasFitted){map.fitBounds(L.latLngBounds(points),{padding:[35,35],maxZoom:16});hasFitted=true}}
function render(data){status.className=data.lastError?'danger':'muted';status.textContent=data.lastError?'Última actualización con error: '+data.lastError:'Fuente actualizada: '+(data.updatedAt?new Date(data.updatedAt).toLocaleString():'Aún sin sincronizar');const list=data.devices||[];devices.innerHTML=list.map(d=>'<article class="card"><h2>'+esc(d.alias)+'</h2><p class="muted">'+esc(d.name)+'</p><dl><dt>Última posición</dt><dd>'+esc(value(d.location.positionAt))+'</dd><dt>Estado</dt><dd>'+esc(value(d.location.status))+'</dd><dt>Dirección</dt><dd>'+esc(value(d.location.address))+'</dd><dt>Batería</dt><dd>'+esc(value(d.location.battery))+'</dd><dt>Velocidad</dt><dd>'+esc(value(d.location.speed))+'</dd><dt>Coordenadas</dt><dd>'+esc(d.location.latitude??'—')+', '+esc(d.location.longitude??'—')+'</dd></dl></article>').join('')||'<p class="muted">Sin datos todavía. Usa Actualizar ahora tras configurar las cuentas.</p>';
health.innerHTML=list.map(d=>'<article class="card"><h2>'+esc(d.alias)+'</h2><dl><dt>Temperatura reportada</dt><dd>'+esc(value(d.location.temperature))+'</dd><dt>Otras mediciones</dt><dd class="muted">Pendientes de validación con el proveedor.</dd></dl><p class="muted">La temperatura proviene de la misma consulta de ubicación. Presión, pulso y oxígeno no se muestran hasta confirmar campos, unidades y fecha de sus respuestas.</p></article>').join('')||'<p class="muted">Sin telemetría disponible todavía.</p>';drawMap(list)}
async function load(){try{const r=await fetch('/api/dashboard');if(!r.ok)throw new Error('No fue posible leer el panel');render(await r.json())}catch(error){status.className='danger';status.textContent=error.message}}
document.querySelector('#refresh').onclick=async()=>{status.className='muted';status.textContent='Actualizando fuente…';try{const r=await fetch('/api/refresh',{method:'POST'});render(await r.json())}catch{status.className='danger';status.textContent='No fue posible actualizar ahora.'}};
document.querySelector('#clear-route').onclick=()=>{tracks.forEach(t=>map.removeLayer(t.line));tracks.clear();hasFitted=false;status.className='muted';status.textContent='Recorridos borrados. Se marcarán de nuevo desde la próxima ubicación recibida.'};
document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',String(t===tab)));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==tab.dataset.tab);if(tab.dataset.tab==='mapa')setTimeout(()=>map.invalidateSize(),0)});
load();setInterval(load,30000);
</script></body></html>`;
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

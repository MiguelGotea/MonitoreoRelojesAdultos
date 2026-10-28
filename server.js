"use strict";

const http = require("node:http");

const port = Number.parseInt(process.env.PORT ?? "3108", 10);
const host = process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer"
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/healthz") {
    return sendJson(response, 200, { status: "ok", service: "monitoreo-relojes-adultos" });
  }

  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer"
    });
    return response.end(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Monitoreo de relojes</title><body><h1>Monitoreo de relojes</h1><p>Servicio base desplegado. La integración de telemetría aún no está habilitada.</p></body></html>`);
  }

  return sendJson(response, 404, { error: "not_found" });
});

server.listen(port, host, () => {
  console.log(`monitoreo-relojes-adultos listening on ${host}:${port}`);
});

function shutdown(signal) {
  console.log(`received ${signal}; closing server`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { IgpsClient, normalizeTracking } = require("../lib/igps-client");

test("uses the device context key returned by Login for tracking", async (t) => {
  const received = [];
  const server = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      received.push(body);
      const isLogin = body.includes("<Login ");
      const payload = isLogin
        ? JSON.stringify({ state: "0", deviceInfo: { deviceID: 10, deviceName: "Reloj", model: 0, key2018: "device-context-key" } })
        : JSON.stringify({ state: "0", lat: "12.1", lng: "-86.2", positionTime: "2026-10-28 12:00:00" });
      const method = isLogin ? "Login" : "GetTracking";
      response.writeHead(200, { "Content-Type": "text/xml; charset=utf-8" });
      response.end(`<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${method}Response xmlns="http://tempuri.org/"><${method}Result>${payload.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")}</${method}Result></${method}Response></soap:Body></soap:Envelope>`);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const client = new IgpsClient({ endpoint: `http://127.0.0.1:${port}`, namespace: "http://tempuri.org/", key: "app-key", project: "RFHZ", timeZone: "-06:00", mapType: "Google", language: "es_NI" });

  const [device] = await client.login({ alias: "Prueba", account: "account", password: "password" });
  const tracking = await client.getTracking(device);

  assert.equal(tracking.state, "0");
  assert.match(received[0], /<Key>app-key<\/Key>/);
  assert.match(received[1], /<Key>device-context-key<\/Key>/);
  assert.deepEqual(normalizeTracking(tracking), { latitude: 12.1, longitude: -86.2, positionAt: "2026-10-28 12:00:00", address: null, speed: null, battery: null, temperature: null, online: null });
});

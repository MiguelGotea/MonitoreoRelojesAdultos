"use strict";

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function decodeXml(value) {
  return value.replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}
function getResult(body, method) {
  const match = new RegExp(`<${method}Result[^>]*>([\\s\\S]*?)</${method}Result>`).exec(body);
  if (!match) throw new Error(`Provider response omitted ${method}Result`);
  return decodeXml(match[1]).trim();
}
function parseJson(value, context) {
  try { return JSON.parse(value); } catch { throw new Error(`${context} returned an unexpected payload`); }
}

class IgpsClient {
  constructor(provider) { this.provider = provider; }
  async call(method, properties) {
    const fields = Object.entries({ ...properties, Key: properties.Key || this.provider.key }).map(([key, value]) => `<${key}>${xmlEscape(value)}</${key}>`).join("");
    const xml = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${method} xmlns="${this.provider.namespace}">${fields}</${method}></soap:Body></soap:Envelope>`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(this.provider.endpoint, { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${this.provider.namespace}${method}"` }, body: xml, signal: controller.signal });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      return getResult(await response.text(), method);
    } finally { clearTimeout(timeout); }
  }
  async login(account) {
    const payload = parseJson(await this.call("Login", { Name: account.account, Pass: account.password, LoginType: 1, project: this.provider.project, GMT: this.provider.timeZone }), "Login");
    if (String(payload.state) !== "0" || !payload.deviceInfo) throw new Error("Provider rejected account credentials");
    const devices = Array.isArray(payload.deviceInfo) ? payload.deviceInfo : [payload.deviceInfo];
    return devices.map((device) => ({ deviceId: Number(device.deviceID), providerName: device.deviceName || device.sn || "Reloj sin nombre", model: Number(device.model) || 0, key: device.key2018 || null })).filter((device) => Number.isInteger(device.deviceId));
  }
  async getTracking(device) {
    const payload = parseJson(await this.call("GetTracking", { DeviceID: device.deviceId, Model: device.model, TimeZones: this.provider.timeZone, MapType: this.provider.mapType, Language: this.provider.language, Key: device.key || this.provider.key }), "GetTracking");
    const item = Array.isArray(payload) ? payload[0] : payload;
    if (!item || String(item.state) !== "0") throw new Error("Provider did not return current location");
    return item;
  }
}
function pick(source, names) { for (const name of names) if (source[name] !== undefined && source[name] !== null && source[name] !== "") return source[name]; return null; }
function batteryFromStatus(value) {
  if (value === null || value === undefined) return null;
  const match = /(?:bater[ií]a|battery|power)\s*[:：]?\s*(\d{1,3})\s*%?/i.exec(String(value));
  return match ? `${match[1]}%` : null;
}
function normalizeTracking(source) {
  const latitude = Number(pick(source, ["lat", "Lat", "latitude", "Latitude", "y"]));
  const longitude = Number(pick(source, ["lng", "Lng", "longitude", "Longitude", "x"]));
  const status = pick(source, ["status", "Status", "stateName", "StateName", "online", "Online"]);
  const directBattery = pick(source, ["battery", "Battery", "power", "Power"]);
  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    positionAt: pick(source, ["positionTime", "PositionTime", "gpsTime", "GPSTime", "time"]),
    address: pick(source, ["address", "Address", "addr"]),
    speed: pick(source, ["speed", "Speed"]),
    battery: directBattery ?? batteryFromStatus(status),
    temperature: pick(source, ["temp", "Temp", "temperature", "Temperature"]),
    status,
    // Conservado temporalmente para no romper datos guardados de la primera versión.
    online: status
  };
}
module.exports = { IgpsClient, normalizeTracking, batteryFromStatus };

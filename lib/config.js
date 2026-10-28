"use strict";

const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

const fileValues = loadDotEnv(path.join(process.cwd(), ".env"));
const value = (key, fallback = "") => process.env[key] ?? fileValues[key] ?? fallback;
function configuredAccount(alias, accountKey, passwordKey) {
  const account = value(accountKey);
  const password = value(passwordKey);
  return account && password ? { alias, account, password } : null;
}
const refreshSeconds = Number.parseInt(value("REFRESH_SECONDS", "300"), 10);

module.exports = {
  port: Number.parseInt(value("PORT", "3108"), 10),
  host: value("HOST", "127.0.0.1"),
  dashboardUser: value("DASHBOARD_USER"),
  dashboardPassword: value("DASHBOARD_PASSWORD"),
  refreshSeconds: Number.isInteger(refreshSeconds) && refreshSeconds >= 60 ? refreshSeconds : 300,
  provider: {
    endpoint: value("IGPS_ENDPOINT", "http://app.igps123.com/openapiv3.asmx"),
    namespace: "http://tempuri.org/",
    project: value("IGPS_PROJECT", "RFHZ"),
    key: value("IGPS_APP_KEY", "7DU2DJFDR8321"),
    timeZone: value("IGPS_TIME_ZONE", "-06:00"),
    mapType: value("IGPS_MAP_TYPE", "Google"),
    language: value("IGPS_LANGUAGE", "es_NI")
  },
  geocoding: {
    enabled: value("GEOCODING_ENABLED", "true").toLowerCase() !== "false",
    endpoint: value("GEOCODING_ENDPOINT", "https://nominatim.openstreetmap.org/reverse"),
    userAgent: value("GEOCODING_USER_AGENT", "monitoreo-relojes-adultos/0.2 (private-dashboard)")
  },
  accounts: [
    configuredAccount("Mamá", "IGPS_MAMA_ACCOUNT", "IGPS_MAMA_PASSWORD"),
    configuredAccount("Papá", "IGPS_PAPA_ACCOUNT", "IGPS_PAPA_PASSWORD")
  ].filter(Boolean)
};

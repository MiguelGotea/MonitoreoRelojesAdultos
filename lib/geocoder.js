"use strict";

function usableAddress(value) {
  return typeof value === "string" && value.trim() && !/^(sin dato|n\/?a|null|undefined|-+)$/i.test(value.trim());
}

class Geocoder {
  constructor({ enabled, endpoint, userAgent }) {
    this.enabled = enabled;
    this.endpoint = endpoint;
    this.userAgent = userAgent;
    this.cache = new Map();
    this.lastRequestAt = 0;
  }

  async reverse(latitude, longitude) {
    if (!this.enabled || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    if (this.cache.has(key)) return this.cache.get(key);

    // Nominatim solicita un máximo de una petición por segundo; se consulta solo cuando
    // llega una coordenada nueva y se conserva el resultado en memoria.
    const wait = 1100 - (Date.now() - this.lastRequestAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastRequestAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const url = new URL(this.endpoint);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(latitude));
      url.searchParams.set("lon", String(longitude));
      url.searchParams.set("zoom", "18");
      url.searchParams.set("addressdetails", "1");
      const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": this.userAgent }, signal: controller.signal });
      if (!response.ok) return null;
      const payload = await response.json();
      const address = usableAddress(payload.display_name) ? payload.display_name.trim() : null;
      if (address) this.cache.set(key, address);
      return address;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { Geocoder, usableAddress };

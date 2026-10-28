"use strict";
const fs = require("node:fs");
const path = require("node:path");
class Store {
  constructor(filePath) { this.filePath = filePath; this.state = { updatedAt: null, devices: [], lastError: null }; }
  load() { if (!fs.existsSync(this.filePath)) return; try { this.state = { ...this.state, ...JSON.parse(fs.readFileSync(this.filePath, "utf8")) }; } catch { this.state.lastError = "No se pudo leer el almacenamiento local previo."; } }
  save() { fs.mkdirSync(path.dirname(this.filePath), { recursive: true }); const temporary = `${this.filePath}.tmp`; fs.writeFileSync(temporary, JSON.stringify(this.state, null, 2), { mode: 0o600 }); fs.renameSync(temporary, this.filePath); }
  replace(devices) { this.state = { updatedAt: new Date().toISOString(), devices, lastError: null }; this.save(); }
  fail(error) { this.state = { ...this.state, lastError: error.message, updatedAt: new Date().toISOString() }; this.save(); }
}
module.exports = { Store };

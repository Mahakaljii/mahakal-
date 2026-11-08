const fs = require("fs");
const path = require("path");
const { FILES } = require("./config");

function readData(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("Expected a JSON array.");
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error(`Cannot read ${path.basename(file)}: ${error.message}`);
  }
}

function writeData(file, records) {
  if (!Array.isArray(records)) throw new TypeError("Storage data must be an array.");
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temp, `${JSON.stringify(records, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
    return true;
  } catch (error) {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
    throw new Error(`Cannot write ${path.basename(file)}: ${error.message}`);
  }
}

function resolveFile(type) {
  const file = FILES[type];
  if (!file) throw new Error(`Unknown storage type: ${type}`);
  return file;
}

function getAll(type) {
  return readData(resolveFile(type));
}

function saveAll(type, records) {
  return writeData(resolveFile(type), records);
}

function addRecord(type, record) {
  const records = getAll(type);
  records.push(record);
  saveAll(type, records);
  return record;
}

function updateRecord(type, id, updates) {
  const records = getAll(type);
  const index = records.findIndex(item => String(item.id) === String(id));
  if (index < 0) return false;
  records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() };
  saveAll(type, records);
  return records[index];
}

function deleteRecord(type, id) {
  const records = getAll(type);
  const next = records.filter(item => String(item.id) !== String(id));
  if (next.length === records.length) return false;
  saveAll(type, next);
  return true;
}

module.exports = { getAll, saveAll, addRecord, updateRecord, deleteRecord };

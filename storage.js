const fs = require("fs");
const path = require("path");
const { FILES } = require("./config");

// Read JSON file
function readData(file) {
    try {
        if (!fs.existsSync(file)) {
            return [];
        }

        const content = fs.readFileSync(file, "utf8");

        if (!content.trim()) {
            return [];
        }

        const data = JSON.parse(content);

        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error("JSON Read Error:", error.message);
        return [];
    }
}

// Write JSON file
function writeData(file, data) {
    try {
        const directory = path.dirname(file);

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        const tempFile = ${file}.tmp;

        fs.writeFileSync(
            tempFile,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        fs.renameSync(tempFile, file);

        return true;

    } catch (error) {
        console.error("JSON Write Error:", error.message);
        return false;
    }
}

// Get all records
function getAll(type) {
    const file = FILES[type];

    if (!file) {
        throw new Error(Unknown storage type: ${type});
    }

    return readData(file);
}

// Save all records
function saveAll(type, data) {
    const file = FILES[type];

    if (!file) {
        throw new Error(Unknown storage type: ${type});
    }

    if (!Array.isArray(data)) {
        throw new Error("Data must be an array");
    }

    return writeData(file, data);
}

// Add new record
function addRecord(type, record) {
    const data = getAll(type);

    data.push({
        ...record,
        createdAt: new Date().toISOString()
    });

    const saved = saveAll(type, data);

    return saved ? data[data.length - 1] : null;
}

// Update record
function updateRecord(type, id, updates) {
    const data = getAll(type);

    const index = data.findIndex(
        item => String(item.id) === String(id)
    );

    if (index === -1) {
        return false;
    }

    data[index] = {
        ...data[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    return saveAll(type, data);
}

// Delete record
function deleteRecord(type, id) {
    const data = getAll(type);

    const filtered = data.filter(
        item => String(item.id) !== String(id)
    );

    if (filtered.length === data.length) {
        return false;
    }

    return saveAll(type, filtered);
}

module.exports = {
    getAll,
    saveAll,
    addRecord,
    updateRecord,
    deleteRecord
};

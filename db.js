const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'bot_database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. PANELS TABLE
    db.run('CREATE TABLE IF NOT EXISTS panels (name TEXT PRIMARY KEY, url TEXT, api_key TEXT)');
    db.run('INSERT OR IGNORE INTO panels (name, url, api_key) VALUES (?, ?, ?)', 
        ["SMMILITE", "https://smmlite.com", process.env.API_KEY || ""]);

    // 2. CHANNELS CONFIG TABLE
    db.run('CREATE TABLE IF NOT EXISTS channels (username TEXT PRIMARY KEY, quantity INTEGER DEFAULT 10, status TEXT DEFAULT "ON", service_number TEXT DEFAULT "5160", panel_name TEXT DEFAULT "SMMILITE")');

    // 3. REPORTS/LOGS TABLE
    db.run('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT, link TEXT, quantity INTEGER, status TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)');
});

const dbQuery = {
    run: (sql, params = []) => new Promise((res, rej) => {
        db.run(sql, params, function(err) {
            if (err) rej(err);
            else res(this);
        });
    }),
    all: (sql, params = []) => new Promise((res, rej) => {
        db.all(sql, params, (err, rows) => {
            if (err) rej(err);
            else res(rows);
        });
    }),
    get: (sql, params = []) => new Promise((res, rej) => {
        db.get(sql, params, (err, row) => {
            if (err) rej(err);
            else res(row);
        });
    })
};

module.exports = dbQuery;

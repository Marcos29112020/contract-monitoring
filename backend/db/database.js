const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./contracts.db');

db.serialize(() => {
  // Tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      isAdmin BOOLEAN NOT NULL DEFAULT 0
    )
  `);
  

  // Tabela de contratos
  db.run(`
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      secretariat TEXT NOT NULL,
      contract_number TEXT NOT NULL,
      start_date TEXT NOT NULL,
      validity_type TEXT NOT NULL,
      validity_value INTEGER NOT NULL,
      description TEXT,
      end_date TEXT NOT NULL,
      alert_status TEXT NOT NULL,
      process_type TEXT NOT NULL
    )
  `);

  // Tabela para tokens de recuperação de senha
  db.run(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      token TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
});

module.exports = {
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
  },
};
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || './data.db';
const absoluteDbPath = path.resolve(__dirname, dbPath);
const dbDirectory = path.dirname(absoluteDbPath);

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

if (fs.existsSync(absoluteDbPath)) {
  const stats = fs.lstatSync(absoluteDbPath);
  if (stats.isDirectory()) {
    throw new Error(`DB_PATH (${absoluteDbPath}) points to a directory. Provide a file path instead.`);
  }
  fs.unlinkSync(absoluteDbPath);
  console.log(`Removed existing database at ${absoluteDbPath}`);
}

const db = new sqlite3.Database(absoluteDbPath);

db.serialize(() => {
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      secret_note TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      description TEXT
    );
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT
    );
  `);

  const insertUser = db.prepare('INSERT INTO users (username, password, role, secret_note) VALUES (?, ?, ?, ?)');
  insertUser.run('alice', 'alicepass', 'user', 'THM{flag_sql_2025}');
  insertUser.run('bob', 'bobpass', 'user', '');
  insertUser.run('admin', 'adminpass', 'admin', '');
  insertUser.finalize();

  const insertOrder = db.prepare('INSERT INTO orders (user_id, description) VALUES (?, ?)');
  insertOrder.run(1, 'Alice order - nothing secret');
  insertOrder.run(2, 'THM{flag_idor_2025} - confidential');
  insertOrder.finalize();

  console.log('Database seeded with initial data.');
});

db.close();

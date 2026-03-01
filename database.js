const { Database } = require('bun:sqlite');
const db = new Database('leads.db');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT,
    phone TEXT,
    email TEXT,
    category TEXT,
    yellowpages_url TEXT UNIQUE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertLead = (lead) => {
  const query = db.prepare(`
    INSERT OR IGNORE INTO leads (business_name, phone, email, category, yellowpages_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  return query.run(lead.business_name, lead.phone, lead.email, lead.category, lead.yellowpages_url);
};

const leadExists = (url) => {
  const query = db.prepare('SELECT 1 FROM leads WHERE yellowpages_url = ?');
  return !!query.get(url);
};

const getAllLeads = () => {
  const query = db.prepare('SELECT * FROM leads ORDER BY timestamp DESC');
  return query.all();
};

const close = () => {
  db.close();
};

module.exports = {
  insertLead,
  leadExists,
  getAllLeads,
  close
};

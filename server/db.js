const sqlite3 = require('sqlite3');

//----------------------------------------------------------------------------
const db = new sqlite3.Database('./database/train.sqlite', (err) => {
  if (err) throw err;
  console.log('Connected to SQLite database');
});

//----------------------------------------------------------------------------
module.exports = db;

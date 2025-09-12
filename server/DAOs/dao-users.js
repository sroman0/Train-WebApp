const db = require('../db');
const crypto = require('crypto');

//----------------------------------------------------------------------------
// Get user based on the ID
exports.getUserById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, username, name, otp_secret
      FROM users
      WHERE id = ?
    `;

    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(undefined);
      else {
        const user = {
          id: row.id,
          username: row.username,
          name: row.name,
          otp_secret: row.otp_secret
        };
        resolve(user);
      }
    });
  });
};

//----------------------------------------------------------------------------
// Get user by username and password
exports.getUser = (username, password) => {
  return new Promise((resolve, reject) => {

    const sql = `
      SELECT id, username, name, hash, salt, otp_secret
      FROM users
      WHERE username = ?
    `;
    db.get(sql, [username], (err, row) => {
      if (err) {
        console.error('Database error during user lookup:', err);
        reject(err);
      }
      else if (!row) {
        resolve(false);
      }
      else {
        
        crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
          if (err) {
            console.error('Error hashing password:', err);
            reject(err);
          }
          if (!crypto.timingSafeEqual(Buffer.from(row.hash, 'hex'), hashedPassword)) {
            resolve(false);
          }
          else {
            const user = {
              id: row.id,
              username: row.username,
              name: row.name,
              hash: row.hash,
              salt: row.salt,
              otp_secret: row.otp_secret
            };
            resolve(user);
          }
        });
      }
    });
  });
};



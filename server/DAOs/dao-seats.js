const db = require('../db');

//----------------------------------------------------------------------------
// Get all seats for a specific car class
exports.getSeatsByClass = (carClass) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, car_class, row_number, seat_number, seat_code, is_occupied
      FROM seats
      WHERE car_class = ?
      ORDER BY row_number ASC, seat_number ASC
    `;
    
    db.all(sql, [carClass], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

//----------------------------------------------------------------------------
// Get seat availability statistics for a specific car class
exports.getSeatStatistics = (carClass) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COUNT(*) as total_seats,
        SUM(is_occupied) as occupied_seats,
        COUNT(*) - SUM(is_occupied) as available_seats
      FROM seats
      WHERE car_class = ?
    `;
    
    db.get(sql, [carClass], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

//----------------------------------------------------------------------------
// Get seat by ID
exports.getSeatById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, car_class, row_number, seat_number, seat_code, is_occupied
      FROM seats
      WHERE id = ?
    `;
    
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

//----------------------------------------------------------------------------
// Mark seats as occupied
exports.occupySeats = (seatIds) => {
  return new Promise((resolve, reject) => {
    const placeholders = seatIds.map(() => '?').join(',');
    const sql = `UPDATE seats SET is_occupied = 1 WHERE id IN (${placeholders})`;
    
    db.run(sql, seatIds, function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

//----------------------------------------------------------------------------
// Mark seats as available
exports.freeSeats = (seatIds) => {
  return new Promise((resolve, reject) => {
    const placeholders = seatIds.map(() => '?').join(',');
    const sql = `UPDATE seats SET is_occupied = 0 WHERE id IN (${placeholders})`;
    
    db.run(sql, seatIds, function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

//----------------------------------------------------------------------------
// Get seats by IDs
exports.getSeatsByIds = (seatIds) => {
  return new Promise((resolve, reject) => {
    const placeholders = seatIds.map(() => '?').join(',');
    const sql = `
      SELECT id, car_class, row_number, seat_number, seat_code, is_occupied
      FROM seats
      WHERE id IN (${placeholders})
    `;
    
    db.all(sql, seatIds, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

//----------------------------------------------------------------------------
// Check if seats are available
exports.areSeatsAvailable = (seatIds) => {
  return new Promise((resolve, reject) => {
    const placeholders = seatIds.map(() => '?').join(',');
    const sql = `
      SELECT COUNT(*) as unavailable_count
      FROM seats
      WHERE id IN (${placeholders}) AND is_occupied = 1
    `;
    
    db.get(sql, seatIds, (err, row) => {
      if (err) reject(err);
      else resolve(row.unavailable_count === 0);
    });
  });
};

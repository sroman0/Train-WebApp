const db = require('../db');

//----------------------------------------------------------------------------
// Fix seat consistency - ensure is_occupied matches actual reservations
exports.fixSeatConsistency = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          return reject(new Error('Failed to start consistency check transaction: ' + err.message));
        }

        // Step 1: Mark all seats as available first
        db.run('UPDATE seats SET is_occupied = 0', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(new Error('Failed to reset seat availability: ' + err.message));
          }

          // Step 2: Mark seats as occupied if they have active reservations
          const occupySql = `
            UPDATE seats 
            SET is_occupied = 1 
            WHERE id IN (
              SELECT DISTINCT rs.seat_id 
              FROM reservation_seats rs 
              JOIN reservations r ON rs.reservation_id = r.id
            )
          `;

          db.run(occupySql, function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(new Error('Failed to mark reserved seats as occupied: ' + err.message));
            }

            // Step 3: Clean up orphaned reservation_seats (seats without reservations)
            const cleanupSql = `
              DELETE FROM reservation_seats 
              WHERE reservation_id NOT IN (SELECT id FROM reservations)
            `;

            db.run(cleanupSql, function(err) {
              if (err) {
                db.run('ROLLBACK');
                return reject(new Error('Failed to clean up orphaned reservation seats: ' + err.message));
              }

              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(new Error('Failed to commit consistency fix: ' + err.message));
                }

                console.log('✅ Seat consistency check completed');
                console.log(`   - Seats marked as occupied: ${this.changes || 'unknown'}`);
                resolve({
                  seatsMarkedOccupied: this.changes || 0,
                  message: 'Seat consistency fixed'
                });
              });
            });
          });
        });
      });
    });
  });
};

//----------------------------------------------------------------------------
// Get detailed consistency report
exports.getConsistencyReport = () => {
  return new Promise((resolve, reject) => {
    const reportSql = `
      SELECT 
        'Total seats' as category,
        COUNT(*) as count
      FROM seats
      
      UNION ALL
      
      SELECT 
        'Seats marked as occupied' as category,
        COUNT(*) as count
      FROM seats 
      WHERE is_occupied = 1
      
      UNION ALL
      
      SELECT 
        'Seats with active reservations' as category,
        COUNT(DISTINCT rs.seat_id) as count
      FROM reservation_seats rs
      JOIN reservations r ON rs.reservation_id = r.id
      
      UNION ALL
      
      SELECT 
        'Orphaned reservation_seats' as category,
        COUNT(*) as count
      FROM reservation_seats rs
      LEFT JOIN reservations r ON rs.reservation_id = r.id
      WHERE r.id IS NULL
      
      UNION ALL
      
      SELECT 
        'Inconsistent seats (marked occupied but no reservation)' as category,
        COUNT(*) as count
      FROM seats s
      WHERE s.is_occupied = 1 
      AND s.id NOT IN (
        SELECT DISTINCT rs.seat_id 
        FROM reservation_seats rs 
        JOIN reservations r ON rs.reservation_id = r.id
      )
    `;

    db.all(reportSql, [], (err, rows) => {
      if (err) {
        reject(new Error('Failed to generate consistency report: ' + err.message));
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = exports;

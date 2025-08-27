const db = require('../db');
const daoSeats = require('./dao-seats');

//----------------------------------------------------------------------------
// Get all reservations for a specific user with seat details
exports.getUserReservations = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        r.id as reservation_id,
        r.timestamp as reservation_time,
        s.id as seat_id,
        s.car_class,
        s.row_number,
        s.seat_number,
        s.seat_code
      FROM reservations r
      JOIN reservation_seats rs ON r.id = rs.reservation_id
      JOIN seats s ON rs.seat_id = s.id
      WHERE r.user_id = ?
      ORDER BY r.timestamp DESC, s.row_number ASC, s.seat_number ASC
    `;
    
    db.all(sql, [userId], (err, rows) => {
      if (err) reject(err);
      else {
        // Group seats by reservation
        const reservationsMap = new Map();
        
        rows.forEach(row => {
          if (!reservationsMap.has(row.reservation_id)) {
            reservationsMap.set(row.reservation_id, {
              id: row.reservation_id,
              car_class: row.car_class,
              reservation_time: row.reservation_time,
              seats: []
            });
          }
          
          reservationsMap.get(row.reservation_id).seats.push({
            id: row.seat_id,
            row_number: row.row_number,
            seat_number: row.seat_number,
            seat_code: row.seat_code
          });
        });
        
        resolve(Array.from(reservationsMap.values()));
      }
    });
  });
};

//----------------------------------------------------------------------------
// Create a new reservation with seats
exports.createReservation = (userId, seatIds) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // First, check if all seats are available
        daoSeats.areSeatsAvailable(seatIds)
          .then(available => {
            if (!available) {
              db.run('ROLLBACK');
              return reject(new Error('Some seats are no longer available'));
            }
            
            // Create the reservation
            const insertReservationSql = 'INSERT INTO reservations (user_id) VALUES (?)';
            db.run(insertReservationSql, [userId], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              
              const reservationId = this.lastID;
              
              // Link seats to reservation
              let completed = 0;
              const totalSeats = seatIds.length;
              
              seatIds.forEach(seatId => {
                const insertSeatSql = 'INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (?, ?)';
                db.run(insertSeatSql, [reservationId, seatId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                  
                  completed++;
                  if (completed === totalSeats) {
                    // Mark seats as occupied
                    daoSeats.occupySeats(seatIds)
                      .then(() => {
                        db.run('COMMIT');
                        resolve(reservationId);
                      })
                      .catch(err => {
                        db.run('ROLLBACK');
                        reject(err);
                      });
                  }
                });
              });
            });
          })
          .catch(err => {
            db.run('ROLLBACK');
            reject(err);
          });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
};

//----------------------------------------------------------------------------
// Delete a reservation and free its seats (user can only delete own reservations)
exports.deleteReservation = (reservationId, userId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // First, get the seat IDs for this reservation
        const getSeatsSql = `
          SELECT rs.seat_id
          FROM reservations r
          JOIN reservation_seats rs ON r.id = rs.reservation_id
          WHERE r.id = ? AND r.user_id = ?
        `;
        
        db.all(getSeatsSql, [reservationId, userId], (err, rows) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          
          if (rows.length === 0) {
            db.run('ROLLBACK');
            return reject(new Error('Reservation not found or access denied'));
          }
          
          const seatIds = rows.map(row => row.seat_id);
          
          // Delete the reservation (cascading deletes will handle reservation_seats)
          const deleteReservationSql = 'DELETE FROM reservations WHERE id = ? AND user_id = ?';
          db.run(deleteReservationSql, [reservationId, userId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            if (this.changes === 0) {
              db.run('ROLLBACK');
              return reject(new Error('Reservation not found or access denied'));
            }
            
            // Free the seats
            daoSeats.freeSeats(seatIds)
              .then(() => {
                db.run('COMMIT');
                resolve();
              })
              .catch(err => {
                db.run('ROLLBACK');
                reject(err);
              });
          });
        });
      } catch (err) {
        db.run('ROLLBACK');
        reject(err);
      }
    });
  });
};
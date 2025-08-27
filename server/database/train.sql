-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table: stores user account information and authentication data
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  hash       TEXT NOT NULL,
  salt       TEXT NOT NULL,
  otp_secret TEXT
);

-- Seats table: stores all available seats in the train
CREATE TABLE IF NOT EXISTS seats (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  car_class   TEXT NOT NULL CHECK (car_class IN ('first', 'second', 'economy')),
  row_number  INTEGER NOT NULL,
  seat_number INTEGER NOT NULL CHECK (seat_number IN (1, 2, 3, 4)),
  seat_code   TEXT NOT NULL, -- e.g., "10A", "3D", "15C" (row + seat letter)
  is_occupied INTEGER DEFAULT 0 CHECK (is_occupied IN (0, 1)),
  UNIQUE(car_class, row_number, seat_number)
);

-- Reservations table: stores user reservations
CREATE TABLE IF NOT EXISTS reservations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reservation_seats table: links reservations to specific seats
CREATE TABLE IF NOT EXISTS reservation_seats (
  reservation_id INTEGER NOT NULL,
  seat_id        INTEGER NOT NULL,
  PRIMARY KEY (reservation_id, seat_id),
  FOREIGN KEY(reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY(seat_id) REFERENCES seats(id) ON DELETE CASCADE
);

------------------------------------------------------------------------------------------------------------------------------
-- Sample users (password is 'password' for all users)
-- Hashes generated with Node.js crypto.scrypt for consistent authentication
-- All users have the same otp_secret as required by exam specifications
INSERT INTO users (username, name, hash, salt, otp_secret) VALUES
  ('mario', 'Mario Rossi', '86221378fd4fee24e3a2d12d6fa479c68d3eb96c6a6b67c216d12ffd7e7bc575', '8bbafa9d88d3634d', 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  ('lucia', 'Lucia Bianchi', '0463fb932a98a90ee1c3010cc40720ca3b9e400104c52a1d80bda27b8ba15727', '737153d1049a09b6', 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  ('giovanni', 'Giovanni Verdi', '5cf5b2c4cfd3d9485bd1110552f13d2a1c7e991412fe3e2d566931e4d77ae448', '98122d09051fc661', 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  ('anna', 'Anna Neri', '5cf5b2c4cfd3d9485bd1110552f13d2a1c7e991412fe3e2d566931e4d77ae448', '98122d09051fc661', 'LXBSMDTMSP2I5XFXIYRGFVWSFI');

------------------------------------------------------------------------------------------------------------------------------
-- Generate seats for all three car classes

-- First class: 10 rows x 2 seats (1=A, 2=B)
INSERT INTO seats (car_class, row_number, seat_number, seat_code) VALUES
  ('first', 1, 1, '1A'), ('first', 1, 2, '1B'),
  ('first', 2, 1, '2A'), ('first', 2, 2, '2B'),
  ('first', 3, 1, '3A'), ('first', 3, 2, '3B'),
  ('first', 4, 1, '4A'), ('first', 4, 2, '4B'),
  ('first', 5, 1, '5A'), ('first', 5, 2, '5B'),
  ('first', 6, 1, '6A'), ('first', 6, 2, '6B'),
  ('first', 7, 1, '7A'), ('first', 7, 2, '7B'),
  ('first', 8, 1, '8A'), ('first', 8, 2, '8B'),
  ('first', 9, 1, '9A'), ('first', 9, 2, '9B'),
  ('first', 10, 1, '10A'), ('first', 10, 2, '10B');

-- Second class: 15 rows x 3 seats (1=A, 2=B, 3=C)
INSERT INTO seats (car_class, row_number, seat_number, seat_code) VALUES
  ('second', 1, 1, '1A'), ('second', 1, 2, '1B'), ('second', 1, 3, '1C'),
  ('second', 2, 1, '2A'), ('second', 2, 2, '2B'), ('second', 2, 3, '2C'),
  ('second', 3, 1, '3A'), ('second', 3, 2, '3B'), ('second', 3, 3, '3C'),
  ('second', 4, 1, '4A'), ('second', 4, 2, '4B'), ('second', 4, 3, '4C'),
  ('second', 5, 1, '5A'), ('second', 5, 2, '5B'), ('second', 5, 3, '5C'),
  ('second', 6, 1, '6A'), ('second', 6, 2, '6B'), ('second', 6, 3, '6C'),
  ('second', 7, 1, '7A'), ('second', 7, 2, '7B'), ('second', 7, 3, '7C'),
  ('second', 8, 1, '8A'), ('second', 8, 2, '8B'), ('second', 8, 3, '8C'),
  ('second', 9, 1, '9A'), ('second', 9, 2, '9B'), ('second', 9, 3, '9C'),
  ('second', 10, 1, '10A'), ('second', 10, 2, '10B'), ('second', 10, 3, '10C'),
  ('second', 11, 1, '11A'), ('second', 11, 2, '11B'), ('second', 11, 3, '11C'),
  ('second', 12, 1, '12A'), ('second', 12, 2, '12B'), ('second', 12, 3, '12C'),
  ('second', 13, 1, '13A'), ('second', 13, 2, '13B'), ('second', 13, 3, '13C'),
  ('second', 14, 1, '14A'), ('second', 14, 2, '14B'), ('second', 14, 3, '14C'),
  ('second', 15, 1, '15A'), ('second', 15, 2, '15B'), ('second', 15, 3, '15C');

-- Economy class: 18 rows x 4 seats (1=A, 2=B, 3=C, 4=D)
INSERT INTO seats (car_class, row_number, seat_number, seat_code) VALUES
  ('economy', 1, 1, '1A'), ('economy', 1, 2, '1B'), ('economy', 1, 3, '1C'), ('economy', 1, 4, '1D'),
  ('economy', 2, 1, '2A'), ('economy', 2, 2, '2B'), ('economy', 2, 3, '2C'), ('economy', 2, 4, '2D'),
  ('economy', 3, 1, '3A'), ('economy', 3, 2, '3B'), ('economy', 3, 3, '3C'), ('economy', 3, 4, '3D'),
  ('economy', 4, 1, '4A'), ('economy', 4, 2, '4B'), ('economy', 4, 3, '4C'), ('economy', 4, 4, '4D'),
  ('economy', 5, 1, '5A'), ('economy', 5, 2, '5B'), ('economy', 5, 3, '5C'), ('economy', 5, 4, '5D'),
  ('economy', 6, 1, '6A'), ('economy', 6, 2, '6B'), ('economy', 6, 3, '6C'), ('economy', 6, 4, '6D'),
  ('economy', 7, 1, '7A'), ('economy', 7, 2, '7B'), ('economy', 7, 3, '7C'), ('economy', 7, 4, '7D'),
  ('economy', 8, 1, '8A'), ('economy', 8, 2, '8B'), ('economy', 8, 3, '8C'), ('economy', 8, 4, '8D'),
  ('economy', 9, 1, '9A'), ('economy', 9, 2, '9B'), ('economy', 9, 3, '9C'), ('economy', 9, 4, '9D'),
  ('economy', 10, 1, '10A'), ('economy', 10, 2, '10B'), ('economy', 10, 3, '10C'), ('economy', 10, 4, '10D'),
  ('economy', 11, 1, '11A'), ('economy', 11, 2, '11B'), ('economy', 11, 3, '11C'), ('economy', 11, 4, '11D'),
  ('economy', 12, 1, '12A'), ('economy', 12, 2, '12B'), ('economy', 12, 3, '12C'), ('economy', 12, 4, '12D'),
  ('economy', 13, 1, '13A'), ('economy', 13, 2, '13B'), ('economy', 13, 3, '13C'), ('economy', 13, 4, '13D'),
  ('economy', 14, 1, '14A'), ('economy', 14, 2, '14B'), ('economy', 14, 3, '14C'), ('economy', 14, 4, '14D'),
  ('economy', 15, 1, '15A'), ('economy', 15, 2, '15B'), ('economy', 15, 3, '15C'), ('economy', 15, 4, '15D'),
  ('economy', 16, 1, '16A'), ('economy', 16, 2, '16B'), ('economy', 16, 3, '16C'), ('economy', 16, 4, '16D'),
  ('economy', 17, 1, '17A'), ('economy', 17, 2, '17B'), ('economy', 17, 3, '17C'), ('economy', 17, 4, '17D'),
  ('economy', 18, 1, '18A'), ('economy', 18, 2, '18B'), ('economy', 18, 3, '18C'), ('economy', 18, 4, '18D');

-- Mark some seats as occupied for testing
UPDATE seats SET is_occupied = 1 WHERE seat_code IN ('1A', '1B', '3C', '10A', '5A', '10B', '5A', '5B', '15C', '1A', '1B', '1C');

-- Sample reservations:
-- Mario: Two reservations in same class (first class)
-- Lucia: Reservations in two different classes (second and economy) 
-- Giovanni: One reservation in each class (first, second, economy)
-- Anna: No reservations

INSERT INTO reservations (user_id) VALUES (1), (1), (2), (2), (3), (3), (3);

INSERT INTO reservation_seats (reservation_id, seat_id) VALUES 
  -- Mario's first reservation (first class) - 2 seats
  (1, (SELECT id FROM seats WHERE seat_code = '1A' AND car_class = 'first')),
  (1, (SELECT id FROM seats WHERE seat_code = '1B' AND car_class = 'first')),
  -- Mario's second reservation (first class) - 2 seats  
  (2, (SELECT id FROM seats WHERE seat_code = '5A' AND car_class = 'first')),
  (2, (SELECT id FROM seats WHERE seat_code = '5B' AND car_class = 'first')),
  -- Lucia's first reservation (second class) - 2 seats
  (3, (SELECT id FROM seats WHERE seat_code = '3C' AND car_class = 'second')),
  (3, (SELECT id FROM seats WHERE seat_code = '10A' AND car_class = 'second')),
  -- Lucia's second reservation (economy class) - 2 seats
  (4, (SELECT id FROM seats WHERE seat_code = '5A' AND car_class = 'economy')),
  (4, (SELECT id FROM seats WHERE seat_code = '10B' AND car_class = 'economy')),
  -- Giovanni's first reservation (first class) - 1 seat
  (5, (SELECT id FROM seats WHERE seat_code = '10A' AND car_class = 'first')),
  -- Giovanni's second reservation (second class) - 1 seat
  (6, (SELECT id FROM seats WHERE seat_code = '15C' AND car_class = 'second')),
  -- Giovanni's third reservation (economy class) - 3 seats
  (7, (SELECT id FROM seats WHERE seat_code = '1A' AND car_class = 'economy')),
  (7, (SELECT id FROM seats WHERE seat_code = '1B' AND car_class = 'economy')),
  (7, (SELECT id FROM seats WHERE seat_code = '1C' AND car_class = 'economy'));

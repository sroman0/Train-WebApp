'use strict';

// Express server setup for Train Reservation System
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');

const passport = require('passport');
const base32 = require('thirty-two');
const LocalStrategy = require('passport-local');
const TotpStrategy = require('passport-totp').Strategy;

// Import the Data Access Objects (DAOs)
const daoUsers = require('./DAOs/dao-users');
const daoSeats = require('./DAOs/dao-seats');
const daoReservations = require('./DAOs/dao-reservations');

const { validationResult, body } = require('express-validator');

//----------------------------------------------------------------------------
// Create the Express app and configure middleware
const app = express();
const port = 3001;

//----------------------------------------------------------------------------
// Middleware setup
app.use(morgan('dev'));
app.use(express.json());

// Enable CORS for the frontend communication
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
};
app.use(cors(corsOptions));

//----------------------------------------------------------------------------
// Session management (using default MemoryStore as in lectures)
app.use(session({
  secret: "train-reservation-secret",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

//----------------------------------------------------------------------------
// Initialize Passport.js for authentication
passport.use('local', new LocalStrategy(async function verify(username, password, callback) {
  try {
    const user = await daoUsers.getUser(username, password);
    if (!user) {
      return callback(null, false, { message: 'Incorrect username or password.' });
    }
    return callback(null, user);
  } catch (err) {
    return callback(err);
  }
}));

//----------------------------------------------------------------------------
// The TOTP strategy for two-factor authentication
passport.use(new TotpStrategy(
  function(user, done) {
    console.log('TOTP Strategy called for user:', user.username);
    console.log('User otp_secret:', user.otp_secret);
    // Only enable TOTP if user has otp_secret
    if (!user.otp_secret) return done(null, null);
    return done(null, base32.decode(user.otp_secret), 30);
  }
));

//----------------------------------------------------------------------------
// Serialize and deserialize user instances to support sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  daoUsers.getUserById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

//----------------------------------------------------------------------------
// Middleware to check if user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

//----------------------------------------------------------------------------
// Helper to send user info to client
function clientUserInfo(req) {
  const user = req.user;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    canDoTotp: !!user.otp_secret,
    isTotp: req.session.secondFactor === 'totp', // True if user has enabled 2FA
    otp_secret: user.otp_secret // Include otp_secret for 2FA detection
  };
}

//#############################################################################
// AUTHENTICATION APIs

//----------------------------------------------------------------------------
// Login (username/password)
app.post('/api/sessions', function(req, res, next) {
  console.log('Login attempt for:', req.body.username);
  
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      console.error('Authentication error:', err);
      return next(err);
    }
    
    if (!user) {
      console.log('Authentication failed:', info?.message);
      return res.status(401).json({ error: info?.message || 'Authentication failed' });
    }
    
    console.log('User authenticated:', user.username);
    
    req.login(user, function(err) {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      
      // Per exam requirements: users can choose to use 2FA or not
      // If user chooses not to use 2FA, they get standard access (no first-class confirmation)
      // If user chooses to use 2FA, they get full access after TOTP verification
      
      // For now, complete login without 2FA (user can choose to enable it)
      req.session.secondFactor = 'none'; // Standard authentication without 2FA
      console.log('Login successful for user:', user.username);
      return res.json({
        ...clientUserInfo(req),
        canDoTotp: !!user.otp_secret, // All users can choose 2FA
        isTotp: false, // Not using 2FA by default
        requiresTotp: false // User can choose to enable 2FA
      });
    });
  })(req, res, next);
});

//----------------------------------------------------------------------------
// TOTP verification (can be used to enable 2FA after standard login)
app.post('/api/login-totp', isLoggedIn, function(req, res, next) {
  console.log('TOTP verification attempt for user:', req.user.username);
  console.log('TOTP code received:', req.body.code);
  console.log('User otp_secret in session:', req.user.otp_secret);
  
  // Check if user has OTP secret
  if (!req.user.otp_secret) {
    return res.status(400).json({ error: 'TOTP not enabled for this user' });
  }
  
  passport.authenticate('totp', function(err, user, info) {
    console.log('TOTP auth result - err:', err, 'user:', !!user, 'info:', info);
    
    if (err) {
      console.error('TOTP authentication error:', err);
      return res.status(500).json({ error: 'Server error during TOTP verification' });
    }
    
    if (!user) {
      console.log('TOTP authentication failed for user:', req.user.username);
      return res.status(401).json({ error: 'Invalid TOTP code. Please try again.' });
    }
    
    console.log('TOTP authentication successful for:', req.user.username);
    // Enable 2FA for this session
    req.session.secondFactor = 'totp';
    
    return res.json({
      ...clientUserInfo(req),
      isTotp: true
    });
  })(req, res, next);
});

//----------------------------------------------------------------------------
// Get current session
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(clientUserInfo(req));
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

//----------------------------------------------------------------------------
// Logout
app.delete('/api/sessions/current', (req, res, next) => {
  req.logout(function(err) {
    if (err) return next(err);
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

//#############################################################################
// SEATS APIs

//----------------------------------------------------------------------------
// Get seats for a specific car class (public route)
app.get('/api/seats/:carClass', async (req, res) => {
  try {
    const { carClass } = req.params;
    
    // Validate car class
    if (!['first', 'second', 'economy'].includes(carClass)) {
      return res.status(400).json({ error: 'Invalid car class' });
    }
    
    const [seats, statistics] = await Promise.all([
      daoSeats.getSeatsByClass(carClass),
      daoSeats.getSeatStatistics(carClass)
    ]);
    
    res.json({ seats, statistics });
  } catch (err) {
    res.status(500).json({ error: 'Database error during seat retrieval' });
  }
});

//#############################################################################
// RESERVATIONS APIs

//----------------------------------------------------------------------------
// Get user's reservations (authentication required)
app.get('/api/reservations', isLoggedIn, async (req, res) => {
  try {
    const reservations = await daoReservations.getUserReservations(req.user.id);
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: 'Database error during reservation retrieval' });
  }
});

//----------------------------------------------------------------------------
// Create new reservation (authentication required)
app.post('/api/reservations', isLoggedIn, [
  body('seatIds').isArray().withMessage('Seat IDs must be an array'),
  body('seatIds.*').isInt({min: 1}).withMessage('Each seat ID must be a positive integer')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array() });
  }

  try {
    const { seatIds } = req.body;
    
    if (seatIds.length === 0) {
      return res.status(400).json({ error: 'At least one seat must be selected' });
    }
    
    // Check if reservation includes first-class seats
    const seats = await daoSeats.getSeatsByIds(seatIds);
    const hasFirstClassSeats = seats.some(seat => seat.car_class === 'first');
    
    // Per exam requirements: First-class reservations require 2FA
    if (hasFirstClassSeats && req.session.secondFactor !== 'totp') {
      return res.status(403).json({ 
        error: 'First-class reservations require 2FA authentication. Please enable 2FA and try again.' 
      });
    }
    
    const reservationId = await daoReservations.createReservation(req.user.id, seatIds);
    res.status(201).json({ id: reservationId, message: 'Reservation created successfully' });
  } catch (err) {
    if (err.message === 'Some seats are no longer available') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Database error during reservation creation' });
    }
  }
});

//----------------------------------------------------------------------------
// Delete reservation (authentication required)
app.delete('/api/reservations/:id', isLoggedIn, async (req, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    
    if (isNaN(reservationId)) {
      return res.status(400).json({ error: 'Invalid reservation ID' });
    }
    
    await daoReservations.deleteReservation(reservationId, req.user.id);
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    if (err.message === 'Reservation not found or access denied') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Database error during reservation deletion' });
    }
  }
});
//----------------------------------------------------------------------------
// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

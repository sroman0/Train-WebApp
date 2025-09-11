'use strict';

// This file sets up an Express server with Passport.js for authentication,
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');

const passport = require('passport');
const base32 = require('thirty-two');
const LocalStrategy = require('passport-local');
const TotpStrategy = require('passport-totp').Strategy;

// Import the Data Access Objects (DAOs) for users, seats, and reservations
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
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

//----------------------------------------------------------------------------
// Session management (using default MemoryStore as in lectures)
app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false,
}));

//----------------------------------------------------------------------------
// User session conflict detection middleware
// This detects when a different user logs in and helps prevent session confusion
app.use((req, res, next) => {
  if (req.session && req.session.lastActiveUser && req.isAuthenticated()) {
    const currentUser = req.user ? req.user.username : null;
    if (currentUser && req.session.lastActiveUser !== currentUser) {
      // Different user detected - clear session to force re-authentication
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
        return res.status(401).json({ 
          error: 'Session conflict detected. Another user has logged in. Please log in again.',
          sessionConflict: true 
        });
      });
      return;
    }
  }
  next();
});

app.use(passport.authenticate('session'));

//----------------------------------------------------------------------------
// Initialize Passport.js for authentication
// The local strategy is used for username/password authentication
passport.use(new LocalStrategy(
  function(username, password, done) {
    daoUsers.getUser(username, password)
      .then(user => {
        if (!user) return done(null, false, { message: 'Incorrect username or password.' });
        return done(null, user);
      })
      .catch(err => done(err));
  }
));

//----------------------------------------------------------------------------
// The TOTP strategy is used for two-factor authentication (2FA)
passport.use(new TotpStrategy(
  function(user, done) {
    // Use the user's otp_secret for TOTP verification
    if (!user.otp_secret) return done(null, null);
    return done(null, base32.decode(user.otp_secret), 30);
  }
));

//----------------------------------------------------------------------------
// Serialize and deserialize user instances to support sessions
// The serialization is used to store user ID in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  daoUsers.getUserById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

//----------------------------------------------------------------------------
// middleware to check if user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

//----------------------------------------------------------------------------
// middleware to check if user has completed TOTP
function isTotp(req, res, next) {
  if (req.session.method === 'totp') return next();
  return res.status(401).json({ error: 'TOTP authentication required' });
}

//----------------------------------------------------------------------------
// Helper to send user info to client, including isTotp
function clientUserInfo(req) {
  const user = req.user;
  return {
    id: user.id, 
    username: user.username, 
    name: user.name, 
    canDoTotp: !!user.otp_secret, // Can do TOTP if user has otp_secret
    isTotp: req.session.method === 'totp'  // Whether user has completed 2FA
  };
}


//#############################################################################
// Authentication APIs

// Login (username/password)
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) return res.status(401).json(info);
    
    req.login(user, function(err) {
      if (err) return next(err);
      
      // For this train app, users can optionally do TOTP if they have otp_secret
      req.session.secondFactor = 'pending';
      return res.json({
        ...clientUserInfo(req),
        canDoTotp: !!user.otp_secret,
        isTotp: false
      });
    });
  })(req, res, next);
});

//----------------------------------------------------------------------------
// TOTP verification (2FA)
app.post('/api/login-totp', isLoggedIn, function(req, res, next) {
  passport.authenticate('totp', function(err, user, info) {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Invalid TOTP' });
    
    req.session.method = 'totp';
    delete req.session.secondFactor;
    return res.json(clientUserInfo(req));
  })(req, res, next);
});

//----------------------------------------------------------------------------
// Get current user session
app.get('/api/sessions/current', function(req, res) {
  if (req.isAuthenticated()) {
    res.json(clientUserInfo(req));
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

//----------------------------------------------------------------------------
// Logout
app.delete('/api/sessions/current', function(req, res) {
  req.logout(function(err) {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({});
  });
});


//#############################################################################
// Train Reservation APIs

//----------------------------------------------------------------------------
// Get seats for a specific car class (public)
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
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Get user's reservations (authentication required)
app.get('/api/reservations', isLoggedIn, async (req, res) => {
  try {
    const reservations = await daoReservations.getUserReservations(req.user.id);
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
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
    return res.status(400).json({error: errors.array()});
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
    if (hasFirstClassSeats && req.session.method !== 'totp') {
      return res.status(403).json({ 
        error: 'First-class reservations require 2FA authentication. Please enable 2FA and try again.' 
      });
    }
    
    const reservationId = await daoReservations.createReservation(req.user.id, seatIds);
    res.status(201).json({ id: reservationId });
  } catch (err) {
    // Check if the error is related to seat conflicts
    if (err.message && (
      err.message.includes('no longer available') || 
      err.message.includes('seats were taken') ||
      err.message.includes('taken by another user')
    )) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Database error' });
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
      res.status(500).json({ error: 'Database error' });
    }
  }
});


//----------------------------------------------------------------------------
// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

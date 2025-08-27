const SERVER_URL = 'http://localhost:3001/api';

// Utility function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Authentication APIs
const logIn = async (credentials) => {
  const response = await fetch(`${SERVER_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
};

const logInTotp = async (totpCode) => {
  const response = await fetch(`${SERVER_URL}/login-totp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ code: totpCode }),
  });
  return handleResponse(response);
};

const getUserInfo = async () => {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    credentials: 'include',
  });
  return handleResponse(response);
};

const logOut = async () => {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    method: 'DELETE',
    credentials: 'include'
  });
  return handleResponse(response);
};

// Seats APIs
const getSeats = async (carClass) => {
  const response = await fetch(`${SERVER_URL}/seats/${carClass}`, {
    credentials: 'include',
  });
  return handleResponse(response);
};

// Reservations APIs
const getUserReservations = async () => {
  const response = await fetch(`${SERVER_URL}/reservations`, {
    credentials: 'include',
  });
  return handleResponse(response);
};

const createReservation = async (seatIds) => {
  const response = await fetch(`${SERVER_URL}/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ seatIds }),
  });
  return handleResponse(response);
};

const deleteReservation = async (reservationId) => {
  const response = await fetch(`${SERVER_URL}/reservations/${reservationId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse(response);
};

// Export all API functions
export {
  logIn,
  logInTotp,
  getUserInfo,
  logOut,
  getSeats,
  getUserReservations,
  createReservation,
  deleteReservation
};

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Container, Alert, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Import components
import LoginForm from './components/LoginForm';
import MainSeatView from './components/MainSeatView';
import SeatSelectionView from './components/SeatSelectionView';
import * as API from './API';

//----------------------------------------------------------------------------
// Main App Component
//----------------------------------------------------------------------------
function App() {
  // State management
  const [user, setUser] = useState(null);
  const [totpRequired, setTotpRequired] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('danger');
  const [loading, setLoading] = useState(true);

  //----------------------------------------------------------------------------
  // Centralized error handling
  const handleErrors = (err) => {
    let errorMessage = 'An unexpected error occurred';
    
    if (err.error) {
      errorMessage = err.error;
    } else if (err.message) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }

    // Handle authentication errors
    if (errorMessage.includes('Not authenticated') || errorMessage.includes('401')) {
      setUser(null);
      setTotpRequired(false);
      setPendingUser(null);
      errorMessage = 'Session expired. Please log in again.';
    }

    showMessage(errorMessage, 'danger');
  };

  //----------------------------------------------------------------------------
  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const userInfo = await API.getUserInfo();
        setUser(userInfo);
        setTotpRequired(false);
        setPendingUser(null);
      } catch (error) {
        // Silent fail - user is not logged in
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  //----------------------------------------------------------------------------
  // Handle user login
  async function handleLogin(credentials) {
    try {
      const result = await API.logIn(credentials);
      
      // User is logged in with standard access, but may choose 2FA
      if (result.canDoTotp && !result.isTotp) {
        // User logged in successfully but can choose 2FA for full access
        setPendingUser(result); // Store for potential 2FA upgrade
        setTotpRequired(true); // Show TOTP form
        return result; // Return to LoginForm for 2FA choice
      } else {
        // Standard login complete
        setUser(result);
        setTotpRequired(false);
        setPendingUser(null);
        // No welcome message needed - user sees they're logged in from page content
        return result;
      }
    } catch (error) {
      handleErrors(error);
      throw error; // Re-throw for LoginForm to handle
    }
  }

  //----------------------------------------------------------------------------
  // Handle TOTP verification (user chose to enable 2FA)
  async function handleTotp(code) {
    try {
      const result = await API.logInTotp(code);
      setUser(result);
      setTotpRequired(false);
      setPendingUser(null);
      // No message needed - 2FA success is evident from full access to reservations
    } catch (error) {
      handleErrors(error);
      throw error; // Re-throw for LoginForm to handle
    }
  }

  //----------------------------------------------------------------------------
  // Handle skipping TOTP (continue with standard access)
  async function handleSkipTotp() {
    if (pendingUser) {
      setUser(pendingUser);
      setTotpRequired(false);
      setPendingUser(null);
      // No message needed - the SeatSelectionView shows contextual 2FA info
    }
  }

  //----------------------------------------------------------------------------
  // Handle user logout
  async function handleLogout() {
    try {
      await API.logOut();
      setUser(null);
      setTotpRequired(false);
      setPendingUser(null);
      showMessage('Successfully logged out', 'success');
    } catch (error) {
      handleErrors(error);
      // Force logout on error
      setUser(null);
      setTotpRequired(false);
      setPendingUser(null);
      showMessage('Logged out (with errors)', 'warning');
    }
  }

  //----------------------------------------------------------------------------
  // Global message handler
  const showMessage = (msg, type = 'danger') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  //----------------------------------------------------------------------------
  // Loading state
  if (loading) {
    return (
      <div className="app-background min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4 className="text-white">Loading Train Reservation System...</h4>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-background">
        <Routes>
          {/* Main page - accessible without authentication */}
          <Route 
            path="/" 
            element={
              user ? <Navigate to="/reservations" replace /> : (
                <main className="main-content">
                  <Container fluid className="pt-2 pb-3 px-3 min-vh-100 d-flex flex-column">
                    {message && (
                      <Alert 
                        variant={messageType} 
                        dismissible 
                        onClose={() => setMessage('')}
                        className={`shadow-lg rounded-3 border-0 mb-3 fw-bold alert-solid alert-${messageType}`}
                        style={{
                          backgroundColor: 
                            messageType === 'success' ? '#28a745' : 
                            messageType === 'warning' ? '#ffc107' : 
                            messageType === 'info' ? '#17a2b8' : 
                            '#dc3545',
                          color: 'white',
                          border: `2px solid ${
                            messageType === 'success' ? '#1e7e34' : 
                            messageType === 'warning' ? '#e0a800' : 
                            messageType === 'info' ? '#138496' : 
                            '#c82333'
                          }`,
                          position: 'relative',
                          zIndex: 9999
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <i className={`bi ${
                            messageType === 'success' ? 'bi-check-circle-fill' : 
                            messageType === 'warning' ? 'bi-exclamation-triangle-fill' : 
                            messageType === 'info' ? 'bi-info-circle-fill' : 
                            'bi-x-circle-fill'
                          } me-2`}></i>
                          {message}
                        </div>
                      </Alert>
                    )}

                    <div className="flex-grow-1">
                      <MainSeatView user={user} onLogin={() => window.location.href = '/login'} onManageReservations={() => window.location.href = '/reservations'} onLogout={handleLogout} />
                    </div>
                  </Container>
                </main>
              )
            } 
          />
          
          {/* Login page */}
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/reservations" replace /> : 
              <div className="login-page">
                <LoginWithTotp 
                  user={user}
                  totpRequired={totpRequired}
                  onLogin={handleLogin}
                  onTotp={handleTotp}
                  onSkipTotp={handleSkipTotp}
                  pendingUser={pendingUser}
                />
              </div>
            } 
          />
          
          {/* Protected route - reservation management */}
          <Route 
            path="/reservations" 
            element={
              user ? (
                <main className="main-content">
                  <Container fluid className="py-3 min-vh-100 d-flex flex-column">
                    {message && (
                      <Alert 
                        variant={messageType} 
                        dismissible 
                        onClose={() => setMessage('')}
                        className="shadow-lg rounded-3 border-0 mb-3"
                        style={{
                          backgroundColor: 
                            messageType === 'success' ? '#d4edda' : 
                            messageType === 'warning' ? '#fff3cd' : 
                            messageType === 'info' ? '#cff4fc' : 
                            '#f8d7da',
                          color: 
                            messageType === 'success' ? '#0a3622' : 
                            messageType === 'warning' ? '#664d03' : 
                            messageType === 'info' ? '#055160' : 
                            '#58151c',
                          border: `1px solid ${
                            messageType === 'success' ? '#b8dabd' : 
                            messageType === 'warning' ? '#f0e68c' : 
                            messageType === 'info' ? '#9eeaf9' : 
                            '#f1aeb5'
                          }`
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <i className={`bi ${
                            messageType === 'success' ? 'bi-check-circle-fill' : 
                            messageType === 'warning' ? 'bi-exclamation-triangle-fill' : 
                            messageType === 'info' ? 'bi-info-circle-fill' : 
                            'bi-x-circle-fill'
                          } me-2`}></i>
                          {message}
                        </div>
                      </Alert>
                    )}

                    <div className="flex-grow-1">
                      <SeatSelectionView 
                        user={user} 
                        setMessage={showMessage} 
                        onLogout={handleLogout} 
                      />
                    </div>
                  </Container>
                </main>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

//----------------------------------------------------------------------------
// Login Component with TOTP handling
//----------------------------------------------------------------------------
function LoginWithTotp({ user, totpRequired, onLogin, onTotp, onSkipTotp, pendingUser }) {

  if (user && !totpRequired) {
    return null;
  }

  return (
    <LoginForm 
      onLogin={onLogin} 
      totpRequired={totpRequired} 
      onTotp={onTotp}
      onSkipTotp={onSkipTotp}
    />
  );
}

//----------------------------------------------------------------------------
// 404 Not Found Page
//----------------------------------------------------------------------------
function NotFoundPage() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="card shadow-lg border-0 card-transparent">
          <div className="card-body p-5">
            <i className="bi bi-train-front display-1 text-primary-custom mb-4"></i>
            <h2 className="text-danger mb-4 fw-bold">404 - Page Not Found</h2>
            <p className="lead text-muted mb-4">
              Sorry, the page you are looking for doesn't exist.
            </p>
            <button 
              className="btn btn-gradient-primary btn-lg rounded-pill px-4"
              onClick={() => window.location.href = '/'}
            >
              <i className="bi bi-house-fill me-2"></i>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

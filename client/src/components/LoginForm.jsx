import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function LoginForm({ onLogin, totpRequired, onTotp, onSkipTotp, userInfo }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTotpChoice, setShowTotpChoice] = useState(false);
  const [showTotpForm, setShowTotpForm] = useState(false);
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await onLogin({ username, password });
      // After successful login, check if user can choose 2FA
      if (result && result.canDoTotp && !result.isTotp) {
        setShowTotpChoice(true);
      }
    } catch (error) {
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onTotp(totpCode);
    } catch (error) {
      setError(error.message || 'Invalid TOTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = () => {
    setShowTotpChoice(false);
    setShowTotpForm(true);
    setTotpCode(''); // Clear any previous TOTP code
  };

  const handleSkip2FA = () => {
    setShowTotpChoice(false);
    setShowTotpForm(false);
    // Continue with standard access (no first-class reservations)
    if (onSkipTotp) {
      onSkipTotp();
    }
  };

  const handleBackToLogin = () => {
    setTotpCode('');
    setError(null);
    setShowTotpChoice(false);
    setShowTotpForm(false);
    if (onSkipTotp) {
      onSkipTotp();
    }
  };

  // If user just logged in and can choose 2FA
  if (showTotpChoice && userInfo && userInfo.canDoTotp && !userInfo.isTotp) {
    return (
      <div className="login-container">
        <Card className="shadow-lg border-0 card-transparent login-form-card">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <i className="bi bi-shield-check display-3 text-primary-custom mb-3"></i>
              <h3 className="fw-bold text-primary-custom mb-2">
                Two-Factor Authentication
              </h3>
              <p className="text-muted">
                Choose whether to enable 2FA for full access or continue with standard access
              </p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-4 rounded-3 border-0">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              </Alert>
            )}

            <div className="mb-4 p-3 bg-light rounded-3">
              <h6 className="fw-bold mb-2">
                <i className="bi bi-info-circle text-primary me-2"></i>
                What's the difference?
              </h6>
              <ul className="mb-0 small">
                <li><strong>With 2FA:</strong> Full access including first-class reservations</li>
                <li><strong>Standard Access:</strong> All features except first-class reservations</li>
              </ul>
            </div>

            <div className="d-grid gap-3">
              <Button 
                size="lg" 
                onClick={handleEnable2FA}
                className="btn-gradient-primary fw-bold border-0 shadow-sm"
              >
                <i className="bi bi-shield-check me-2"></i>
                Enable 2FA (Full Access)
              </Button>
              
              <Button 
                variant="outline-secondary" 
                size="lg"
                onClick={handleSkip2FA}
                className="rounded-3 fw-semibold"
              >
                <i className="bi bi-skip-forward me-2"></i>
                Continue with Standard Access
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Show TOTP form if user chose to enable 2FA or if it was required from parent
  if (showTotpForm || totpRequired) {
    return (
      <div className="login-container">
        <Card className="shadow-lg border-0 card-transparent login-form-card">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <i className="bi bi-shield-check display-3 text-primary-custom mb-3"></i>
              <h3 className="fw-bold text-primary-custom mb-2">
                Two-Factor Authentication
              </h3>
              <p className="text-muted">
                Enter your 2FA code to complete login
              </p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-4 rounded-3 border-0">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              </Alert>
            )}

            <Form onSubmit={handleTotpSubmit}>
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold text-dark">2FA Code</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={totpCode}
                  onChange={(e) => {
                    setTotpCode(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  disabled={loading}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="form-control-light totp-input rounded-3 border-0 shadow-sm"
                  size="lg"
                />
                <Form.Text className="text-muted mt-2">
                  <i className="bi bi-info-circle me-1"></i>
                  Enter the 6-digit code from your authenticator app
                </Form.Text>
              </Form.Group>

              <div className="d-grid gap-3">
                <Button 
                  type="submit"
                  size="lg" 
                  disabled={loading || totpCode.length !== 6}
                  className="btn-gradient-primary fw-bold border-0 shadow-sm"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check me-2"></i>
                      Verify Code & Enable Full Access
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline-secondary" 
                  size="lg"
                  onClick={handleBackToLogin}
                  disabled={loading}
                  className="rounded-3 fw-semibold"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Login
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="login-container">
      <Card className="shadow-lg border-0 card-transparent login-form-card">
        <Card.Body className="p-5">
              <div className="text-center mb-4">
                <i className="bi bi-train-front display-3 text-primary-custom mb-3 train-icon"></i>
                <h3 className="fw-bold text-primary-custom mb-2">
                  Welcome Back
                </h3>
                <p className="text-muted">
                  Sign in to your account to make reservations
                </p>
              </div>

              {error && (
                <Alert 
                  variant="danger" 
                  className="mb-4 rounded-3 border-0"
                  style={{
                    backgroundColor: '#f8d7da',
                    color: '#58151c',
                    border: '1px solid #f1aeb5'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </div>
                </Alert>
              )}

              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-dark">Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    disabled={loading}
                    className="form-control-light rounded-3 border-0 shadow-sm"
                    size="lg"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-dark">Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    disabled={loading}
                    className="form-control-light rounded-3 border-0 shadow-sm"
                    size="lg"
                  />
                </Form.Group>

                <div className="d-grid mb-4">
                  <Button 
                    type="submit"
                    size="lg" 
                    disabled={loading}
                    className="btn-gradient-primary fw-bold border-0 shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Sign In
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <Button 
                    variant="link"
                    onClick={handleBackToHome}
                    disabled={loading}
                    className="text-decoration-none text-muted fw-semibold"
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Train Seat View
                  </Button>
                </div>
              </Form>

            </Card.Body>
          </Card>
        </div>
      );
    }

export default LoginForm;

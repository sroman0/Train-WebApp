import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function NavigationBar({ user, logout }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Navbar 
      className="shadow-lg navbar-fixed navbar-gradient" 
      variant="dark" 
      expand="lg" 
      fixed="top"
    >
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-3">
          <i className="bi bi-train-front me-2 train-icon"></i>
          Train Reservation
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/" 
              active={location.pathname === '/'}
              className="text-light fw-semibold px-3"
            >
              <i className="bi bi-eye me-2"></i>
              View Seats
            </Nav.Link>
            
            {user && (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/reservations" 
                  active={location.pathname === '/reservations'}
                  className="text-light fw-semibold px-3"
                >
                  <i className="bi bi-ticket-perforated me-2"></i>
                  Make Reservations
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/my-reservations" 
                  active={location.pathname === '/my-reservations'}
                  className="text-light fw-semibold px-3"
                >
                  <i className="bi bi-list-check me-2"></i>
                  My Reservations
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-center">
            {user ? (
              <>
                {/* User info */}
                <div className="d-flex align-items-center me-3">
                  <i className="bi bi-person-circle me-2 fs-5 text-light"></i>
                  <span className="text-light fw-semibold me-2">{user.name}</span>
                  
                  {/* 2FA Badge - show for users with completed TOTP */}
                  {user.isTotp && (
                    <span className="badge bg-success ms-2 px-2 py-1">
                      <i className="bi bi-shield-check me-1"></i>
                      2FA
                    </span>
                  )}
                </div>

                {/* Logout button */}
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  onClick={logout}
                  className="rounded-pill px-3 fw-semibold"
                >
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                variant="light" 
                size="sm" 
                onClick={() => navigate('/login')}
                className="rounded-pill px-3 fw-semibold"
              >
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Login
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;

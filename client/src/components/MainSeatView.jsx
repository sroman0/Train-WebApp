import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import * as API from '../API';

// Main page component - shows seat availability without authentication
function MainSeatView({ user, onLogin, onManageReservations, onLogout }) {
  const [selectedClass, setSelectedClass] = useState('first');
  const [seats, setSeats] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);

  const carClasses = {
    first: { 
      name: 'First Class', 
      rows: 10, 
      seatsPerRow: 2, 
      color: 'primary',
      icon: 'bi-star-fill',
      description: 'Premium comfort with extra space'
    },
    second: { 
      name: 'Second Class', 
      rows: 15, 
      seatsPerRow: 3, 
      color: 'info',
      icon: 'bi-circle-fill',
      description: 'Comfortable seating for your journey'
    },
    economy: { 
      name: 'Economy Class', 
      rows: 18, 
      seatsPerRow: 4, 
      color: 'secondary',
      icon: 'bi-square-fill',
      description: 'Affordable travel option'
    }
  };

  // Load seats when class changes or component mounts
  useEffect(() => {
    loadSeats();
  }, [selectedClass]);

  const loadSeats = async () => {
    setLoading(true);
    try {
      const data = await API.getSeats(selectedClass);
      setSeats(data.seats || []);
      setStatistics(data.statistics || {});
    } catch (error) {
      setSeats([]);
      setStatistics({});
    } finally {
      setLoading(false);
    }
  };

  // Get seat color based on occupancy (red = occupied, green = available)
  const getSeatColor = (seat) => {
    return seat.is_occupied ? 'danger' : 'success';
  };

  const renderSeatMap = () => {
    const classInfo = carClasses[selectedClass];
    const seatMap = [];

    for (let row = 1; row <= classInfo.rows; row++) {
      const rowSeats = seats.filter(seat => seat.row_number === row);
      
      seatMap.push(
        <div key={row} className="d-flex justify-content-center align-items-center mb-2">
          <small className="me-3 text-muted fw-bold" style={{ minWidth: '30px' }}>
            {row}
          </small>
          <div className="d-flex gap-2">
            {Array.from({ length: classInfo.seatsPerRow }, (_, seatIndex) => {
              const seat = rowSeats.find(s => s.seat_number === seatIndex + 1);
              return (
                <Button
                  key={`${row}-${seatIndex + 1}`}
                  variant={seat ? getSeatColor(seat) : 'outline-secondary'}
                  size="sm"
                  disabled={true} // Always disabled on main page
                  className="seat-button"
                  style={{ 
                    minWidth: '45px', 
                    minHeight: '45px',
                    fontSize: '11px'
                  }}
                >
                  {seat ? seat.seat_code : '—'}
                </Button>
              );
            })}
          </div>
          {classInfo.seatsPerRow === 4 && (
            <div className="mx-3" style={{ width: '20px' }}>
              {/* Aisle space for economy class */}
            </div>
          )}
        </div>
      );
    }

    return seatMap;
  };

  return (
    <Container fluid>
      {/* Page Header with integrated user controls */}
      <Row className="mb-4">
        <Col>
          <div className="card border-0 shadow-lg card-transparent">
            <div className="card-body p-4">
              {/* User controls in top right corner of header */}
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h2 className="fw-bold mb-2 text-primary-custom">
                    <i className="bi bi-train-front me-3 train-icon"></i>
                    Train Seat Availability
                  </h2>
                  <p className="lead text-muted mb-0">
                    View current seat availability for all car classes
                  </p>
                  {!user && (
                    <p className="text-muted mb-0">
                      <small>Login to make reservations</small>
                    </p>
                  )}
                </div>
                
                {/* User controls integrated into header */}
                <div className="d-flex flex-column align-items-end">
                  {user ? (
                    <>
                      <div className="d-flex align-items-center mb-2">
                        <span className="me-3 text-primary-custom fw-bold">
                          <i className="bi bi-person-circle me-2"></i>
                          {user.name}
                        </span>
                        {user.isTotp && (
                          <span className="badge bg-success">
                            <i className="bi bi-shield-check me-1"></i>
                            2FA
                          </span>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={onManageReservations}
                          className="fw-semibold"
                        >
                          <i className="bi bi-ticket-perforated me-2"></i>
                          Manage Reservations
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          onClick={onLogout}
                        >
                          <i className="bi bi-box-arrow-right me-2"></i>
                          Logout
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={onLogin}
                      className="fw-semibold"
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Login
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={3} className="mb-4">
          {/* Car Class Selection */}
          <Card className="mb-4 shadow-lg border-0 card-transparent">
            <div className="card-header-gradient text-white">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-list-ul me-2"></i>
                Car Classes
              </h5>
            </div>
            <Card.Body className="p-0">
              {Object.entries(carClasses).map(([key, classInfo]) => (
                <Button
                  key={key}
                  variant={selectedClass === key ? classInfo.color : 'outline-' + classInfo.color}
                  className="w-100 rounded-0 border-0 border-bottom text-start py-3"
                  onClick={() => setSelectedClass(key)}
                  disabled={loading}
                >
                  <div className="d-flex align-items-center">
                    <i className={`${classInfo.icon} me-3 fs-5`}></i>
                    <div className="flex-grow-1">
                      <div className="fw-bold">{classInfo.name}</div>
                      <small className="text-muted">{classInfo.description}</small>
                      <div className="mt-1">
                        <small className="badge bg-light text-dark">
                          {classInfo.rows}×{classInfo.seatsPerRow} layout
                        </small>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </Card.Body>
          </Card>

          {/* Statistics */}
          {statistics && (
            <Card className="mb-4 shadow-lg border-0 card-transparent">
              <div className="card-header-gradient-success text-white">
                <h6 className="mb-0 fw-bold">
                  <i className="bi bi-bar-chart-fill me-2"></i>
                  Statistics
                </h6>
              </div>
              <Card.Body className="stats-card">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="fw-semibold">Total Seats:</span>
                  <Badge bg="secondary" className="px-3 py-2">{statistics.total_seats || 0}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="fw-semibold">Available:</span>
                  <Badge bg="success" className="px-3 py-2">{statistics.available_seats || 0}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Occupied:</span>
                  <Badge bg="danger" className="px-3 py-2">{statistics.occupied_seats || 0}</Badge>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col lg={9}>
          <Card className="shadow-lg border-0 card-transparent">
            <Card.Header className="d-flex justify-content-between align-items-center card-header-gradient text-white">
              <h5 className="mb-0 fw-bold">
                <i className={`${carClasses[selectedClass].icon} me-2`}></i>
                {carClasses[selectedClass].name} - Seat Availability
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
                    <span className="visually-hidden">Loading seats...</span>
                  </div>
                  <h5 className="text-muted">Loading seat map...</h5>
                  <p className="text-muted">Please wait while we fetch the latest seat availability</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div className="bg-dark text-white px-4 py-2 rounded-pill d-inline-block mb-4">
                      <i className="bi bi-arrow-up me-2"></i>
                      <strong>Front of Train</strong>
                      <i className="bi bi-arrow-up ms-2"></i>
                    </div>
                  </div>
                  
                  <div className="seat-map fade-in-up">
                    {renderSeatMap()}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default MainSeatView;

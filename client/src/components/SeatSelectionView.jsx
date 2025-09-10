import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Form, Modal } from 'react-bootstrap';
import * as API from '../API';

// Reservation Management Page (requires authentication)
function SeatSelectionView({ user, setMessage, onLogout }) {
  // State for reservations (left side)
  const [reservations, setReservations] = useState([]);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [isNewReservation, setIsNewReservation] = useState(true);

  // State for seat map (right side)
  const [selectedClass, setSelectedClass] = useState('first');
  const [seats, setSeats] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [requestedSeats, setRequestedSeats] = useState([]); // Local state for new reservations
  const [failedSeats, setFailedSeats] = useState([]); // Seats that caused reservation failure (blue for 7s)
  const [autoSelectCount, setAutoSelectCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [reserving, setReserving] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);

  // Error modal state for seat conflicts
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Success modal state for successful reservations
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // Current user's seats across all reservations
  const [userSeats, setUserSeats] = useState([]);

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

  // Load reservations once on mount (not dependent on class selection)
  useEffect(() => {
    loadReservations();
  }, []);

  // Load seats when class changes
  useEffect(() => {
    loadSeats();
  }, [selectedClass]);

  // Load user reservations
  const loadReservations = async () => {
    try {
      const data = await API.getUserReservations();
      setReservations(data);
      
      // Build list of all user's seats
      const allUserSeats = [];
      data.forEach(reservation => {
        reservation.seats.forEach(seat => {
          allUserSeats.push({
            ...seat,
            reservationId: reservation.id
          });
        });
      });
      setUserSeats(allUserSeats);
    } catch (error) {
      console.error('Error loading reservations:', error);
      setMessage(`Error loading reservations: ${error.message}`, 'danger');
    }
  };

  // Force refresh seats and clear all local state
  const forceRefreshSeats = async () => {
    console.log('🔄 FORCE REFRESH: Clearing all local state and reloading...');
    
    // Clear all local state first
    setRequestedSeats([]);
    setFailedSeats([]);
    setAutoSelectCount('');
    setSelectedReservationId(null);
    setIsNewReservation(true);
    
    // Force reload both seats and reservations
    await Promise.all([
      loadSeats(),
      loadReservations()
    ]);
    
    setMessage('Seat map refreshed', 'info');
  };

  // Load seats for current class
  const loadSeats = async () => {
    setLoading(true);
    try {
      const data = await API.getSeats(selectedClass);
      setSeats(data.seats || []);
      setStatistics(data.statistics || {});
    } catch (error) {
      console.error('Error loading seats:', error);
      setMessage(`Error loading seats for ${selectedClass} class: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Handle class change
  const handleClassChange = (newClass) => {
    setSelectedClass(newClass);
    setRequestedSeats([]); // Clear requested seats when changing class
    setFailedSeats([]); // Clear failed seats when changing class
  };

  // Handle reservation selection (show seats in orange)
  const handleReservationClick = (reservationId) => {
    setSelectedReservationId(reservationId);
    setIsNewReservation(false);
    setRequestedSeats([]); // Clear any requested seats
    setFailedSeats([]); // Clear any failed seats
    
    // Find the reservation and switch to its class
    const reservation = reservations.find(r => r.id === reservationId);
    if (reservation && reservation.car_class !== selectedClass) {
      setSelectedClass(reservation.car_class);
    }
  };

  // Handle new reservation button
  const handleNewReservation = () => {
    setSelectedReservationId(null);
    setIsNewReservation(true);
    setRequestedSeats([]);
    setFailedSeats([]); // Clear any failed seats
  };

  // Get seat status and color
  const getSeatStatus = (seat) => {
    // Check if seat is in failed state (blue highlighting for 7 seconds)
    if (failedSeats.includes(seat.id)) {
      return { 
        status: 'failed', 
        color: 'primary', 
        disabled: true,
        customStyle: { backgroundColor: '#007bff', borderColor: '#007bff', color: 'white' } // Blue
      };
    }
    
    // Check if seat is occupied by current user (in any reservation)
    const userSeat = userSeats.find(us => us.id === seat.id);
    if (userSeat) {
      // Different colors based on context:
      // - When viewing existing reservation: purple for that reservation's seats
      // - When creating new reservation: orange for all user's seats (can't select)
      if (!isNewReservation && selectedReservationId && userSeat.reservationId === selectedReservationId) {
        // Purple for the specific reservation being viewed
        return { 
          status: 'user_occupied_selected', 
          color: 'outline-secondary', 
          disabled: true,
          customStyle: { backgroundColor: '#6f42c1', borderColor: '#6f42c1', color: 'white' } // Purple
        };
      } else {
        // Orange for all other user seats (can't be selected)
        return { 
          status: 'user_occupied', 
          color: 'outline-warning', 
          disabled: true,
          customStyle: { backgroundColor: '#fd7e14', borderColor: '#fd7e14', color: 'white' } // Orange
        };
      }
    }
    
    // Check if seat is occupied by others
    if (seat.is_occupied) {
      return { status: 'occupied_others', color: 'danger', disabled: true, customStyle: null }; // Red
    }
    
    // Check if seat is requested (local state for new reservations only)
    if (isNewReservation && requestedSeats.includes(seat.id)) {
      return { status: 'requested', color: 'warning', disabled: false, customStyle: null }; // Yellow
    }
    
    // Seat is available
    return { status: 'available', color: 'success', disabled: false, customStyle: null }; // Green
  };

  // Handle seat click
  const handleSeatClick = (seat) => {
    // Only allow seat interaction for new reservations
    if (!isNewReservation) return;
    
    const seatStatus = getSeatStatus(seat);
    
    // Only allow interaction with available and requested seats
    if (seatStatus.status === 'available') {
      // Add to requested
      setRequestedSeats(prev => [...prev, seat.id]);
    } else if (seatStatus.status === 'requested') {
      // Remove from requested
      setRequestedSeats(prev => prev.filter(id => id !== seat.id));
    }
    // All other seat types (user_occupied, occupied_others, failed) cannot be clicked
    
    // Clear any auto-select count
    setAutoSelectCount('');
  };

  // Handle auto-select
  const handleAutoSelect = () => {
    const count = parseInt(autoSelectCount);
    if (isNaN(count) || count < 0) return;
    
    const availableSeats = seats.filter(seat => getSeatStatus(seat).status === 'available');
    const currentRequested = requestedSeats.length;
    
    if (count === currentRequested) return; // No change needed
    
    if (count > currentRequested) {
      // Add more seats
      const needed = count - currentRequested;
      const availableForSelection = availableSeats.filter(seat => !requestedSeats.includes(seat.id));
      const toAdd = availableForSelection.slice(0, needed);
      setRequestedSeats(prev => [...prev, ...toAdd.map(seat => seat.id)]);
    } else {
      // Remove some seats
      setRequestedSeats(prev => prev.slice(0, count));
    }
  };

  // Handle reservation confirmation
  const handleConfirmReservation = async () => {
    if (requestedSeats.length === 0) {
      setMessage('Select at least one seat', 'warning');
      return;
    }

    // Check if first class reservation requires 2FA (per exam requirements)
    if (selectedClass === 'first' && !user.isTotp) {
      setMessage('First-class requires 2FA - Please re-login', 'danger');
      return;
    }

    setReserving(true);
    try {
      await API.createReservation(requestedSeats);
      
      // Show prominent success modal instead of just a small message
      const successMessage = `Successfully reserved ${requestedSeats.length} seat${requestedSeats.length > 1 ? 's' : ''}!`;
      setSuccessModalMessage(successMessage);
      setShowSuccessModal(true);
      
      // Also set the regular message for consistency
      setMessage(successMessage, 'success');
      
      // Reload data to show the new reservation
      await loadReservations();
      await loadSeats();
      
      // Clear the reservation attempt
      setRequestedSeats([]);
      setAutoSelectCount('');
      
    } catch (error) {
      console.error('Reservation failed:', error);
      
      // Check if the error is due to seat availability conflicts
      if (error.message && error.message.includes('no longer available')) {
        // Identify which seats were requested but are now occupied
        const conflictedSeatIds = [];
        
        // Reload seats to get current state
        const currentSeatsData = await API.getSeats(selectedClass);
        const currentSeats = currentSeatsData.seats || [];
        
        // Find seats that were requested but are now occupied by others
        requestedSeats.forEach(requestedSeatId => {
          const currentSeat = currentSeats.find(s => s.id === requestedSeatId);
          if (currentSeat && currentSeat.is_occupied) {
            // Check if it's not occupied by current user
            const isUserSeat = userSeats.find(us => us.id === requestedSeatId);
            if (!isUserSeat) {
              conflictedSeatIds.push(requestedSeatId);
            }
          }
        });
        
        // Show conflicted seats in blue for 7 seconds
        if (conflictedSeatIds.length > 0) {
          setFailedSeats(conflictedSeatIds);
          setTimeout(() => {
            setFailedSeats([]);
          }, 7000); // 7 seconds
          
          // Show prominent error modal for seat conflicts
          const conflictMessage = `${conflictedSeatIds.length} seat${conflictedSeatIds.length > 1 ? 's were' : ' was'} taken by other users while you were selecting. The conflicted seats are highlighted in blue on the map.`;
          setErrorModalMessage(conflictMessage);
          setShowErrorModal(true);
          
          // Also set the regular message for consistency
          setMessage(`Reservation cancelled: ${conflictedSeatIds.length} seat${conflictedSeatIds.length > 1 ? 's were' : ' was'} taken by other users (highlighted in blue)`, 'danger');
        } else {
          setMessage(`Reservation failed: ${error.message}`, 'danger');
        }
      } else {
        // For other types of failures, also show modal for prominence
        setErrorModalMessage(`Reservation failed: ${error.message}`);
        setShowErrorModal(true);
        setMessage(`Reservation failed: ${error.message}`, 'danger');
      }
      
      // CRITICAL: Always refresh after any failure to ensure consistent state
      console.log('🔄 Refreshing seat data after reservation failure...');
      await Promise.all([
        loadSeats(),        // Refresh seat map with current occupied state
        loadReservations()  // Refresh user's reservations
      ]);
      
      // Clear the failed reservation attempt completely
      setRequestedSeats([]);
      setAutoSelectCount('');
      
      // The page now shows the true current state
      console.log('✅ Seat data refreshed after failure');
    } finally {
      setReserving(false);
    }
  };

  // Handle reservation deletion
  const handleDeleteReservation = async (reservationId) => {
    try {
      await API.deleteReservation(reservationId);
      setMessage('Reservation deleted', 'success');
      
      // If this was the selected reservation, clear selection
      if (selectedReservationId === reservationId) {
        setSelectedReservationId(null);
        setIsNewReservation(true);
      }
      
      // Reload data
      await loadReservations();
      await loadSeats();
      setShowDeleteModal(false);
      setReservationToDelete(null);
    } catch (error) {
      console.error('Error deleting reservation:', error);
      setMessage('Error deleting reservation', 'danger');
      setShowDeleteModal(false);
      setReservationToDelete(null);
    }
  };

  const confirmDeleteReservation = (reservation) => {
    setReservationToDelete(reservation);
    setShowDeleteModal(true);
  };

  // Calculate statistics for current view
  const calculateCurrentStatistics = () => {
    const occupiedByOthers = seats.filter(seat => {
      const status = getSeatStatus(seat);
      return status.status === 'occupied_others';
    }).length;
    
    const occupiedByUserSelected = seats.filter(seat => {
      const status = getSeatStatus(seat);
      return status.status === 'user_occupied_selected';
    }).length;
    
    const occupiedByUserOther = seats.filter(seat => {
      const status = getSeatStatus(seat);
      return status.status === 'user_occupied';
    }).length;
    
    // For available seats, we need to exclude those that are locally requested
    const available = seats.filter(seat => {
      const status = getSeatStatus(seat);
      return status.status === 'available';
    }).length;
    
    // Requested seats count from local state (only for new reservations)
    const requested = isNewReservation ? requestedSeats.length : 0;
    
    const failed = seats.filter(seat => {
      const status = getSeatStatus(seat);
      return status.status === 'failed';
    }).length;
    
    return {
      total: seats.length,
      occupiedByOthers,
      occupiedByUserSelected,
      occupiedByUserOther,
      available,
      requested,
      failed
    };
  };

  const currentStats = calculateCurrentStatistics();

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
              if (!seat) {
                return (
                  <Button
                    key={`${row}-${seatIndex + 1}`}
                    variant="outline-secondary"
                    size="sm"
                    disabled={true}
                    className="seat-button"
                    style={{ 
                      minWidth: '45px', 
                      minHeight: '45px',
                      fontSize: '11px'
                    }}
                  >
                    —
                  </Button>
                );
              }
              
              const seatStatus = getSeatStatus(seat);
              return (
                <Button
                  key={`${row}-${seatIndex + 1}`}
                  variant={seatStatus.color}
                  size="sm"
                  disabled={seatStatus.disabled || (!isNewReservation && (seatStatus.status === 'available'))}
                  onClick={() => handleSeatClick(seat)}
                  className="seat-button"
                  style={{ 
                    minWidth: '45px', 
                    minHeight: '45px',
                    fontSize: '11px',
                    cursor: (isNewReservation && (seatStatus.status === 'available' || seatStatus.status === 'requested')) ? 'pointer' : 'default',
                    ...(seatStatus.customStyle || {})
                  }}
                >
                  {seat.seat_code}
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
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h2 className="fw-bold mb-2 text-primary-custom">
                    <i className="bi bi-ticket-perforated me-3"></i>
                    Reservation Management
                  </h2>
                  <p className="lead text-muted mb-0">
                    Manage your train seat reservations
                  </p>
                </div>
                
                {/* User controls integrated into header */}
                <div className="d-flex flex-column align-items-end">
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
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={onLogout}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        {/* LEFT SIDE - Reservations List */}
        <Col lg={4} className="mb-4">
          <Card className="shadow-lg border-0 card-transparent">
            <div className="card-header-gradient text-white">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-list-ul me-2"></i>
                Your Reservations
              </h5>
            </div>
            <Card.Body className="p-0">
              {/* New Reservation Button */}
              <Button
                variant={isNewReservation ? 'primary' : 'outline-primary'}
                className="w-100 rounded-0 border-0 border-bottom text-start py-3"
                onClick={handleNewReservation}
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-plus-circle me-3 fs-5"></i>
                  <div className="flex-grow-1">
                    <div className="fw-bold">New Reservation</div>
                    <small className="text-muted">Create a new reservation</small>
                  </div>
                </div>
              </Button>

              {/* Existing Reservations */}
              {reservations.map(reservation => (
                <Button
                  key={reservation.id}
                  variant={selectedReservationId === reservation.id ? carClasses[reservation.car_class].color : 'outline-' + carClasses[reservation.car_class].color}
                  className="w-100 rounded-0 border-0 border-bottom text-start py-3 position-relative"
                  onClick={() => handleReservationClick(reservation.id)}
                >
                  <div className="d-flex align-items-center">
                    <i className={`${carClasses[reservation.car_class].icon} me-3 fs-5`}></i>
                    <div className="flex-grow-1">
                      <div className="fw-bold">Reservation #{reservation.id}</div>
                      <small className="text-muted">
                        {carClasses[reservation.car_class].name} - {reservation.seats.length} seat{reservation.seats.length > 1 ? 's' : ''}
                      </small>
                      <div className="mt-1">
                        <small className="badge bg-light text-dark">
                          {reservation.seats.map(seat => seat.seat_code).join(', ')}
                        </small>
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="ms-2 px-3 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteReservation(reservation);
                      }}
                      title="Delete reservation"
                    >
                      <i className="bi bi-trash me-1"></i>Delete
                    </Button>
                  </div>
                </Button>
              ))}

              {reservations.length === 0 && (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-ticket-perforated fs-1 mb-3 d-block"></i>
                  <p>No reservations yet</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* RIGHT SIDE - Class Selection and Seat Map */}
        <Col lg={8}>
          {/* Car Class Selection */}
          <Card className="mb-4 shadow-lg border-0 card-transparent">
            <div className="card-header-gradient text-white">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-list-ul me-2"></i>
                Select Car Class
              </h5>
            </div>
            <Card.Body className="p-0">
              <div className="d-flex">
                {Object.entries(carClasses).map(([key, classInfo]) => (
                  <Button
                    key={key}
                    variant={selectedClass === key ? classInfo.color : 'outline-' + classInfo.color}
                    className="flex-grow-1 rounded-0 border-0 py-3"
                    onClick={() => handleClassChange(key)}
                    disabled={loading}
                  >
                    <div className="text-center">
                      <i className={`${classInfo.icon} fs-4 d-block mb-2`}></i>
                      <div className="fw-bold">{classInfo.name}</div>
                      {key === 'first' && !user.isTotp && (
                        <small className="text-warning d-block mt-1">
                          <i className="bi bi-shield-exclamation"></i> 2FA Required
                        </small>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Combined Authentication Status */}
          <Alert 
            variant={user.isTotp ? "success" : (selectedClass === 'first' ? "warning" : "info")} 
            className={`mb-4 rounded-3 border-0 shadow-lg fw-bold alert-solid alert-${user.isTotp ? "success" : (selectedClass === 'first' ? "warning" : "info")}`}
          >
            <div className="d-flex align-items-center">
              <i className={`bi ${
                user.isTotp ? 'bi-shield-check-fill' : 
                (selectedClass === 'first' ? 'bi-shield-exclamation-fill' : 'bi-shield-fill')
              } me-2`}></i>
              <div>
                {user.isTotp ? (
                  <span>✓ Full access with 2FA enabled</span>
                ) : selectedClass === 'first' ? (
                  <span>⚠️ 2FA Required - Please log out and re-login with 2FA to reserve first-class seats</span>
                ) : (
                  <span>ℹ️ Standard access - First-class reservations require 2FA</span>
                )}
              </div>
            </div>
          </Alert>

          {/* Seat Map */}
          <Card className="shadow-lg border-0 card-transparent">
            <Card.Header className="card-header-gradient text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">
                  <i className={`${carClasses[selectedClass].icon} me-2`}></i>
                  {carClasses[selectedClass].name} - Seat Map
                </h5>
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  onClick={forceRefreshSeats}
                  disabled={loading}
                  className="rounded-pill"
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
                    <span className="visually-hidden">Loading seats...</span>
                  </div>
                  <h5 className="text-muted">Loading seat map...</h5>
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
                  
                  <div className="seat-map fade-in-up mb-4">
                    {renderSeatMap()}
                  </div>

                  {/* Statistics */}
                  <Row className="mb-4">
                    <Col>
                      <Card className="border-0" style={{backgroundColor: 'rgba(255,255,255,0.1)'}}>
                        <Card.Body>
                          <h6 className="fw-bold mb-3">Seat Statistics</h6>
                          <Row>
                            <Col sm={6} md={3} className="mb-2">
                              <div className="d-flex align-items-center">
                                <Badge bg="danger" className="me-2">●</Badge>
                                <small>Occupied by others: {currentStats.occupiedByOthers}</small>
                              </div>
                            </Col>
                            {currentStats.occupiedByUserSelected > 0 && (
                              <Col sm={6} md={3} className="mb-2">
                                <div className="d-flex align-items-center">
                                  <Badge style={{backgroundColor: '#6f42c1', border: 'none'}} className="me-2">●</Badge>
                                  <small>Your seats (this reservation): {currentStats.occupiedByUserSelected}</small>
                                </div>
                              </Col>
                            )}
                            {currentStats.occupiedByUserOther > 0 && (
                              <Col sm={6} md={3} className="mb-2">
                                <div className="d-flex align-items-center">
                                  <Badge style={{backgroundColor: '#fd7e14', border: 'none'}} className="me-2">●</Badge>
                                  <small>Your seats (other reservations): {currentStats.occupiedByUserOther}</small>
                                </div>
                              </Col>
                            )}
                            <Col sm={6} md={3} className="mb-2">
                              <div className="d-flex align-items-center">
                                <Badge bg="success" className="me-2">●</Badge>
                                <small>Available: {currentStats.available}</small>
                              </div>
                            </Col>
                            <Col sm={6} md={3} className="mb-2">
                              <div className="d-flex align-items-center">
                                <Badge bg="warning" className="me-2">●</Badge>
                                <small>Requested: {currentStats.requested}</small>
                              </div>
                            </Col>
                            {currentStats.failed > 0 && (
                              <Col sm={6} md={3} className="mb-2">
                                <div className="d-flex align-items-center">
                                  <Badge bg="primary" className="me-2">●</Badge>
                                  <small>Conflict (7s): {currentStats.failed}</small>
                                </div>
                              </Col>
                            )}
                          </Row>
                          <div className="mt-2">
                            <small className="text-muted">Total seats: {currentStats.total}</small>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Auto-select and Confirm (only for new reservations) */}
                  {isNewReservation && (
                    <Row>
                      <Col>
                        <Card className="border-0" style={{backgroundColor: 'rgba(255,255,255,0.1)'}}>
                          <Card.Body>
                            <Row className="align-items-center">
                              <Col md={6}>
                                <Form.Group className="d-flex align-items-center">
                                  <Form.Label className="me-3 mb-0 fw-bold" style={{minWidth: '120px'}}>
                                    Auto-select:
                                  </Form.Label>
                                  <Form.Control
                                    type="number"
                                    min="0"
                                    max={currentStats.available + currentStats.requested}
                                    value={autoSelectCount}
                                    onChange={(e) => setAutoSelectCount(e.target.value)}
                                    placeholder="Number of seats"
                                    className="me-2"
                                    style={{maxWidth: '150px'}}
                                  />
                                  <Button 
                                    variant="outline-primary" 
                                    onClick={handleAutoSelect}
                                    disabled={!autoSelectCount || loading}
                                  >
                                    Apply
                                  </Button>
                                </Form.Group>
                              </Col>
                              <Col md={6} className="text-end">
                                <Button
                                  variant="success"
                                  size="lg"
                                  onClick={handleConfirmReservation}
                                  disabled={requestedSeats.length === 0 || reserving || loading}
                                  className="fw-bold"
                                >
                                  {reserving ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-2" />
                                      Confirming...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-check-circle me-2"></i>
                                      Confirm Reservation ({requestedSeats.length})
                                    </>
                                  )}
                                </Button>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Success Modal for Successful Reservations */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="bi bi-check-circle-fill me-2"></i>
            Reservation Successful
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="mb-3">
            <i className="bi bi-check-circle text-success" style={{fontSize: '3rem'}}></i>
          </div>
          <h5 className="mb-3 text-success">Reservation Confirmed!</h5>
          <p className="mb-3">
            {successModalMessage}
          </p>
          <div className="alert alert-success">
            <i className="bi bi-info-circle me-2"></i>
            Your reservation has been added to your reservations list.
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button 
            variant="success" 
            onClick={() => setShowSuccessModal(false)}
            className="px-4"
          >
            <i className="bi bi-check-lg me-2"></i>
            Great!
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Error Modal for Seat Conflicts */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Reservation Failed
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="mb-3">
            <i className="bi bi-x-circle text-danger" style={{fontSize: '3rem'}}></i>
          </div>
          <h5 className="mb-3 text-danger">Seat Conflict Detected</h5>
          <p className="mb-3">
            {errorModalMessage}
          </p>
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            The seat map has been refreshed to show the current availability.
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button 
            variant="primary" 
            onClick={() => setShowErrorModal(false)}
            className="px-4"
          >
            <i className="bi bi-check-lg me-2"></i>
            Understood
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Confirm Deletion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="mb-3">
            <i className="bi bi-trash3 text-danger" style={{fontSize: '3rem'}}></i>
          </div>
          {reservationToDelete && (
            <>
              <h5 className="mb-3">Delete Reservation #{reservationToDelete.id}?</h5>
              <p className="text-muted">
                <strong>{reservationToDelete.car_class} Class</strong> - {reservationToDelete.seats?.length || 1} seat{(reservationToDelete.seats?.length || 1) > 1 ? 's' : ''}
              </p>
              <p className="text-danger fw-bold">
                This action cannot be undone.
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowDeleteModal(false)}
            className="px-4"
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => handleDeleteReservation(reservationToDelete?.id)}
            className="px-4"
          >
            <i className="bi bi-trash3 me-2"></i>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default SeatSelectionView;

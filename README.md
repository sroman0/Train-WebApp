# Train Reservation System

A web application for managing train seat reservations with three car classes (first, second, economy) and user authentication with optional 2FA.

## Server-side

### HTTP APIs offered by the server

- **POST `/api/sessions`**: Login endpoint - Parameters: `{username, password}` - Returns: User object with authentication status
- **POST `/api/sessions/totp`**: 2FA TOTP verification - Parameters: `{totpCode}` - Returns: Complete authentication with 2FA
- **GET `/api/sessions/current`**: Get current user session - Parameters: none (uses session cookies) - Returns: Current user info or 401
- **DELETE `/api/sessions/current`**: Logout endpoint - Parameters: none - Returns: Logout confirmation
- **GET `/api/seats/:carClass`**: Get seat map for a car class - Parameters: carClass (first|second|economy) - Returns: Seats array and statistics
- **GET `/api/reservations`**: Get user's reservations - Parameters: none (requires auth) - Returns: Array of user reservations with seats
- **POST `/api/reservations`**: Create new reservation - Parameters: `{seatIds: [array]}` - Returns: New reservation object
- **DELETE `/api/reservations/:id`**: Delete reservation - Parameters: reservation id in URL - Returns: Deletion confirmation

### Database tables

- **users**: User accounts (id, username, name, hash, salt, otp_secret)
- **seats**: Train seats (id, car_class, row_number, seat_number, seat_code)  
- **reservations**: Reservation records (id, user_id, created_at)
- **reservation_seats**: Links reservations to seats (reservation_id, seat_id)

## Client-side

### React application routes

- **/** (MainSeatView): Main page showing seat availability for each car class without authentication required
- **/login**: Login page with username/password and optional 2FA TOTP verification  
- **/reservations**: Authenticated page for managing user reservations with seat selection and booking

### Main React components

- **App**: Main application component handling routing, authentication state, and global notifications
- **LoginForm**: Login interface supporting both standard and 2FA authentication methods
- **MainSeatView**: Public seat availability view with car class selection and real-time seat status
- **SeatSelectionView**: Authenticated reservation management with interactive seat maps and booking functionality

## Overall

### Screenshot

![Reservation Management Page](./img/screenshot.png)

### Usernames and passwords

- **mario** / **password** - Regular user with two reservations in first class
- **lucia** / **password** - Regular user with reservations in second and economy classes  
- **giovanni** / **password** - Regular user with one reservation in each class (first, second, economy)
- **anna** / **password** - Regular user with no reservations (2FA enabled for first class access)


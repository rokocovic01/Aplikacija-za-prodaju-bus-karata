-- Tablica ruta
CREATE TABLE routes (
    route_id INTEGER NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    distance_km INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (route_id)
);

-- Tablica vozila/autobusa
CREATE TABLE buses (
    bus_id INTEGER NOT NULL,
    bus_number VARCHAR(20) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    model VARCHAR(50),
    PRIMARY KEY (bus_id)
);

-- Tablica voznih rasporeda
CREATE TABLE schedules (
    schedule_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    bus_id INTEGER NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    available_seats INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    PRIMARY KEY (schedule_id)
);

-- Tablica karata
CREATE TABLE tickets (
    ticket_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    passenger_name VARCHAR(100) NOT NULL,
    passenger_email VARCHAR(100) NOT NULL,
    seat_number INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    booking_time TIMESTAMP DEFAULT NOW,
    status VARCHAR(20) DEFAULT 'BOOKED',
    transaction_id VARCHAR(100),
    PRIMARY KEY (ticket_id)
);

-- Tablica transakcija za ACID testiranje
CREATE TABLE transactions_log (
    transaction_id VARCHAR(100) NOT NULL,
    ticket_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    timestamp_created TIMESTAMP DEFAULT NOW,
    status VARCHAR(20) DEFAULT 'PENDING',
    PRIMARY KEY (transaction_id)
);


const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// VoltDB HTTP API konfiguracija
const VOLTDB_BASE_URL = process.env.VOLTDB_BASE_URL || 'http://localhost:8080';

// Utility funkcija za izvršavanje SQL upita putem HTTP API-ja
async function executeSQL(query, parameters = []) {
    try {
        console.log('Executing SQL:', query);
        console.log('Parameters:', parameters);
        
        // VoltDB HTTP API endpoint za adhoc SQL
        const response = await axios.get(`${VOLTDB_BASE_URL}/api/1.0/`, {
            params: {
                Procedure: '@AdHoc',
                Parameters: JSON.stringify([query, ...(parameters || [])])
            },
            timeout: 10000
        });
        
        console.log('VoltDB Response:', response.data);
        return response.data;
        
    } catch (error) {
        console.error('VoltDB SQL Error:', error.response?.data || error.message);
        throw new Error(`Database error: ${error.response?.data?.statusstring || error.message}`);
    }
}

// API ENDPOINTS

// 1. Health check
app.get('/api/health', async (req, res) => {
    try {
        // Test VoltDB connection
        const testResponse = await axios.get(`${VOLTDB_BASE_URL}/api/1.0/`, {
            params: {
                Procedure: '@SystemInformation',
                Parameters: '["OVERVIEW"]'
            },
            timeout: 5000
        });
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            service: 'Bus Ticket API',
            voltdb: testResponse.status === 200 ? 'Connected' : 'Disconnected',
            voltdb_url: VOLTDB_BASE_URL
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            service: 'Bus Ticket API',
            voltdb: 'Disconnected',
            error: error.message
        });
    }
});

// 2. Dohvaćanje svih ruta
app.get('/api/routes', async (req, res) => {
    try {
        const result = await executeSQL('SELECT * FROM routes ORDER BY departure_city, arrival_city');
        
        res.json({
            success: true,
            data: result.results[0]?.data || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch routes',
            details: error.message
        });
    }
});

// 3. Dohvaćanje dostupnih voznih rasporeda
app.get('/api/schedules', async (req, res) => {
    try {
        const { departure_city, arrival_city } = req.query;
        
        let query = `
            SELECT 
                s.schedule_id,
                s.departure_time,
                s.arrival_time,
                s.available_seats,
                r.departure_city,
                r.arrival_city,
                r.base_price,
                r.duration_minutes,
                b.bus_number,
                b.capacity
            FROM schedules s, routes r, buses b
            WHERE s.route_id = r.route_id 
                AND s.bus_id = b.bus_id
                AND s.status = 'ACTIVE' 
                AND s.available_seats > 0
        `;
        
        const parameters = [];
        
        if (departure_city) {
            query += ' AND r.departure_city = ?';
            parameters.push(departure_city);
        }
        
        if (arrival_city) {
            query += ' AND r.arrival_city = ?';
            parameters.push(arrival_city);
        }
        
        query += ' ORDER BY s.departure_time';
        
        const result = await executeSQL(query, parameters);
        
        res.json({
            success: true,
            data: result.results[0]?.data || [],
            filters: { departure_city, arrival_city }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch schedules',
            details: error.message
        });
    }
});

// 4. Rezervacija karte - ACID transakcija
app.post('/api/book-ticket', async (req, res) => {
    try {
        const { schedule_id, passenger_name, passenger_email, seat_number } = req.body;
        
        if (!schedule_id || !passenger_name || !passenger_email || !seat_number) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: schedule_id, passenger_name, passenger_email, seat_number'
            });
        }

        // Dohvaćanje cijene za raspored
        const scheduleResult = await executeSQL(`
            SELECT r.base_price 
            FROM schedules s, routes r 
            WHERE s.route_id = r.route_id 
                AND s.schedule_id = ?
        `, [schedule_id]);
        
        if (!scheduleResult.results[0]?.data?.length) {
            return res.status(404).json({
                success: false,
                error: 'Schedule not found'
            });
        }
        
        const price = scheduleResult.results[0].data[0][0];
        const transactionId = uuidv4();
        
        // Generiranje ticket ID
        const ticketIdResult = await executeSQL('SELECT COALESCE(MAX(ticket_id), 0) + 1 FROM tickets');
        const newTicketId = ticketIdResult.results[0].data[0][0];
        
        // Provjera dostupnosti mjesta
        const availabilityCheck = await executeSQL(`
            SELECT available_seats 
            FROM schedules 
            WHERE schedule_id = ? AND status = 'ACTIVE'
        `, [schedule_id]);
        
        const availableSeats = availabilityCheck.results[0].data[0][0];
        
        if (availableSeats <= 0) {
            return res.status(400).json({
                success: false,
                error: 'No available seats'
            });
        }
        
        // Provjera je li mjesto već zauzeto
        const seatCheck = await executeSQL(`
            SELECT COUNT(*) 
            FROM tickets 
            WHERE schedule_id = ? AND seat_number = ? AND status = 'BOOKED'
        `, [schedule_id, seat_number]);
        
        const seatTaken = seatCheck.results[0].data[0][0];
        
        if (seatTaken > 0) {
            return res.status(400).json({
                success: false,
                error: 'Seat already taken'
            });
        }
        
        // Kreiranje karte
        await executeSQL(`
            INSERT INTO tickets 
            (ticket_id, schedule_id, passenger_name, passenger_email, 
             seat_number, price, transaction_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'BOOKED')
        `, [newTicketId, schedule_id, passenger_name, passenger_email, seat_number, price, transactionId]);
        
        // Ažuriranje broja dostupnih mjesta
        await executeSQL(`
            UPDATE schedules 
            SET available_seats = available_seats - 1
            WHERE schedule_id = ?
        `, [schedule_id]);
        
        // Kreiranje transaction log zapisa
        await executeSQL(`
            INSERT INTO transactions_log 
            (transaction_id, ticket_id, amount, transaction_type, status)
            VALUES (?, ?, ?, 'BOOKING', 'COMPLETED')
        `, [transactionId, newTicketId, price]);
        
        res.json({
            success: true,
            message: 'Ticket booked successfully',
            data: {
                ticket_id: newTicketId,
                transaction_id: transactionId,
                schedule_id: schedule_id,
                passenger_name: passenger_name,
                passenger_email: passenger_email,
                seat_number: seat_number,
                price: price
            }
        });
        
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to book ticket',
            details: error.message
        });
    }
});

// 5. Dohvaćanje karata korisnika
app.get('/api/user-tickets/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const result = await executeSQL(`
            SELECT 
                t.ticket_id,
                t.passenger_name,
                t.passenger_email,
                t.seat_number,
                t.price,
                t.booking_time,
                t.status,
                s.departure_time,
                s.arrival_time,
                r.departure_city,
                r.arrival_city,
                b.bus_number
            FROM tickets t, schedules s, routes r, buses b
            WHERE t.schedule_id = s.schedule_id
                AND s.route_id = r.route_id  
                AND s.bus_id = b.bus_id
                AND t.passenger_email = ?
            ORDER BY t.booking_time DESC
        `, [email]);
        
        res.json({
            success: true,
            data: result.results[0]?.data || []
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user tickets',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down gracefully...');
    process.exit(0);
});

// Pokretanje servera
app.listen(PORT, () => {
    console.log('🚀 Bus Ticket API Server started');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🔗 VoltDB HTTP API: ${VOLTDB_BASE_URL}`);
    console.log('\n📋 Available endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/routes');
    console.log('  GET  /api/schedules');
    console.log('  POST /api/book-ticket');
    console.log('  GET  /api/user-tickets/:email');
});
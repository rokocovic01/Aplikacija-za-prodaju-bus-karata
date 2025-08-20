
console.log('🚀 Loading Bus Ticket App...');

// Ensure DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    console.log('✅ DOM ready, initializing app...');
    window.busApp = new BusTicketApp();
}

class BusTicketApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.isConnected = false;
        this.currentSchedules = [];
        this.selectedSchedule = null;
        
        // IMMEDIATE setup to prevent form submission
        this.preventFormSubmissions();
        
        console.log('🔧 Bus Ticket App constructor called');
        
        // Setup everything else
        setTimeout(() => {
            this.init();
        }, 100);
    }

    preventFormSubmissions() {
        // IMMEDIATELY prevent all form submissions
        document.addEventListener('submit', (e) => {
            console.log('🛑 Form submission prevented:', e.target.id);
            e.preventDefault();
            e.stopPropagation();
            
            // Handle specific forms
            if (e.target.id === 'searchForm') {
                this.searchSchedules();
            } else if (e.target.id === 'bookingForm') {
                this.bookTicket();
            } else if (e.target.id === 'ticketsForm') {
                this.getUserTickets();
            }
            
            return false;
        }, true); // Use capture phase
        
        console.log('✅ Form submission prevention setup');
    }

    async init() {
        try {
            this.setupEventListeners();
            this.setupAxios();
            await this.checkConnection();
            this.setDefaultDate();
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Navigation tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            };
        });

        // Modal close
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.onclick = (e) => {
                e.preventDefault();
                this.closeModal();
            };
        }

        // Admin buttons  
        const testBtn = document.getElementById('testConnection');
        if (testBtn) {
            testBtn.onclick = (e) => {
                e.preventDefault();
                this.checkConnection();
            };
        }

        const refreshBtn = document.getElementById('refreshStats');
        if (refreshBtn) {
            refreshBtn.onclick = (e) => {
                e.preventDefault();
                this.refreshStats();
            };
        }

        // Global click handler
        document.onclick = (e) => {
            if (e.target.classList.contains('reserve-btn')) {
                e.preventDefault();
                const scheduleData = e.target.getAttribute('data-schedule');
                if (scheduleData) {
                    const schedule = JSON.parse(scheduleData);
                    this.openBookingModal(schedule);
                }
            }
        };

        // Escape key
        document.onkeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        };

        console.log('✅ Event listeners setup complete');
    }

    setupAxios() {
        axios.defaults.timeout = 10000;
        console.log('📡 Axios configured');
    }

    setDefaultDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateString = tomorrow.toISOString().split('T')[0];
        
        const dateInput = document.getElementById('travelDate');
        if (dateInput) {
            dateInput.value = dateString;
            dateInput.min = dateString;
        }
    }

    async checkConnection() {
        console.log('🔄 Checking VoltDB connection...');
        
        try {
            this.updateConnectionStatus('connecting');
            const startTime = Date.now();
            
            const response = await axios.get(`${this.apiBaseUrl}/health`);
            const responseTime = Date.now() - startTime;
            
            if (response.data.status === 'OK') {
                this.updateConnectionStatus('connected', responseTime);
                this.showNotification('✅ Uspješno povezano s VoltDB!', 'success');
                
                const dbConn = document.getElementById('dbConnection');
                const respTime = document.getElementById('responseTime');
                if (dbConn) dbConn.textContent = 'Connected';
                if (respTime) respTime.textContent = `${responseTime}ms`;
                
                await this.refreshStats();
                return true;
            }
        } catch (error) {
            console.error('❌ Connection failed:', error);
            this.updateConnectionStatus('disconnected');
            this.showNotification('❌ Greška konekcije s VoltDB', 'error');
            return false;
        }
    }

    updateConnectionStatus(status, responseTime = null) {
        this.isConnected = (status === 'connected');
        const indicator = document.querySelector('.status-indicator');
        const text = document.querySelector('.status-text');
        const footer = document.getElementById('footerStatus');

        if (!indicator || !text) return;

        switch (status) {
            case 'connected':
                indicator.className = 'status-indicator connected';
                text.textContent = `Povezano s VoltDB ${responseTime ? `(${responseTime}ms)` : ''}`;
                if (footer) footer.innerHTML = '🟢 Connected';
                break;
            case 'connecting':
                indicator.className = 'status-indicator connecting';
                text.textContent = 'Spajanje na VoltDB...';
                if (footer) footer.innerHTML = '🟡 Connecting';
                break;
            default:
                indicator.className = 'status-indicator';
                text.textContent = 'Veza s VoltDB prekinuta';
                if (footer) footer.innerHTML = '🔴 Disconnected';
        }
    }

    switchTab(tabName) {
        console.log('🔄 Switching to tab:', tabName);

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}Tab`)?.classList.add('active');

        if (tabName === 'admin') {
            this.refreshStats();
        }
    }

    async searchSchedules() {
        console.log('🔍 Searching schedules...');

        try {
            const departureCity = document.getElementById('departureCity')?.value;
            const arrivalCity = document.getElementById('arrivalCity')?.value;

            if (!departureCity || !arrivalCity) {
                this.showNotification('❌ Molimo odaberite gradove', 'error');
                return;
            }

            if (departureCity === arrivalCity) {
                this.showNotification('❌ Gradovi ne mogu biti isti', 'error');
                return;
            }

            const params = { departure_city: departureCity, arrival_city: arrivalCity };
            console.log('🌐 API request params:', params);

            const response = await axios.get(`${this.apiBaseUrl}/schedules`, { params });
            console.log('📡 API response:', response.data);

            if (response.data.success) {
                this.currentSchedules = response.data.data || [];
                this.displaySchedules(this.currentSchedules);
                
                if (this.currentSchedules.length === 0) {
                    this.showNotification(`ℹ️ Nema rasporeda za ${departureCity} → ${arrivalCity}`, 'info');
                } else {
                    this.showNotification(`✅ Pronađeno ${this.currentSchedules.length} rasporeda`, 'success');
                }
            }
        } catch (error) {
            console.error('❌ Search failed:', error);
            this.displaySchedules([]);
            this.showNotification('❌ Greška pri pretraživanju', 'error');
        }
    }

    displaySchedules(schedules) {
        console.log('📋 Displaying', schedules.length, 'schedules');

        const resultsSection = document.getElementById('searchResults');
        const schedulesList = document.getElementById('schedulesList');

        if (!resultsSection || !schedulesList) return;

        if (schedules.length === 0) {
            resultsSection.classList.add('hidden');
            return;
        }

        resultsSection.classList.remove('hidden');
        schedulesList.innerHTML = '';

        schedules.forEach(schedule => {
            const card = this.createScheduleCard(schedule);
            schedulesList.appendChild(card);
        });
    }

    createScheduleCard(schedule) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border: 2px solid #e5e7eb;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        `;

        const departureTime = new Date(schedule[1] / 1000).toLocaleString('hr-HR');
        const arrivalTime = new Date(schedule[2] / 1000).toLocaleString('hr-HR');
        const price = parseFloat(schedule[6]).toFixed(2);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <div>
                    <h4 style="color: #1f2937; font-size: 1.1rem; margin-bottom: 0.5rem;">
                        🚌 ${schedule[4]} → ${schedule[5]}
                    </h4>
                    <p style="color: #6b7280; font-size: 0.9rem;">🚐 ${schedule[8]}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #059669;">${price} €</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                <div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">🕐 POLAZAK</div>
                    <div style="font-weight: 600;">${departureTime}</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">🕑 DOLAZAK</div>
                    <div style="font-weight: 600;">${arrivalTime}</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">💺 MJESTA</div>
                    <div style="font-weight: 600;">${schedule[3]} / ${schedule[9]}</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">⏱️ TRAJANJE</div>
                    <div style="font-weight: 600;">${Math.floor(schedule[7] / 60)}h ${schedule[7] % 60}min</div>
                </div>
            </div>
            
            <button class="reserve-btn" data-schedule='${JSON.stringify(schedule)}'
                    style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); 
                           color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">
                🎫 Rezerviraj kartu
            </button>
        `;

        card.onmouseenter = () => {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
        };
        
        card.onmouseleave = () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        };

        return card;
    }

    openBookingModal(schedule) {
        console.log('📝 Opening booking modal:', schedule);

        this.selectedSchedule = schedule;
        const modal = document.getElementById('bookingModal');
        const details = document.getElementById('bookingDetails');

        if (!modal || !details) return;

        const departureTime = new Date(schedule[1] / 1000).toLocaleString('hr-HR');
        const arrivalTime = new Date(schedule[2] / 1000).toLocaleString('hr-HR');

        details.innerHTML = `
            <h4>📋 Detalji putovanja</h4>
            <p><strong>🚌 Ruta:</strong> ${schedule[4]} → ${schedule[5]}</p>
            <p><strong>🚐 Autobus:</strong> ${schedule[8]}</p>
            <p><strong>🕐 Polazak:</strong> ${departureTime}</p>
            <p><strong>🕑 Dolazak:</strong> ${arrivalTime}</p>
            <p><strong>💰 Cijena:</strong> ${parseFloat(schedule[6]).toFixed(2)} €</p>
            <p><strong>💺 Dostupno:</strong> ${schedule[3]} mjesta</p>
        `;

        const seatInput = document.getElementById('seatNumber');
        if (seatInput) {
            seatInput.max = schedule[9];
            seatInput.min = 1;
        }

        document.getElementById('bookingForm')?.reset();
        modal.classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('passengerName')?.focus();
        }, 100);
    }

    closeModal() {
        const modal = document.getElementById('bookingModal');
        if (modal) modal.classList.add('hidden');
        
        const form = document.getElementById('bookingForm');
        if (form) form.reset();
        
        this.selectedSchedule = null;
    }

    async bookTicket() {
        console.log('🎫 Booking ticket...');

        if (!this.selectedSchedule) {
            this.showNotification('❌ Odaberite raspored', 'error');
            return;
        }

        try {
            const name = document.getElementById('passengerName')?.value?.trim();
            const email = document.getElementById('passengerEmail')?.value?.trim();
            const seat = parseInt(document.getElementById('seatNumber')?.value);

            if (!name || name.length < 2) {
                this.showNotification('❌ Unesite ime (min. 2 znakova)', 'error');
                return;
            }

            if (!email || !email.includes('@')) {
                this.showNotification('❌ Unesite važeći email', 'error');
                return;
            }

            if (!seat || seat < 1 || seat > this.selectedSchedule[9]) {
                this.showNotification(`❌ Broj mjesta: 1-${this.selectedSchedule[9]}`, 'error');
                return;
            }

            const data = {
                schedule_id: this.selectedSchedule[0],
                passenger_name: name,
                passenger_email: email,
                seat_number: seat
            };

            console.log('🌐 Booking request:', data);

            const response = await axios.post(`${this.apiBaseUrl}/book-ticket`, data);

            if (response.data.success) {
                const ticket = response.data.data;
                this.showNotification(
                    `✅ Karta rezervirana!\n🎫 ID: ${ticket.ticket_id}\n💰 ${ticket.price}€`,
                    'success'
                );
                this.closeModal();
                this.searchSchedules(); // Refresh
            }
        } catch (error) {
            console.error('❌ Booking failed:', error);
            const msg = error.response?.data?.error || 'Greška pri rezervaciji';
            this.showNotification(`❌ ${msg}`, 'error');
        }
    }

    async getUserTickets() {
        try {
            const email = document.getElementById('userEmail')?.value?.trim();
            
            if (!email || !email.includes('@')) {
                this.showNotification('❌ Unesite važeći email', 'error');
                return;
            }

            const response = await axios.get(`${this.apiBaseUrl}/user-tickets/${email}`);

            if (response.data.success) {
                this.displayUserTickets(response.data.data);
                
                if (response.data.data.length === 0) {
                    this.showNotification('ℹ️ Nema karata za taj email', 'info');
                } else {
                    this.showNotification(`✅ Pronađeno ${response.data.data.length} karata`, 'success');
                }
            }
        } catch (error) {
            console.error('❌ Get tickets failed:', error);
            this.showNotification('❌ Greška pri dohvaćanju karata', 'error');
        }
    }

    displayUserTickets(tickets) {
        const container = document.getElementById('userTickets');
        if (!container) return;

        if (tickets.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = '<h3>📋 Vaše karte</h3>';

        tickets.forEach(ticket => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                border: 1px solid #e5e7eb;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            `;

            const departure = new Date(ticket[7] / 1000).toLocaleString('hr-HR');
            const arrival = new Date(ticket[8] / 1000).toLocaleString('hr-HR');

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <div>
                        <h4>🎫 Ticket #${ticket[0]}</h4>
                        <p>${ticket[9]} → ${ticket[10]}</p>
                    </div>
                    <span style="padding: 0.25rem 0.75rem; border-radius: 20px; 
                                 background: ${ticket[6] === 'BOOKED' ? '#dcfce7' : '#fee2e2'}; 
                                 color: ${ticket[6] === 'BOOKED' ? '#166534' : '#991b1b'}; 
                                 font-size: 0.75rem; font-weight: 600;">
                        ${ticket[6]}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div><strong>👤</strong> ${ticket[1]}</div>
                    <div><strong>💺</strong> Mjesto ${ticket[3]}</div>
                    <div><strong>🕐</strong> ${departure}</div>
                    <div><strong>💰</strong> ${parseFloat(ticket[4]).toFixed(2)} €</div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    async refreshStats() {
        try {
            const [routes, schedules] = await Promise.all([
                axios.get(`${this.apiBaseUrl}/routes`),
                axios.get(`${this.apiBaseUrl}/schedules`)
            ]);

            const routesCount = routes.data.success ? routes.data.data.length : 0;
            const schedulesCount = schedules.data.success ? schedules.data.data.length : 0;

            const totalRoutes = document.getElementById('totalRoutes');
            const totalSchedules = document.getElementById('totalSchedules');

            if (totalRoutes) totalRoutes.textContent = routesCount;
            if (totalSchedules) totalSchedules.textContent = schedulesCount;

        } catch (error) {
            console.error('❌ Stats refresh failed:', error);
        }
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Use alert for now - simple and reliable
        alert(message);

        // Try to use the notification system if available
        const notification = document.getElementById('notification');
        if (notification) {
            const icon = document.querySelector('.notification-icon');
            const messageSpan = document.querySelector('.notification-message');

            if (icon && messageSpan) {
                const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
                
                notification.className = `notification ${type}`;
                icon.textContent = icons[type] || icons.info;
                messageSpan.textContent = message;
                notification.classList.remove('hidden');

                setTimeout(() => {
                    notification.classList.add('hidden');
                }, 5000);
            }
        }
    }
}

console.log('📜 App script loaded');
EOF
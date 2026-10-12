/**
 * AgriProcure REST API Client Bridge
 * Connects Vercel Frontend to Render Backend API (Neon Cloud PostgreSQL)
 */

class AgriProcureAPI {
    constructor() {
        const hostname = window.location.hostname;
        if (window.ENV_API_URL) {
            this.baseUrl = window.ENV_API_URL;
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.baseUrl = 'http://localhost:5000/api';
        } else {
            // Live Render Production Backend URL
            this.baseUrl = 'https://farmerprocurementmanagement.onrender.com/api';
        }

        this.isOnline = true;
        this.checkConnection();
    }

    async checkConnection(attempt = 1) {
        const dbBadge = document.getElementById('db-status-pill');
        if (dbBadge && attempt === 1) {
            dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> Checking Neon DB...`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (data.status === 'Online') {
                this.isOnline = true;
                console.log('✅ Backend API Connected:', this.baseUrl, data);
                if (dbBadge) {
                    if (data.database && data.database.status && data.database.status.includes('Connected')) {
                        dbBadge.innerHTML = `<span class="pulse-dot-green"></span> ⚡ Neon Cloud DB: Connected`;
                        dbBadge.className = 'status-pill connected';
                        dbBadge.title = 'Connected to Neon PostgreSQL cloud database';
                    } else if (data.database && data.database.status && data.database.status.includes('password authentication failed')) {
                        dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> 🔑 Neon DB: Password Error`;
                        dbBadge.className = 'status-pill fallback';
                        dbBadge.title = 'Neon password authentication failed. Please reset or re-copy your password from Neon console.';
                    } else {
                        dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> ⚙️ Render Live | DB: Not Configured`;
                        dbBadge.className = 'status-pill fallback';
                        dbBadge.title = 'Render is live! Add DATABASE_URL to Render Dashboard -> Environment to link Neon DB.';
                    }
                }
                return data;
            }
        } catch (err) {
            this.isOnline = false;
            console.warn(`⚠️ Backend API connection attempt ${attempt} failed:`, err.message);
            if (dbBadge) {
                if (attempt < 4) {
                    dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> ⏳ Waking Render (${attempt}/3)...`;
                    dbBadge.className = 'status-pill fallback';
                    // Render free tier spins down after inactivity and needs 30-50s to wake up
                    setTimeout(() => this.checkConnection(attempt + 1), 6000);
                } else {
                    dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> 📁 Local Demo Mode`;
                    dbBadge.className = 'status-pill fallback';
                    dbBadge.title = 'Operating in browser offline fallback mode with demo data';
                }
            }
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `API Error: ${response.statusText}`);
            }
            return data;
        } catch (error) {
            console.error(`API Request Failed [${options.method || 'GET'} ${endpoint}]:`, error.message);
            throw error;
        }
    }

    // API Methods
    async getHealth() { return this.request('/health'); }
    async getDashboardStats() { return this.request('/admin/dashboard-stats'); }
    async getFarmers() { return this.request('/farmers'); }
    async registerFarmer(farmerData) { return this.request('/farmers', { method: 'POST', body: JSON.stringify(farmerData) }); }
    async getCenters() { return this.request('/centers'); }
    async getCenterSlots(centerId) { return this.request(`/centers/${centerId}/slots`); }
    async bookSlot(bookingData) { return this.request('/centers/book-slot', { method: 'POST', body: JSON.stringify(bookingData) }); }
    async getQueue() { return this.request('/queue'); }
    async updateQueueStatus(id, status) { return this.request(`/queue/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); }
    async submitInspection(inspectionData) { return this.request('/verification/inspect', { method: 'POST', body: JSON.stringify(inspectionData) }); }
    async getPayouts() { return this.request('/payouts'); }
    async disbursePayout(payoutId) { return this.request(`/payouts/${payoutId}/disburse`, { method: 'PUT' }); }
    async getMspRates() { return this.request('/admin/msp'); }
}

// Global Toast Notification Helper
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const bg = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B';
    toast.style.cssText = `background: ${bg}; color: #fff; padding: 12px 20px; border-radius: 8px; font-weight: 500; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); transition: all 0.3s ease; transform: translateY(20px); opacity: 0;`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Attach globally
window.api = new AgriProcureAPI();

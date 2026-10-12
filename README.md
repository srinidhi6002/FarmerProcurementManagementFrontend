# 🌾 AgriProcure - Frontend Client

Modern, responsive web application for the **Smart Farmer Procurement & Mandi Management System**. Powered by Vanilla JavaScript, CSS Glassmorphism design system, and seamless REST integration with the Render Backend API and Neon Cloud PostgreSQL.

---

## 🚀 Live Production Links
- **Vercel Frontend**: [https://farmer-procurement-management.vercel.app](https://farmer-procurement-management.vercel.app)
- **Render Backend API**: [https://farmerprocurementmanagement.onrender.com/api](https://farmerprocurementmanagement.onrender.com/api)
- **API Health Check**: [https://farmerprocurementmanagement.onrender.com/api/health](https://farmerprocurementmanagement.onrender.com/api/health)

---

## 📁 Repository Structure
```
frontend/
├── index.html        # Main Application Interface & Modals
├── styles.css        # Glassmorphic Theme Design System & Responsive CSS
├── app.js            # Client Controller, Event Handlers & Form Validation
├── api.js            # REST API Client Bridge with Auto-Reconnect & Fallback
├── vercel.json       # Vercel Production Routing & Rewrites Configuration
├── .gitignore        # Git Ignored Files
├── css/
│   └── styles.css    # Matching CSS path fallback
└── js/
    ├── api.js        # Matching JS path fallback
    └── app.js        # Matching JS path fallback
```

---

## ⚡ Features
- **Strict Form Validation**:
  - **Phone Number**: Exact 10 digits starting with 6, 7, 8, or 9 with live numeric restriction.
  - **Aadhaar Number**: 12-digit Indian UIDAI validation with automatic hyphen formatting (`XXXX-XXXX-XXXX`), preventing leading 0 or 1.
  - **Bank Details**: Exact IFSC format validation (`^[A-Z]{4}0[A-Z0-9]{6}$`) with auto-uppercasing and 9–18 digit account numbers.
  - **Weighbridge Net Calculator**: Real-time calculation with strict guard ensuring `Gross Weight > Tare Weight`.
- **Live Mandi Ticker**: Real-time MSP rates (Paddy, Wheat, Maize, Mustard, Cotton).
- **Slot Booking & Live Queue**: Instant token generation for mandis.
- **DBT Payouts**: Real-time direct bank transfer disbursement tracking.
- **Printable Vouchers**: Clean print receipt layout for mandi samiti tokens.

---

## 🛠️ Local Development
To run the frontend locally:
1. Double-click `index.html` or serve with any static web server:
   ```bash
   npx serve .
   ```
2. When run on `localhost` or `127.0.0.1`, the client automatically routes to `http://localhost:5000/api`. In cloud environments (Vercel), it routes to `https://farmerprocurementmanagement.onrender.com/api`.

---

## 🚀 How to Push to GitHub & Deploy to Vercel

### Step 1: Create GitHub Repository
1. Go to [GitHub.com/new](https://github.com/new).
2. Name the repository: `FarmerProcurement-Frontend`.
3. Choose **Public** and do NOT check "Add a README file".
4. Click **Create repository**.

### Step 2: Push `frontend/` Folder to GitHub
Open your terminal in the `frontend` folder:
```bash
git init
git add .
git commit -m "feat: complete frontend with strict form validation and vercel config"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/FarmerProcurement-Frontend.git
git push -u origin main --force
```

### Step 3: Link to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Import the `FarmerProcurement-Frontend` repository.
4. Keep the Framework Preset as **Other** (Root directory: `./`).
5. Click **Deploy**.
6. Your live Vercel URL will be generated immediately!

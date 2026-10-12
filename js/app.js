/**
 * AgriProcure - Farmer Procurement & Mandi Management System
 * Full-Stack App Controller with Neon PostgreSQL API & Local Fallback
 */

class AgriProcureApp {
    constructor() {
        this.api = window.api;
        this.currentFarmer = null;
        this.centers = [];
        this.farmers = [];
        this.intakeRecords = [];
        this.weighbridgeSlips = [];
        this.payouts = [];
        this.mspRates = {};
        this.stats = {
            totalFarmers: 0,
            totalProcurementQtl: "0.00",
            totalDisbursedPayouts: "0.00",
            totalPendingPayouts: "0.00",
            activeQueueCount: 0
        };

        this.init();
    }

    async init() {
        this.initDOM();
        this.bindEvents();
        await this.loadAllData();
        this.renderAll();
    }

    initDOM() {
        this.navButtons = document.querySelectorAll('.nav-item');
        this.tabViews = document.querySelectorAll('.tab-view');
        
        // Modals
        this.modalFarmer = document.getElementById('modal-farmer');
        this.modalIntake = document.getElementById('modal-intake');
        this.modalVoucher = document.getElementById('modal-voucher');
        this.modalSlot = document.getElementById('modal-slot');
    }

    bindEvents() {
        // Nav tab click
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });

        // Quick action buttons
        document.getElementById('btn-quick-intake')?.addEventListener('click', () => this.openModal('modal-intake'));
        document.getElementById('btn-new-intake-modal')?.addEventListener('click', () => this.openModal('modal-intake'));
        document.getElementById('btn-add-farmer')?.addEventListener('click', () => this.openModal('modal-farmer'));
        document.getElementById('btn-book-slot-modal')?.addEventListener('click', () => this.openModal('modal-slot'));

        // Search & Filters
        document.getElementById('global-search')?.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
        document.getElementById('farmer-search-input')?.addEventListener('input', () => this.renderFarmers());

        // Form submit handlers
        document.getElementById('form-register-farmer')?.addEventListener('submit', (e) => this.handleRegisterFarmer(e));
        document.getElementById('form-new-intake')?.addEventListener('submit', (e) => this.handleNewIntake(e));
        document.getElementById('form-book-slot')?.addEventListener('submit', (e) => this.handleBookSlot(e));
        document.getElementById('weighbridge-form')?.addEventListener('submit', (e) => this.handleWeighbridgeSubmit(e));

        // Intake Payout preview dynamic calculation
        document.getElementById('in-crop-type')?.addEventListener('change', () => this.updatePayoutPreview());
        document.getElementById('in-quantity')?.addEventListener('input', () => this.updatePayoutPreview());
        document.getElementById('in-grade')?.addEventListener('change', () => this.updatePayoutPreview());

        // Weighbridge Net weight calculation
        document.getElementById('wb-gross-weight')?.addEventListener('input', () => this.calcWeighbridgeNet());
        document.getElementById('wb-tare-weight')?.addEventListener('input', () => this.calcWeighbridgeNet());

        // Setup real-time form validation & auto-formatting
        this.bindFormValidation();
    }

    async loadAllData() {
        try {
            // Check health & DB status
            const health = await this.api.getHealth().catch(() => null);
            const dbBadge = document.getElementById('db-status-pill');
            if (dbBadge) {
                if (health && health.database && health.database.status && health.database.status.includes('Connected')) {
                    dbBadge.innerHTML = `<span class="pulse-dot-green"></span> ⚡ Neon Cloud DB: Connected`;
                    dbBadge.className = 'status-pill connected';
                    dbBadge.title = 'Connected to Neon PostgreSQL cloud database';
                } else if (health && health.status === 'Online') {
                    dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> ⚙️ Render Live | DB Not Configured`;
                    dbBadge.className = 'status-pill fallback';
                    dbBadge.title = 'Render backend is online! Please add DATABASE_URL in Render Dashboard -> Environment';
                } else {
                    dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> 📁 Local Demo Mode`;
                    dbBadge.className = 'status-pill fallback';
                }
            }

            // Fetch Stats
            const statsRes = await this.api.getDashboardStats().catch(() => null);
            if (statsRes && statsRes.stats) this.stats = statsRes.stats;

            // Fetch Farmers
            const farmersRes = await this.api.getFarmers().catch(() => null);
            if (farmersRes && farmersRes.farmers) this.farmers = farmersRes.farmers;

            // Fetch Centers
            const centersRes = await this.api.getCenters().catch(() => null);
            if (centersRes && centersRes.centers) this.centers = centersRes.centers;

            // Fetch Queue / Intake
            const queueRes = await this.api.getQueue().catch(() => null);
            if (queueRes && queueRes.queue) this.intakeRecords = queueRes.queue;

            // Fetch Payouts
            const payoutsRes = await this.api.getPayouts().catch(() => null);
            if (payoutsRes && payoutsRes.payouts) this.payouts = payoutsRes.payouts;

            // Fetch MSP
            const mspRes = await this.api.getMspRates().catch(() => null);
            if (mspRes && mspRes.rates) {
                this.mspRates = {};
                mspRes.rates.forEach(r => {
                    this.mspRates[r.crop_name] = { rate: parseFloat(r.msp_per_qtl), maxMoisture: parseFloat(r.max_moisture_pct), category: r.category };
                });
            }
        } catch (err) {
            console.warn('Error loading cloud data, using local state:', err);
        }
    }

    switchTab(tabId) {
        this.navButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId));
        this.tabViews.forEach(view => view.classList.toggle('active', view.id === `view-${tabId}`));
    }

    openModal(modalId) {
        this.populateDropdowns();
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModals() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    }

    populateDropdowns() {
        const farmerSelect = document.getElementById('in-farmer-id');
        const slotFarmerSelect = document.getElementById('slot-farmer-id');
        if (farmerSelect && this.farmers.length > 0) {
            farmerSelect.innerHTML = this.farmers.map(f => `<option value="${f.id}">${f.name} (${f.village} - ${f.farmer_code || f.id})</option>`).join('');
        }
        if (slotFarmerSelect && this.farmers.length > 0) {
            slotFarmerSelect.innerHTML = this.farmers.map(f => `<option value="${f.id}">${f.name} (${f.village} - ${f.farmer_code || f.id})</option>`).join('');
        }

        const centerSelect = document.getElementById('slot-center-id');
        if (centerSelect && this.centers.length > 0) {
            centerSelect.innerHTML = this.centers.map(c => `<option value="${c.id}">${c.name} (${c.district})</option>`).join('');
        }

        const wbTokenSelect = document.getElementById('wb-token-select');
        if (wbTokenSelect) {
            wbTokenSelect.innerHTML = this.intakeRecords.map(rec => `<option value="${rec.id || rec.token}">${rec.token || rec.booking_token} - ${rec.farmerName || rec.farmer_name} (${rec.crop || rec.crop_name})</option>`).join('');
        }
    }

    updatePayoutPreview() {
        const crop = document.getElementById('in-crop-type')?.value;
        const qty = parseFloat(document.getElementById('in-quantity')?.value) || 0;
        const grade = document.getElementById('in-grade')?.value;

        const baseMsp = this.mspRates[crop]?.rate || 2183;
        let finalRate = baseMsp;
        if (grade === "Grade B") finalRate -= 50;
        if (grade === "Below Spec" || grade === "Rejected") finalRate = 0;

        const total = qty * finalRate;
        const elem = document.getElementById('in-payout-preview');
        if (elem) elem.textContent = `₹ ${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }

    setFieldValid(input, errId) {
        if (!input) return;
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        const err = document.getElementById(errId);
        if (err) { err.textContent = ''; err.classList.remove('active'); }
    }

    setFieldError(input, errId, msg) {
        if (!input) return;
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        const err = document.getElementById(errId);
        if (err) { err.textContent = '⚠️ ' + msg; err.classList.add('active'); }
    }

    clearFieldStatus(input, errId) {
        if (!input) return;
        input.classList.remove('is-valid', 'is-invalid');
        const err = document.getElementById(errId);
        if (err) { err.textContent = ''; err.classList.remove('active'); }
    }

    bindFormValidation() {
        // 1. Phone number live formatting & validation
        const phoneInput = document.getElementById('f-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                e.target.value = clean;
                if (clean.length === 10) {
                    if (/^[6-9]/.test(clean)) {
                        this.setFieldValid(phoneInput, 'err-f-phone');
                    } else {
                        this.setFieldError(phoneInput, 'err-f-phone', 'Phone must begin with 6, 7, 8, or 9');
                    }
                } else if (clean.length > 0 && !/^[6-9]/.test(clean)) {
                    this.setFieldError(phoneInput, 'err-f-phone', 'Phone must begin with 6, 7, 8, or 9');
                } else {
                    this.clearFieldStatus(phoneInput, 'err-f-phone');
                }
            });
            phoneInput.addEventListener('blur', (e) => {
                const clean = e.target.value.replace(/\D/g, '');
                if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
                    this.setFieldError(phoneInput, 'err-f-phone', 'Enter valid 10-digit mobile starting with 6-9');
                } else {
                    this.setFieldValid(phoneInput, 'err-f-phone');
                }
            });
        }

        // 2. Aadhaar live formatting (XXXX-XXXX-XXXX) & validation
        const aadhaarInput = document.getElementById('f-aadhaar');
        if (aadhaarInput) {
            aadhaarInput.addEventListener('input', (e) => {
                let digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                let formatted = digits.match(/.{1,4}/g)?.join('-') || digits;
                e.target.value = formatted;
                if (digits.length === 12) {
                    if (/^[2-9]/.test(digits)) {
                        this.setFieldValid(aadhaarInput, 'err-f-aadhaar');
                    } else {
                        this.setFieldError(aadhaarInput, 'err-f-aadhaar', 'Aadhaar cannot start with 0 or 1');
                    }
                } else if (digits.length > 0 && !/^[2-9]/.test(digits)) {
                    this.setFieldError(aadhaarInput, 'err-f-aadhaar', 'Aadhaar cannot start with 0 or 1');
                } else {
                    this.clearFieldStatus(aadhaarInput, 'err-f-aadhaar');
                }
            });
            aadhaarInput.addEventListener('blur', (e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (digits.length !== 12 || !/^[2-9]\d{11}$/.test(digits)) {
                    this.setFieldError(aadhaarInput, 'err-f-aadhaar', 'Enter valid 12-digit Aadhaar number');
                } else {
                    this.setFieldValid(aadhaarInput, 'err-f-aadhaar');
                }
            });
        }

        // 3. IFSC code formatting (Auto-uppercase) & validation
        const ifscInput = document.getElementById('f-ifsc');
        if (ifscInput) {
            ifscInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(e.target.value)) {
                    this.setFieldValid(ifscInput, 'err-f-ifsc');
                } else {
                    this.clearFieldStatus(ifscInput, 'err-f-ifsc');
                }
            });
            ifscInput.addEventListener('blur', (e) => {
                if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(e.target.value)) {
                    this.setFieldError(ifscInput, 'err-f-ifsc', 'Format: ABCD0123456 (4 letters, 0, 6 characters)');
                } else {
                    this.setFieldValid(ifscInput, 'err-f-ifsc');
                }
            });
        }

        // 4. Bank account number formatting & validation
        const bankAccInput = document.getElementById('f-bank-acc');
        if (bankAccInput) {
            bankAccInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 18);
                if (e.target.value.length >= 9 && e.target.value.length <= 18) {
                    this.setFieldValid(bankAccInput, 'err-f-bank-acc');
                } else {
                    this.clearFieldStatus(bankAccInput, 'err-f-bank-acc');
                }
            });
            bankAccInput.addEventListener('blur', (e) => {
                if (e.target.value.length < 9 || e.target.value.length > 18) {
                    this.setFieldError(bankAccInput, 'err-f-bank-acc', 'Account number must be 9 to 18 digits');
                } else {
                    this.setFieldValid(bankAccInput, 'err-f-bank-acc');
                }
            });
        }

        // 5. Full name validation
        const nameInput = document.getElementById('f-name');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                if (val.length >= 3 && /^[a-zA-Z\s.]+$/.test(val)) {
                    this.setFieldValid(nameInput, 'err-f-name');
                } else {
                    this.clearFieldStatus(nameInput, 'err-f-name');
                }
            });
            nameInput.addEventListener('blur', (e) => {
                const val = e.target.value.trim();
                if (val.length < 3 || !/^[a-zA-Z\s.]+$/.test(val)) {
                    this.setFieldError(nameInput, 'err-f-name', 'Name must contain only alphabets (min 3 chars)');
                } else {
                    this.setFieldValid(nameInput, 'err-f-name');
                }
            });
        }

        // 6. Land acres validation
        const landInput = document.getElementById('f-land');
        if (landInput) {
            landInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0 && val <= 500) {
                    this.setFieldValid(landInput, 'err-f-land');
                } else {
                    this.clearFieldStatus(landInput, 'err-f-land');
                }
            });
            landInput.addEventListener('blur', (e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val <= 0 || val > 500) {
                    this.setFieldError(landInput, 'err-f-land', 'Land must be between 0.1 and 500 acres');
                } else {
                    this.setFieldValid(landInput, 'err-f-land');
                }
            });
        }

        // 7. Vehicle inputs auto-uppercase
        ['slot-vehicle', 'in-vehicle'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase();
                });
            }
        });
    }

    calcWeighbridgeNet() {
        const grossInput = document.getElementById('wb-gross-weight');
        const tareInput = document.getElementById('wb-tare-weight');
        const gross = parseFloat(grossInput?.value) || 0;
        const tare = parseFloat(tareInput?.value) || 0;
        const elem = document.getElementById('wb-calculated-net');
        const diffErr = document.getElementById('err-wb-diff');

        if (gross > 0 && tare >= 0) {
            if (gross <= tare) {
                if (diffErr) {
                    diffErr.textContent = '⚠️ Gross Weight must be greater than Tare Weight (Loaded truck must weigh more than empty truck)!';
                    diffErr.classList.add('active');
                }
                grossInput?.classList.add('is-invalid');
                tareInput?.classList.add('is-invalid');
                if (elem) {
                    elem.textContent = '0.00 Quintals (Invalid Weight)';
                    elem.className = 'badge badge-danger';
                }
                return;
            } else {
                if (diffErr) {
                    diffErr.textContent = '';
                    diffErr.classList.remove('active');
                }
                grossInput?.classList.remove('is-invalid');
                grossInput?.classList.add('is-valid');
                tareInput?.classList.remove('is-invalid');
                tareInput?.classList.add('is-valid');
                const netKg = gross - tare;
                const netQtl = (netKg / 100).toFixed(2);
                if (elem) {
                    elem.textContent = `${netQtl} Quintals`;
                    elem.className = 'badge badge-success';
                }
            }
        } else {
            if (diffErr) {
                diffErr.textContent = '';
                diffErr.classList.remove('active');
            }
            if (elem) {
                elem.textContent = '0.00 Quintals';
                elem.className = 'badge badge-success';
            }
        }
    }

    async handleRegisterFarmer(e) {
        e.preventDefault();
        const nameInput = document.getElementById('f-name');
        const phoneInput = document.getElementById('f-phone');
        const aadhaarInput = document.getElementById('f-aadhaar');
        const villageInput = document.getElementById('f-village');
        const landInput = document.getElementById('f-land');
        const bankNameInput = document.getElementById('f-bank-name');
        const bankAccInput = document.getElementById('f-bank-acc');
        const ifscInput = document.getElementById('f-ifsc');

        let isValid = true;
        let firstInvalid = null;

        // 1. Name check
        const nameVal = (nameInput?.value || '').trim();
        if (nameVal.length < 3 || !/^[a-zA-Z\s.]+$/.test(nameVal)) {
            this.setFieldError(nameInput, 'err-f-name', 'Name must contain only alphabets (min 3 characters)');
            isValid = false;
            if (!firstInvalid) firstInvalid = nameInput;
        } else {
            this.setFieldValid(nameInput, 'err-f-name');
        }

        // 2. Phone check (10 digits starting with 6-9)
        const phoneVal = (phoneInput?.value || '').replace(/\D/g, '');
        if (phoneVal.length !== 10 || !/^[6-9]\d{9}$/.test(phoneVal)) {
            this.setFieldError(phoneInput, 'err-f-phone', 'Enter valid 10-digit mobile number starting with 6, 7, 8, or 9');
            isValid = false;
            if (!firstInvalid) firstInvalid = phoneInput;
        } else {
            this.setFieldValid(phoneInput, 'err-f-phone');
        }

        // 3. Aadhaar check (12 digits starting with 2-9)
        const aadhaarDigits = (aadhaarInput?.value || '').replace(/\D/g, '');
        if (aadhaarDigits.length !== 12 || !/^[2-9]\d{11}$/.test(aadhaarDigits)) {
            this.setFieldError(aadhaarInput, 'err-f-aadhaar', 'Enter valid 12-digit Aadhaar number (cannot start with 0 or 1)');
            isValid = false;
            if (!firstInvalid) firstInvalid = aadhaarInput;
        } else {
            this.setFieldValid(aadhaarInput, 'err-f-aadhaar');
        }

        // 4. Village check
        const villageVal = (villageInput?.value || '').trim();
        if (villageVal.length < 2) {
            this.setFieldError(villageInput, 'err-f-village', 'Village name is required');
            isValid = false;
            if (!firstInvalid) firstInvalid = villageInput;
        } else {
            this.setFieldValid(villageInput, 'err-f-village');
        }

        // 5. Land acres check
        const landVal = parseFloat(landInput?.value);
        if (isNaN(landVal) || landVal <= 0 || landVal > 500) {
            this.setFieldError(landInput, 'err-f-land', 'Land acres must be between 0.1 and 500');
            isValid = false;
            if (!firstInvalid) firstInvalid = landInput;
        } else {
            this.setFieldValid(landInput, 'err-f-land');
        }

        // 6. Bank name check
        const bankNameVal = (bankNameInput?.value || '').trim();
        if (bankNameVal.length < 3) {
            this.setFieldError(bankNameInput, 'err-f-bank-name', 'Bank name is required');
            isValid = false;
            if (!firstInvalid) firstInvalid = bankNameInput;
        } else {
            this.setFieldValid(bankNameInput, 'err-f-bank-name');
        }

        // 7. Bank account number check
        const bankAccVal = (bankAccInput?.value || '').replace(/\D/g, '');
        if (bankAccVal.length < 9 || bankAccVal.length > 18) {
            this.setFieldError(bankAccInput, 'err-f-bank-acc', 'Account number must be 9 to 18 digits');
            isValid = false;
            if (!firstInvalid) firstInvalid = bankAccInput;
        } else {
            this.setFieldValid(bankAccInput, 'err-f-bank-acc');
        }

        // 8. IFSC check
        const ifscVal = (ifscInput?.value || '').trim().toUpperCase();
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscVal)) {
            this.setFieldError(ifscInput, 'err-f-ifsc', 'Invalid IFSC code format (e.g. SBIN0001234)');
            isValid = false;
            if (!firstInvalid) firstInvalid = ifscInput;
        } else {
            this.setFieldValid(ifscInput, 'err-f-ifsc');
        }

        if (!isValid) {
            showToast('Please fix the highlighted errors before saving', 'error');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        const formattedAadhaar = aadhaarDigits.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
        const farmerData = {
            name: nameVal,
            phone: phoneVal,
            aadhaar: formattedAadhaar,
            village: villageVal,
            landAcres: landVal,
            bankName: bankNameVal,
            bankAcc: bankAccVal,
            ifsc: ifscVal
        };

        const submitBtn = document.getElementById('btn-submit-farmer');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving to Neon DB...';
        }

        try {
            const res = await this.api.registerFarmer(farmerData);
            showToast(`Farmer ${farmerData.name} registered successfully! Code: ${res.farmer?.farmer_code || 'F-OK'}`);
            this.closeModals();
            await this.loadAllData();
            this.renderAll();
        } catch (err) {
            showToast(err.message || 'Registration failed', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Farmer to Neon DB';
            }
        }
    }

    async handleBookSlot(e) {
        e.preventDefault();
        const farmerSelect = document.getElementById('slot-farmer-id');
        const centerSelect = document.getElementById('slot-center-id');
        const cropSelect = document.getElementById('slot-crop-name');
        const qtyInput = document.getElementById('slot-quantity');
        const vehicleInput = document.getElementById('slot-vehicle');

        let isValid = true;
        let firstInvalid = null;

        if (!farmerSelect?.value) {
            this.setFieldError(farmerSelect, 'err-slot-farmer', 'Please select a registered farmer');
            isValid = false;
            if (!firstInvalid) firstInvalid = farmerSelect;
        } else {
            this.setFieldValid(farmerSelect, 'err-slot-farmer');
        }

        if (!centerSelect?.value) {
            this.setFieldError(centerSelect, 'err-slot-center', 'Please select a Mandi center');
            isValid = false;
            if (!firstInvalid) firstInvalid = centerSelect;
        } else {
            this.setFieldValid(centerSelect, 'err-slot-center');
        }

        const qtyVal = parseFloat(qtyInput?.value);
        if (isNaN(qtyVal) || qtyVal <= 0 || qtyVal > 10000) {
            this.setFieldError(qtyInput, 'err-slot-quantity', 'Quantity must be between 0.1 and 10,000 Quintals');
            isValid = false;
            if (!firstInvalid) firstInvalid = qtyInput;
        } else {
            this.setFieldValid(qtyInput, 'err-slot-quantity');
        }

        if (!isValid) {
            showToast('Please fix the highlighted booking fields', 'error');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        const bookingData = {
            farmerId: farmerSelect.value,
            centerId: centerSelect.value,
            cropName: cropSelect.value,
            estimatedQtl: qtyVal,
            vehicleNo: (vehicleInput?.value || 'UP 32 AB 1234').trim().toUpperCase()
        };

        try {
            const res = await this.api.bookSlot(bookingData);
            showToast(`Slot Booked Successfully! Token ID: ${res.bookingToken}`, 'success');
            this.closeModals();
            await this.loadAllData();
            this.renderAll();
            this.switchTab('queue');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async handleNewIntake(e) {
        e.preventDefault();
        const farmerSelect = document.getElementById('in-farmer-id');
        const cropSelect = document.getElementById('in-crop-type');
        const qtyInput = document.getElementById('in-quantity');
        const vehicleInput = document.getElementById('in-vehicle');

        let isValid = true;
        let firstInvalid = null;

        if (!farmerSelect?.value) {
            this.setFieldError(farmerSelect, 'err-in-farmer', 'Please select a registered farmer');
            isValid = false;
            if (!firstInvalid) firstInvalid = farmerSelect;
        } else {
            this.setFieldValid(farmerSelect, 'err-in-farmer');
        }

        const qtyVal = parseFloat(qtyInput?.value);
        if (isNaN(qtyVal) || qtyVal <= 0 || qtyVal > 10000) {
            this.setFieldError(qtyInput, 'err-in-quantity', 'Quantity must be between 0.1 and 10,000 Quintals');
            isValid = false;
            if (!firstInvalid) firstInvalid = qtyInput;
        } else {
            this.setFieldValid(qtyInput, 'err-in-quantity');
        }

        if (!isValid) {
            showToast('Please fix the intake form errors', 'error');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        try {
            const res = await this.api.bookSlot({
                farmerId: farmerSelect.value,
                centerId: 1,
                cropName: cropSelect.value,
                estimatedQtl: qtyVal,
                vehicleNo: (vehicleInput?.value || "UP 32 AB 1001").trim().toUpperCase()
            });
            showToast(`Procurement token ${res.bookingToken} created successfully!`);
            this.closeModals();
            await this.loadAllData();
            this.renderAll();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async handleWeighbridgeSubmit(e) {
        e.preventDefault();
        const tokenSelect = document.getElementById('wb-token-select');
        const grossInput = document.getElementById('wb-gross-weight');
        const tareInput = document.getElementById('wb-tare-weight');
        const moistureInput = document.getElementById('wb-moisture');
        const impurityInput = document.getElementById('wb-impurity');

        let isValid = true;

        if (!tokenSelect?.value) {
            this.setFieldError(tokenSelect, 'err-wb-token', 'Please select a token in queue');
            isValid = false;
        } else {
            this.setFieldValid(tokenSelect, 'err-wb-token');
        }

        const grossKg = parseFloat(grossInput?.value);
        if (isNaN(grossKg) || grossKg <= 0) {
            this.setFieldError(grossInput, 'err-wb-gross', 'Gross weight must be greater than 0 kg');
            isValid = false;
        } else {
            this.setFieldValid(grossInput, 'err-wb-gross');
        }

        const tareKg = parseFloat(tareInput?.value);
        if (isNaN(tareKg) || tareKg < 0) {
            this.setFieldError(tareInput, 'err-wb-tare', 'Tare weight cannot be negative');
            isValid = false;
        } else {
            this.setFieldValid(tareInput, 'err-wb-tare');
        }

        if (grossKg > 0 && tareKg >= 0 && grossKg <= tareKg) {
            const diffErr = document.getElementById('err-wb-diff');
            if (diffErr) {
                diffErr.textContent = '⚠️ Gross Weight must be strictly greater than Tare Weight!';
                diffErr.classList.add('active');
            }
            this.setFieldError(grossInput, 'err-wb-gross', 'Must be greater than tare weight');
            isValid = false;
        }

        const moisturePct = parseFloat(moistureInput?.value || 13.5);
        if (isNaN(moisturePct) || moisturePct < 0 || moisturePct > 50) {
            this.setFieldError(moistureInput, 'err-wb-moisture', 'Moisture must be between 0% and 50%');
            isValid = false;
        } else {
            this.setFieldValid(moistureInput, 'err-wb-moisture');
        }

        const impurityPct = parseFloat(impurityInput?.value || 1.0);
        if (isNaN(impurityPct) || impurityPct < 0 || impurityPct > 30) {
            this.setFieldError(impurityInput, 'err-wb-impurity', 'Impurity must be between 0% and 30%');
            isValid = false;
        } else {
            this.setFieldValid(impurityInput, 'err-wb-impurity');
        }

        if (!isValid) {
            showToast('Please fix the weighbridge errors before submitting', 'error');
            return;
        }

        try {
            const res = await this.api.submitInspection({
                bookingId: tokenSelect.value,
                grossKg,
                tareKg,
                moisturePct,
                impurityPct,
                inspectorName: 'Chief Mandi Inspector'
            });
            showToast(`Quality & Net Weight (${res.inspection?.net_weight_qtl} Qtl) verified and saved to Neon DB!`);
            await this.loadAllData();
            this.renderAll();
            this.switchTab('payments');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async handleDisbursePayment(payoutId) {
        if (!confirm('Approve and process Direct Benefit Transfer (DBT) payment to farmer bank account?')) return;
        try {
            const res = await this.api.disbursePayout(payoutId);
            showToast(`DBT Payment of ₹${parseFloat(res.payout?.total_amount).toLocaleString()} disbursed successfully!`, 'success');
            await this.loadAllData();
            this.renderAll();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    renderAll() {
        this.renderStats();
        this.renderFarmers();
        this.renderQueue();
        this.renderPayouts();
    }

    renderStats() {
        if (document.getElementById('stat-farmer-count')) document.getElementById('stat-farmer-count').textContent = this.stats.totalFarmers;
        if (document.getElementById('stat-total-volume')) document.getElementById('stat-total-volume').textContent = `${this.stats.totalProcurementQtl} Qtl`;
        if (document.getElementById('stat-total-payout')) document.getElementById('stat-total-payout').textContent = `₹ ${parseFloat(this.stats.totalDisbursedPayouts).toLocaleString('en-IN')}`;
        if (document.getElementById('stat-pending-payout')) document.getElementById('stat-pending-payout').textContent = `₹ ${parseFloat(this.stats.totalPendingPayouts).toLocaleString('en-IN')}`;
    }

    renderFarmers() {
        const tbody = document.getElementById('table-farmers-body');
        if (!tbody) return;

        const query = document.getElementById('farmer-search-input')?.value.toLowerCase() || '';
        const filtered = this.farmers.filter(f => 
            f.name.toLowerCase().includes(query) || 
            f.village.toLowerCase().includes(query) || 
            (f.farmer_code && f.farmer_code.toLowerCase().includes(query)) ||
            (f.phone && f.phone.includes(query))
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No registered farmer records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(f => `
            <tr>
                <td><strong>${f.farmer_code || f.id}</strong></td>
                <td>${f.name}</td>
                <td>${f.phone}</td>
                <td>${f.village}</td>
                <td>${f.land_acres || f.landAcres || 1.0} Acres</td>
                <td>${f.bank_name || f.bankName} (${(f.bank_acc || f.bankAcc || '').slice(-4)})</td>
                <td><span class="badge badge-success">${f.status || 'Verified'}</span></td>
            </tr>
        `).join('');
    }

    renderQueue() {
        const tbody = document.getElementById('table-intake-body');
        const dashboardTbody = document.getElementById('dashboard-intake-body');
        if (!tbody && !dashboardTbody) return;

        const rowsHtml = this.intakeRecords.map(rec => {
            const token = rec.token || rec.booking_token;
            const farmerName = rec.farmerName || rec.farmer_name;
            const crop = rec.crop || rec.crop_name;
            const qty = rec.quantityQtl || rec.estimated_qtl;
            const status = rec.status || 'Booked';
            const payout = rec.totalPayout || rec.total_amount || 0;
            const statusBadge = status === 'Completed' ? 'badge-success' : status === 'Inspected' ? 'badge-info' : 'badge-warning';

            return `
                <tr>
                    <td><strong>${token}</strong></td>
                    <td>${farmerName}</td>
                    <td>${crop}</td>
                    <td>${qty} Qtl</td>
                    <td><span class="badge ${statusBadge}">${status}</span></td>
                    <td>₹ ${parseFloat(payout).toLocaleString('en-IN')}</td>
                    <td>
                        <button class="btn btn-xs btn-secondary" onclick="app.showVoucher('${token}')">Receipt</button>
                    </td>
                </tr>
            `;
        }).join('');

        if (tbody) tbody.innerHTML = rowsHtml || `<tr><td colspan="7" class="text-center py-4">No active tokens in queue.</td></tr>`;
        if (dashboardTbody) dashboardTbody.innerHTML = rowsHtml || `<tr><td colspan="7" class="text-center py-4">No recent procurement entries.</td></tr>`;
    }

    renderPayouts() {
        const tbody = document.getElementById('table-payments-body');
        if (!tbody) return;

        if (this.payouts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No DBT payouts generated yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.payouts.map(p => {
            const status = p.paymentStatus || p.payment_status;
            const isDisbursed = status === 'Disbursed';
            const badgeClass = isDisbursed ? 'badge-success' : status === 'Approved' ? 'badge-info' : 'badge-warning';

            return `
                <tr>
                    <td><strong>${p.txnRef || p.transaction_ref}</strong></td>
                    <td>${p.farmerName || p.farmer_name}</td>
                    <td>${p.crop} (${p.netQtl || p.net_quantity_qtl} Qtl)</td>
                    <td>${p.bankName || p.bank_name} (${(p.bankAcc || p.bank_acc || '').slice(-4)})</td>
                    <td><strong>₹ ${parseFloat(p.totalPayout || p.total_amount).toLocaleString('en-IN')}</strong></td>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
                    <td>
                        ${isDisbursed ? '<span class="text-success">Paid ✓</span>' : `<button class="btn btn-sm btn-success" onclick="app.handleDisbursePayment(${p.id})">Disburse DBT</button>`}
                    </td>
                </tr>
            `;
        }).join('');
    }

    showVoucher(token) {
        const rec = this.intakeRecords.find(i => (i.token || i.booking_token) === token);
        if (!rec) return;

        const printArea = document.getElementById('voucher-print-area');
        if (printArea) {
            printArea.innerHTML = `
                <div class="voucher-container" style="border: 2px solid #10B981; padding: 25px; border-radius: 12px; font-family: 'Inter', sans-serif;">
                    <div style="text-align: center; border-bottom: 2px dashed #E5E7EB; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="color: #065F46; margin: 0;">🌾 AGRI-PROCURE MANDI SAMITI</h2>
                        <p style="color: #4B5563; margin: 5px 0;">Govt. Minimum Support Price (MSP) Receipt Voucher</p>
                        <strong style="background: #D1FAE5; color: #065F46; padding: 4px 12px; border-radius: 20px;">TOKEN: ${token}</strong>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #6B7280;">Farmer Name:</td><td><strong>${rec.farmerName || rec.farmer_name}</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Crop Commodity:</td><td><strong>${rec.crop || rec.crop_name}</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Quantity Intake:</td><td><strong>${rec.quantityQtl || rec.estimated_qtl} Quintals</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Assigned Status:</td><td><strong style="color: #10B981;">${rec.status || 'Verified'}</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Calculated Payout:</td><td><strong style="font-size: 18px; color: #059669;">₹ ${parseFloat(rec.totalPayout || rec.total_amount || 0).toLocaleString('en-IN')}</strong></td></tr>
                    </table>

                    <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 12px; color: #9CA3AF;">
                        <span>Generated via Neon PostgreSQL Cloud DB</span>
                        <span>Authorized Officer Sign</span>
                    </div>
                </div>
            `;
            this.openModal('modal-voucher');
        }
    }

    handleGlobalSearch(query) {
        if (!query) return;
        this.switchTab('farmers');
        const input = document.getElementById('farmer-search-input');
        if (input) {
            input.value = query;
            this.renderFarmers();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new AgriProcureApp();
});

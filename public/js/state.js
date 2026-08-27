// ============================================================
// MotoTrack — Global application state
// Loaded first; every other module reads/writes these bindings.
// ============================================================

// Must match config/shop.php password_min_length
const PASSWORD_MIN_LENGTH = 8;

// Must match config/shop.php warranty_months
const WARRANTY_MONTHS = 6;

// Session
let currentUser = null;
let currentRole = null;
let authToken = localStorage.getItem('mt_token') || null;

// Kanban workflow stages, in order
const STAGES = ['Intake', 'Disassembly', 'Tuning', 'QA', 'Release'];

// The most common motorcycle brands in the Philippines. Drives both the
// intake form's brand dropdown and the admin brand chart's grouping —
// anything not in this list falls under "Others".
const MOTO_BRANDS = ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Rusi'];

// Must match config/shop.php engine_classes (price + label).
const ENGINE_CLASSES = [
    { price: 1200, label: '110-125cc Scooter/Underbone' },
    { price: 1500, label: '150-160cc Scooter/Underbone' },
    { price: 2500, label: 'Inverted Shock Scooter' },
    { price: 2800, label: '150-200cc Backbone e.g., R15, MT15' },
    { price: 4500, label: '320-450cc Backbone e.g., Ninja 400' },
    { price: 6500, label: '500-1000cc Big Bike e.g., Ninja 650' },
];

// The suspension setup recorded per unit at Tuning. These must match
// config/shop.php, which is what the API validates against.
const OIL_VISCOSITIES = ['5W', '10W', '15W', '20W', '30W'];
const SUSPENSION_TYPES = ['Telescopic Fork', 'Inverted (USD) Fork', 'Mono-shock', 'Twin-shock'];

// Suggestions only — the brand is stored as typed, so anything not listed
// here can still be entered under "Others".
const SUSPENSION_BRANDS = ['Stock / OEM', 'YSS', 'Ohlins', 'RCB', 'KYB', 'Showa'];

// Data caches, refreshed from the API before each view render
let dbUsers = [];
let dbJobs = [];
let dbReleased = [];
let dbInv = [];
let dbExpenses = [];
let dbResets = [];
let dbMechanics = [];
let dbCounterSales = [];

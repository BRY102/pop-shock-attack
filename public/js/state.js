// ============================================================
// MotoTrack — Global application state
// Loaded first; every other module reads/writes these bindings.
// ============================================================

// Session
let currentUser = null;
let currentRole = null;
let authToken = localStorage.getItem('mt_token') || null;

// Kanban workflow stages, in order
const STAGES = ['Intake', 'Disassembly', 'Tuning', 'QA', 'Release'];

// Mechanics available for assignment
const MECHANICS = ['John Hendrix', 'Vince Sael', 'Dhax Allen', 'Jan Cairo'];

// The most common motorcycle brands in the Philippines. Drives both the
// intake form's brand dropdown and the admin brand chart's grouping —
// anything not in this list falls under "Others".
const MOTO_BRANDS = ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Rusi'];

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
let dbInv = [];
let dbExpenses = [];

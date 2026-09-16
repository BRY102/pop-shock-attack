// ============================================================
// MotoTrack — Back-jobs shared state
// Split from backjobs.js. Behavior unchanged.
// ============================================================

// var (not let) so the other backjobs-*.js files can share these.
var backjobRows = [];
var backjobSearch = '';
var backjobMechanic = '';
var backjobStatus = 'all';
var backjobTab = 'claims';
var backjobOpenId = null;
var backjobSort = 'newest';
var backjobFilterOpen = false;
var backjobSortOpen = false;

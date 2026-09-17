// ============================================================
// MotoTrack — Bootstrap
// Restores a saved session on page load (loaded last).
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    // Fill the intake form's brand dropdown from the shared brand list,
    // so the form and the admin brand chart always agree.
    const brandSelect = document.getElementById('in_brand');
    if (brandSelect) {
        MOTO_BRANDS.forEach(b => brandSelect.add(new Option(b, b)));
        brandSelect.add(new Option('Others (type it below)', 'Others'));
        window.buildIntakeBrandMenu?.();
        window.syncIntakeBrandMark?.();
    }

    // Fill the tuning form's suspension dropdowns from the shared lists, so the
    // form offers exactly what config/shop.php lets the API accept.
    const suspTypeSelect = document.getElementById('spec_susp_type');
    if (suspTypeSelect) {
        SUSPENSION_TYPES.forEach(t => suspTypeSelect.add(new Option(t, t)));
    }

    const suspBrandSelect = document.getElementById('spec_susp_brand');
    if (suspBrandSelect) {
        SUSPENSION_BRANDS.forEach(b => suspBrandSelect.add(new Option(b, b)));
        suspBrandSelect.add(new Option('Others (type it below)', 'Others'));
    }

    const engineSelect = document.getElementById('spec_engine');
    if (engineSelect) {
        ENGINE_CLASSES.forEach(c => {
            engineSelect.add(new Option(`${c.label} (Base: ₱${Number(c.price).toLocaleString()})`, String(c.price)));
        });
    }

    const viscositySelect = document.getElementById('spec_oil_viscosity');
    if (viscositySelect) {
        OIL_VISCOSITIES.forEach(v => viscositySelect.add(new Option(v, v)));
    }

    const savedUser = localStorage.getItem('mt_session_user');
    const savedRole = localStorage.getItem('mt_session_role');

    // Only auto-login when we still hold a token; if it has been revoked,
    // the first API call returns 401 and apiFetch() sends us back to login.
    if (savedUser && savedRole && authToken) {
        showLoginLoader();
        apiFetch('/api/me')
            .then(async (response) => {
                if (response.ok) {
                    const data = await response.json();
                    const username = data.user?.username || savedUser;
                    const role = data.user?.role || savedRole;
                    await loginSuccess(username, role);
                    return;
                }
                await loginSuccess(savedUser, savedRole);
            })
            .catch(() => loginSuccess(savedUser, savedRole))
            .finally(hideLoginLoader);
    }
});

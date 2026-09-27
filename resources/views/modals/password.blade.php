<div class="modal modal-backdrop hidden" id="modal-change-password" onclick="if(event.target===this)closeModal('modal-change-password')">
    <div class="password-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <div class="modal-title">
                <div class="modal-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <div>
                    <h2>Change Password</h2>
                    <p>Keep your account secure by using a strong password.</p>
                </div>
            </div>
            <button type="button" class="close-button" onclick="closeModal('modal-change-password')" aria-label="Close modal">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18M6 6l12 12"></path>
                </svg>
            </button>
        </div>

        <form onsubmit="submitChangePassword(event)">
            <!-- Current Password -->
            <label class="field-label" for="cp_current">
                <span>CURRENT PASSWORD <b>*</b></span>
                <div class="password-input">
                    <svg class="pass-lead-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input type="password" id="cp_current" required autocomplete="current-password" placeholder="Enter your current password">
                    <button type="button" class="pass-toggle-btn" onclick="togglePasswordVisibility('cp_current', this)" aria-label="Toggle password visibility">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            </label>

            <!-- New Password -->
            <label class="field-label" for="cp_new">
                <span>NEW PASSWORD <b>*</b></span>
                <div class="password-input">
                    <svg class="pass-lead-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input type="password" id="cp_new" required minlength="8" autocomplete="new-password" placeholder="Minimum 8 characters" oninput="checkCpPasswordStrength(this.value)">
                    <button type="button" class="pass-toggle-btn" onclick="togglePasswordVisibility('cp_new', this)" aria-label="Toggle password visibility">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            </label>

            <!-- Password Strength Bar -->
            <div class="strength" id="cp_strength">
                <span class="strength-bar"></span>
                <span class="strength-bar"></span>
                <span class="strength-bar"></span>
                <span class="strength-bar"></span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                </svg>
                <small id="cp_strength_label">Password strength</small>
            </div>

            <!-- Confirm New Password -->
            <label class="field-label" for="cp_confirm">
                <span>CONFIRM NEW PASSWORD <b>*</b></span>
                <div class="password-input">
                    <svg class="pass-lead-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input type="password" id="cp_confirm" required minlength="8" autocomplete="new-password" placeholder="Retype your new password">
                    <button type="button" class="pass-toggle-btn" onclick="togglePasswordVisibility('cp_confirm', this)" aria-label="Toggle password visibility">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            </label>

            <!-- Save Password Button -->
            <button type="submit" class="save-button" id="cp_save_btn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Save Password</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m9 18 6-6-6-6"></path>
                </svg>
            </button>
        </form>
    </div>
</div>
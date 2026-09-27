<div class="modal hidden" id="modal-reset-password">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Set New Password</h2>
            <button class="modal-close" onclick="closeModal('modal-reset-password')">&times;</button>
        </div>
        <form onsubmit="submitPasswordReset(event)">
            <input type="hidden" id="reset_request_id">
            <p style="margin-bottom: 1.25rem; color: #555; font-size: 0.95rem;">
                Tell this rider the new password in person. Their old login sessions will stop working.
            </p>
            <div class="input-group">
                <label>Username</label>
                <input type="text" id="reset_username" readonly>
            </div>
            <div class="input-group">
                <label>New Password</label>
                <input type="password" id="reset_password" required minlength="8"
                    placeholder="Minimum 8 characters">
            </div>
            <div class="input-group">
                <label>Confirm Password</label>
                <input type="password" id="reset_password_confirm" required minlength="8"
                    placeholder="Retype password">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Save New Password</button>
        </form>
    </div>
</div>
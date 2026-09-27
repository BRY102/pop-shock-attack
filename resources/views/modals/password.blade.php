<div class="modal hidden" id="modal-change-password">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Change Password</h2>
            <button class="modal-close" onclick="closeModal('modal-change-password')">&times;</button>
        </div>
        <form onsubmit="submitChangePassword(event)">
            <div class="input-group">
                <label for="cp_current">Current password</label>
                <input type="password" id="cp_current" required autocomplete="current-password">
            </div>
            <div class="input-group">
                <label for="cp_new">New password</label>
                <input type="password" id="cp_new" required minlength="8" autocomplete="new-password"
                    placeholder="Minimum 8 characters">
            </div>
            <div class="input-group">
                <label for="cp_confirm">Confirm new password</label>
                <input type="password" id="cp_confirm" required minlength="8" autocomplete="new-password"
                    placeholder="Retype password">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Save password</button>
        </form>
    </div>
</div>

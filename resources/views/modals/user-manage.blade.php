<div class="modal hidden app-sheet-modal" id="modal-manage-user">
    <div class="modal-content user-edit-sheet">
        <div class="user-edit-head">
            <div class="user-edit-title">
                <span class="user-edit-avatar" aria-hidden="true" data-icon="user"></span>
                <div>
                    <h2 id="userModalTitle">Edit User</h2>
                    <p id="userModalSub">Update this account's details.</p>
                </div>
            </div>
            <button type="button" class="user-edit-close" onclick="closeModal('modal-manage-user')" aria-label="Close">
                <span data-icon="x"></span>
            </button>
        </div>
        <form onsubmit="submitUserForm(event)">
            <input type="hidden" id="edit_user_mode" value="add">
            <input type="hidden" id="edit_user_id">

            <div class="user-edit-fields">
                <label class="user-edit-field">
                    <span class="user-edit-label">
                        <span data-icon="user"></span>
                        Username <em>*</em>
                    </span>
                    <span class="user-edit-shell">
                        <span class="user-edit-ico" data-icon="user"></span>
                        <input type="text" id="m_username" required autocomplete="off" placeholder="Username">
                    </span>
                </label>

                <label class="user-edit-field">
                    <span class="user-edit-label">
                        <span data-icon="lock"></span>
                        Password <em id="userPasswordRequired">*</em>
                    </span>
                    <span class="user-edit-shell">
                        <span class="user-edit-ico" data-icon="lock"></span>
                        <input type="password" id="m_password" required minlength="8"
                            placeholder="Minimum 8 characters" autocomplete="new-password">
                        <button type="button" class="user-edit-pass-toggle" id="userPassToggle"
                            onclick="toggleUserPassword()" aria-label="Show password">
                            <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path
                                    d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0">
                                </path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path
                                    d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49">
                                </path>
                                <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path>
                                <path
                                    d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143">
                                </path>
                                <path d="m2 2 20 20"></path>
                            </svg>
                        </button>
                    </span>
                    <small class="user-edit-hint">
                        <span data-icon="info"></span>
                        <span id="userPasswordHint">Minimum 8 characters.</span>
                    </small>
                </label>

                <div class="user-edit-field">
                    <span class="user-edit-label">
                        <span data-icon="shield-check"></span>
                        System Role <em>*</em>
                    </span>
                    <div class="user-edit-dropdown">
                        <select id="m_role" class="user-edit-role-native" required tabindex="-1" aria-hidden="true">
                            <option value="customer">Customer</option>
                            <option value="staff">Staff / Technician</option>
                            <option value="admin">Admin / Owner</option>
                        </select>
                        <button type="button" class="user-edit-shell user-edit-select" id="m_role_btn"
                            aria-haspopup="listbox" aria-expanded="false" aria-controls="m_role_menu"
                            onclick="toggleUserRoleMenu(event)">
                            <span class="user-edit-ico" data-icon="users"></span>
                            <span class="user-edit-role-text" id="m_role_label">Customer</span>
                            <span class="user-edit-caret" data-icon="chevron-down"></span>
                        </button>
                        <div class="user-edit-role-menu hidden" id="m_role_menu" role="listbox">
                            <button type="button" role="option" class="user-edit-role-option" data-value="customer"
                                onclick="pickUserRole(event)">Customer</button>
                            <button type="button" role="option" class="user-edit-role-option" data-value="staff"
                                onclick="pickUserRole(event)">Staff / Technician</button>
                            <button type="button" role="option" class="user-edit-role-option" data-value="admin"
                                onclick="pickUserRole(event)">Admin / Owner</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="user-edit-actions">
                <button type="button" class="user-edit-cancel" onclick="closeModal('modal-manage-user')">Cancel</button>
                <button type="submit" class="user-edit-save">
                    <span data-icon="save"></span>
                    <span id="userEditSaveLabel">Save Changes</span>
                </button>
            </div>
        </form>
    </div>
</div>
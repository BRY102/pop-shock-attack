<div class="top-header">
    <div class="header-start">
        <button type="button" class="menu-toggle" id="menuToggle" onclick="toggleNavMenu(event)"
            aria-label="Collapse menu" aria-expanded="true" aria-controls="appSidebar">
            <svg class="menu-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 5h16" />
                <path d="M4 12h16" />
                <path d="M4 19h16" />
            </svg>
            <svg class="menu-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
            </svg>
        </button>
        <div class="app-head-brand" aria-hidden="true">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18.5" cy="17.5" r="3.5" />
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="15" cy="5" r="1" />
                <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
            </svg>
            <span>MOTO<b>TRACK</b></span>
        </div>
        <div class="page-title-block">
            <h2 id="pageTitle" style="color: var(--text-primary);">Dashboard</h2>
            <p id="pageDesc" style="color: #777; font-size: 0.9rem;">Overview</p>
        </div>
    </div>
    <div id="headerActions" class="header-actions"></div>
    <div class="header-tools">
        <div class="feedback-wrap hidden" id="feedbackWrap">
            <button type="button" class="notif-bell" id="feedbackBell" onclick="toggleFeedbackDrawer()"
                aria-label="Customer feedback" aria-expanded="false" aria-controls="feedbackDrawer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
            </button>
        </div>
        <div class="notif-wrap" id="notifWrap">
            <button type="button" class="notif-bell" id="notifBell" onclick="toggleNotifPanel()"
                aria-label="Notifications" aria-expanded="false" aria-controls="notifPanel">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                    <path
                        d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.737 7.326" />
                </svg>
                <span id="notifBadge" class="notif-badge hidden">0</span>
            </button>
            <div id="notifPanel" class="notif-panel hidden" role="region" aria-label="Notifications"></div>
        </div>
        <div class="profile-wrap" id="profileWrap">
            <button type="button" class="profile-btn" id="profileBtn" onclick="toggleProfileMenu(event)"
                aria-label="Account menu" aria-expanded="false" aria-haspopup="true"
                aria-controls="profileMenu">
                <span class="profile-ava" id="profileAva" aria-hidden="true">?</span>
                <span class="profile-name" id="profileName"></span>
                <svg class="profile-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            <div id="profileMenu" class="profile-menu hidden" role="menu" aria-label="Account">
                <button type="button" class="profile-item" role="menuitem" onclick="openChangePassword()">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Change Password
                </button>
                <button type="button" class="profile-item" role="menuitem" onclick="openActivityLog()">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Activity Log
                </button>
                <div class="profile-sep" role="separator"></div>
                <button type="button" class="profile-item is-danger" role="menuitem"
                    onclick="closeProfileMenu(); logout()">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" x2="9" y1="12" y2="12"></line>
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    </div>
</div>
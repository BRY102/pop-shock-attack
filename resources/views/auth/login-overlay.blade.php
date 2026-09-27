<div id="view-login" class="view-section active-view">
    <div class="login-overlay">

        <!-- ===== LEFT PANEL ===== -->
        <div class="login-panel-left">
            <!-- Logos at top-left -->
            <div class="login-left-top">
                <div class="login-logos">
                    <img src="img/logo-ae.png" alt="AE Logo" class="logo-ae" />
                    <img src="img/logo-psa.png" alt="Pops Shock Attack" class="logo-psa" />
                </div>
            </div>

            <!-- Hero text center -->
            <div class="login-tagline">
                <span class="login-hero-tag">Workshop Management System</span>
                <h2>KEEP YOUR RIDE<br><span>ON THE ROAD</span></h2>
                <p>Complete suspension service tracking — from intake to release.</p>
            </div>

            <!-- 3 feature items at bottom -->
            <div class="login-features">
                <div class="login-feature-item">
                    <div class="login-feature-ico">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div class="login-feature-copy">
                        <strong>Better Organization</strong>
                        <p>Keep your operations well organized.</p>
                    </div>
                </div>
                <div class="login-feature-item">
                    <div class="login-feature-ico">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                        </svg>
                    </div>
                    <div class="login-feature-copy">
                        <strong>Higher Productivity</strong>
                        <p>Manage jobs and staff with ease.</p>
                    </div>
                </div>
                <div class="login-feature-item">
                    <div class="login-feature-ico">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                            <polyline points="16 7 22 7 22 13" />
                        </svg>
                    </div>
                    <div class="login-feature-copy">
                        <strong>Greater Efficiency</strong>
                        <p>Track performance and grow your business.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ===== RIGHT PANEL ===== -->
        <div class="login-card-centered">

            <!-- Brand: inline logo + wordmark -->
            <div class="brand-header">
                <div class="logo-icon">
                    <!-- Font Awesome Free 6 "motorcycle" — CC BY 4.0, fontawesome.com -->
                    <svg viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
                        <path
                            d="M280 32c-13.3 0-24 10.7-24 24s10.7 24 24 24l57.7 0 16.4 30.3L256 192l-45.3-45.3c-12-12-28.3-18.7-45.3-18.7L64 128c-17.7 0-32 14.3-32 32l0 32 96 0c88.4 0 160 71.6 160 160c0 11-1.1 21.7-3.2 32l70.4 0c-2.1-10.3-3.2-21-3.2-32c0-52.2 25-98.6 63.7-127.8l15.4 28.6C402.4 276.3 384 312 384 352c0 70.7 57.3 128 128 128s128-57.3 128-128s-57.3-128-128-128c-13.5 0-26.5 2.1-38.7 6L418.2 128l61.8 0c17.7 0 32-14.3 32-32l0-32c0-17.7-14.3-32-32-32l-20.4 0c-7.5 0-14.7 2.6-20.5 7.4L391.7 78.9l-14-26c-7-12.9-20.5-21-35.2-21L280 32zM462.7 311.2l28.2 52.2c6.3 11.7 20.9 16 32.5 9.7s16-20.9 9.7-32.5l-28.2-52.2c2.3-.3 4.7-.4 7.1-.4c35.3 0 64 28.7 64 64s-28.7 64-64 64s-64-28.7-64-64c0-15.5 5.5-29.7 14.7-40.8zM187.3 376c-9.5 23.5-32.5 40-59.3 40c-35.3 0-64-28.7-64-64s28.7-64 64-64c26.9 0 49.9 16.5 59.3 40l66.4 0C242.5 268.8 190.5 224 128 224C57.3 224 0 281.3 0 352s57.3 128 128 128c62.5 0 114.5-44.8 125.8-104l-66.4 0zM128 384a32 32 0 1 0 0-64 32 32 0 1 0 0 64z" />
                    </svg>
                </div>
                <h1>MotoTrack</h1>
            </div>

            <!-- Login form -->
            <form id="mainLoginForm" class="login-form" onsubmit="handleUnifiedLogin(event)">
                <div class="login-welcome">
                    <h2>Welcome Back!</h2>
                    <p>Sign in to your account to continue managing your workshop.</p>
                </div>
                <div class="input-group">
                    <label for="loginUser">Username</label>
                    <div class="login-field">
                        <span class="login-field-ico" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </span>
                        <input type="text" id="loginUser" placeholder="Username" required autocomplete="username">
                    </div>
                </div>
                <div class="input-group">
                    <div class="login-label-row">
                        <label for="loginPass">Password</label>
                        <a href="#" class="login-forgot" onclick="toggleAuthMode('forgot'); return false;">Forgot
                            Password?</a>
                    </div>
                    <div class="login-field login-field-pass">
                        <span class="login-field-ico" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </span>
                        <input type="password" id="loginPass" placeholder="Password" required
                            autocomplete="current-password">
                        <button type="button" class="login-pass-toggle" id="loginPassToggle"
                            onclick="toggleLoginPassword()" aria-label="Show password">
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
                    </div>
                </div>
                <div id="loginError" class="error-msg hidden">Invalid username or password.</div>
                <button type="submit" class="btn btn-primary btn-login">Sign In</button>
                <p class="auth-link login-register">
                    New to MotoTrack? <a href="#" onclick="toggleAuthMode('register'); return false;">Create an
                        account</a>
                </p>
                <div style="margin-top: 1rem; text-align: center; font-size: 0.82rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem;">
                    <a href="/admin" style="color: var(--accent, #e53e3e); text-decoration: none; font-weight: 600;">
                        🛡️ Shop Owner / Admin Portal &rarr;
                    </a>
                </div>
            </form>

            <!-- Register form -->
            <form id="registerForm" class="hidden" onsubmit="handleRegister(event)">
                <div class="login-welcome">
                    <h2>Create Account</h2>
                    <p>Register to track your bike's service history.</p>
                </div>
                <div class="input-group">
                    <label>Choose Username</label>
                    <input type="text" id="regUser" placeholder="Username" required>
                </div>
                <div class="input-group">
                    <label>Create Password</label>
                    <input type="password" id="regPass" placeholder="Minimum 8 characters" required minlength="8">
                </div>
                <div class="input-group">
                    <label>Confirm Password</label>
                    <input type="password" id="regPassConfirm" placeholder="Retype password" required minlength="8">
                </div>
                <button type="submit" class="btn btn-primary btn-login">Create Account</button>
                <p class="auth-link">Already have an account? <a href="#" onclick="toggleAuthMode('login')">Sign
                        in</a></p>
            </form>

            <!-- Forgot password form -->
            <form id="forgotForm" class="hidden" onsubmit="handleForgot(event)">
                <div class="login-welcome">
                    <h2>Reset Password</h2>
                    <p>Enter your username. Shop staff will set a new password at the counter.</p>
                </div>
                <div class="input-group">
                    <label>Username</label>
                    <input type="text" id="forgotUser" placeholder="Enter your username" required minlength="3">
                </div>
                <button type="submit" class="btn btn-primary btn-login">Request Reset</button>
                <p class="auth-link"><a href="#" onclick="toggleAuthMode('login')">&larr; Back to Sign In</a></p>
            </form>

            <p class="login-copyright">&copy; 2025 Pops Shock Attack. All rights reserved.</p>
        </div>

    </div>
</div>
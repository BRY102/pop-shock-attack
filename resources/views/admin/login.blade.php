<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Admin Portal | Pops Shock Attack</title>
    <!-- Load order: tokens → layout → components → views → responsive -->
    <link rel="stylesheet" href="/css/base.css">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/responsive.css">
    <style>
        .admin-portal-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at top right, #1f1214 0%, #0d0f12 60%, #07080a 100%);
            padding: 1.5rem;
            color: #fff;
            position: relative;
            overflow: hidden;
        }

        .admin-portal-wrapper::before {
            content: '';
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(229, 62, 62, 0.12) 0%, transparent 70%);
            top: -100px;
            right: -100px;
            pointer-events: none;
        }

        .admin-card {
            width: 100%;
            max-width: 440px;
            background: rgba(18, 20, 26, 0.95);
            border: 1px solid rgba(229, 62, 62, 0.25);
            border-radius: 16px;
            padding: 2.5rem 2rem;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(229, 62, 62, 0.1);
            backdrop-filter: blur(12px);
            position: relative;
            z-index: 2;
        }

        .admin-card-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .admin-logos {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 1.25rem;
        }

        .admin-logos img {
            height: 44px;
            width: auto;
            object-fit: contain;
        }

        .admin-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(229, 62, 62, 0.15);
            color: #ff6b6b;
            border: 1px solid rgba(229, 62, 62, 0.35);
            padding: 0.3rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-bottom: 0.75rem;
        }

        .admin-badge svg {
            width: 14px;
            height: 14px;
        }

        .admin-card-header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #fff;
            margin: 0 0 0.4rem 0;
            letter-spacing: -0.01em;
        }

        .admin-card-header p {
            font-size: 0.88rem;
            color: #8c9ba5;
            margin: 0;
        }

        .admin-input-group {
            margin-bottom: 1.25rem;
        }

        .admin-input-group label {
            display: block;
            font-size: 0.82rem;
            font-weight: 600;
            color: #cbd5e0;
            margin-bottom: 0.4rem;
        }

        .admin-field-shell {
            position: relative;
            display: flex;
            align-items: center;
        }

        .admin-field-shell input {
            width: 100%;
            background: #0d0f14;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 0.75rem 1rem 0.75rem 2.6rem;
            color: #fff;
            font-size: 0.95rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .admin-field-shell input:focus {
            outline: none;
            border-color: #e53e3e;
            box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.25);
        }

        .admin-field-icon {
            position: absolute;
            left: 0.85rem;
            color: #718096;
            width: 18px;
            height: 18px;
            pointer-events: none;
        }

        .admin-btn-submit {
            width: 100%;
            background: #e53e3e;
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 0.85rem;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
            margin-top: 0.5rem;
        }

        .admin-btn-submit:hover:not(:disabled) {
            background: #c53030;
        }

        .admin-btn-submit:active:not(:disabled) {
            transform: scale(0.99);
        }

        .admin-btn-submit:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .admin-error-box {
            background: rgba(229, 62, 62, 0.12);
            border: 1px solid rgba(229, 62, 62, 0.4);
            color: #feb2b2;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            margin-bottom: 1.25rem;
            line-height: 1.4;
        }

        .admin-footer-links {
            margin-top: 1.75rem;
            padding-top: 1.25rem;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            text-align: center;
            font-size: 0.85rem;
            color: #718096;
        }

        .admin-footer-links a {
            color: #cbd5e0;
            text-decoration: none;
            transition: color 0.2s;
        }

        .admin-footer-links a:hover {
            color: #fff;
            text-decoration: underline;
        }
    </style>
</head>

<body>
    <div class="admin-portal-wrapper">
        <div class="admin-card">
            <div class="admin-card-header">
                <div class="admin-logos">
                    <img src="/img/logo-ae.png" alt="AE Logo" />
                    <img src="/img/logo-psa.png" alt="Pops Shock Attack" />
                </div>
                <div class="admin-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Restricted Area
                </div>
                <h1>Administrator Portal</h1>
                <p>Authorized workshop management &amp; executive control.</p>
            </div>

            <div id="adminError" class="admin-error-box hidden"></div>

            <form onsubmit="handleAdminLogin(event)">
                <div class="admin-input-group">
                    <label for="adminUser">Administrator Username</label>
                    <div class="admin-field-shell">
                        <svg class="admin-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <input type="text" id="adminUser" placeholder="Admin username" required autocomplete="username">
                    </div>
                </div>

                <div class="admin-input-group">
                    <label for="adminPass">Master Password</label>
                    <div class="admin-field-shell">
                        <svg class="admin-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <input type="password" id="adminPass" placeholder="Master password" required
                            autocomplete="current-password">
                        <button type="button" class="login-pass-toggle" id="adminPassToggle"
                            onclick="toggleAdminPassword()" aria-label="Show password">
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

                <button type="submit" class="admin-btn-submit" id="adminSubmitBtn">
                    Authenticate as Administrator
                </button>
            </form>

            <div class="admin-footer-links">
                <p style="margin-bottom: 0.5rem;">
                    <a href="/">&larr; Return to Staff &amp; Customer Portal</a>
                </p>
                <small style="color: #4a5568; display: block; font-size: 0.76rem;">
                    Security Note: All access attempts are recorded in system audit logs.
                </small>
            </div>
        </div>
    </div>

    <script src="/js/admin-login.js"></script>
</body>

</html>

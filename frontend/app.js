// API Configuration - loaded from api-config.js
// API_BASE is defined in api-config.js

// Current state
let currentUser = null;
let currentLang = 'de';
let translations = {};
let isSetupRequired = false;

// Override fetch to always include credentials
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    return originalFetch(url, {
        ...options,
        credentials: 'include'
    });
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

// Initialize app
async function initApp() {
    try {
        console.log('Initializing app...');
        
        // Check if setup is required
        const setupResponse = await fetch(`${API_BASE}/api/auth/setup-required`, {
            credentials: 'include'
        });
        
        if (setupResponse.ok) {
            const setupData = await setupResponse.json();
            isSetupRequired = setupData.setup_required;
            console.log('Setup required:', isSetupRequired);
            
            if (isSetupRequired) {
                // Show setup form
                showSetupForm();
            } else {
                // Check if already logged in
                const authResponse = await fetch(`${API_BASE}/api/auth/me`, {
                    credentials: 'include'
                });
                
                if (authResponse.ok) {
                    currentUser = await authResponse.json();
                    console.log('Already logged in as:', currentUser.username);
                    showApp();
                } else {
                    // Show login form
                    showLoginForm();
                }
            }
        } else {
            console.log('Setup endpoint not available, showing login');
            showLoginForm();
        }
    } catch (error) {
        console.error('Init error:', error);
        showLoginForm();
    }
}

// Show setup form (for first user)
function showSetupForm() {
    const loginView = document.getElementById('login-view');
    if (!loginView) return;
    
    // Replace login form with setup form
    const formContainer = loginView.querySelector('.bg-white, .dark\\:bg-gray-800');
    if (formContainer) {
        formContainer.innerHTML = `
            <div class="text-center mb-8">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center card-gradient">
                    <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Willkommen!</h1>
                <p class="text-gray-500 dark:text-gray-400 mt-2">Erstelle deinen Account</p>
            </div>
            
            <form id="setup-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Benutzername</label>
                    <input type="text" id="setup-username" required 
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="z.B. max">
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Passwort</label>
                    <input type="password" id="setup-password" required minlength="6"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Mindestens 6 Zeichen">
                </div>
                
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Passwort wiederholen</label>
                    <input type="password" id="setup-password-confirm" required
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Passwort wiederholen">
                </div>
                
                <button type="submit" 
                    class="w-full py-4 rounded-xl font-semibold text-white transition-all transform active:scale-95 card-gradient">
                    Account erstellen
                </button>
            </form>
            
            <div id="setup-error" class="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-sm hidden"></div>
        `;
        
        // Add event listener
        document.getElementById('setup-form').addEventListener('submit', handleSetup);
    }
}

// Show login form (default)
function showLoginForm() {
    console.log('Showing login form');
    // Login form is already in HTML, just ensure it's visible
    const loginView = document.getElementById('login-view');
    if (loginView) {
        loginView.style.display = 'flex';
    }
}

// Show main app
function showApp() {
    console.log('Showing app');
    const loginView = document.getElementById('login-view');
    if (loginView) {
        loginView.style.display = 'none';
    }
    
    // Show main content
    const dashboardView = document.getElementById('dashboard-view');
    const bottomNav = document.querySelector('nav');
    const header = document.querySelector('header');
    
    if (dashboardView) dashboardView.classList.remove('hidden');
    if (bottomNav) bottomNav.style.display = 'flex';
    if (header) header.style.display = 'block';
    
    // Initialize dashboard
    if (typeof initDashboard === 'function') {
        initDashboard();
    }
    if (typeof updateGreeting === 'function') {
        updateGreeting();
    }
}

// Handle setup form submission
async function handleSetup(event) {
    event.preventDefault();
    
    const username = document.getElementById('setup-username').value;
    const password = document.getElementById('setup-password').value;
    const confirmPassword = document.getElementById('setup-password-confirm').value;
    const errorDiv = document.getElementById('setup-error');
    
    // Validate
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwörter stimmen nicht überein';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Passwort muss mindestens 6 Zeichen haben';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(`${API_BASE}/api/auth/setup`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (response.ok) {
            // Setup successful - reload page to show login
            location.reload();
        } else {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Setup fehlgeschlagen';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Setup error:', error);
        errorDiv.textContent = 'Verbindungsfehler. Bitte später erneut versuchen.';
        errorDiv.classList.remove('hidden');
    }
}

// Auto-login after successful setup
async function handleLoginAfterSetup(username, password) {
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('remember', 'true');
        
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (response.ok) {
            currentUser = await response.json();
            showApp();
        } else {
            showLoginForm();
        }
    } catch (error) {
        console.error('Auto-login error:', error);
        showLoginForm();
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember')?.checked ?? true;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('remember', remember);
        
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (response.ok) {
            currentUser = await response.json();
            showApp();
        } else {
            const error = await response.json();
            if (errorDiv) {
                errorDiv.textContent = error.detail || 'Login fehlgeschlagen';
                errorDiv.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Verbindungsfehler. Bitte später erneut versuchen.';
            errorDiv.classList.remove('hidden');
        }
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    currentUser = null;
    location.reload();
}

// Helper function for API URLs
function apiUrl(path) {
    return `${API_BASE}${path}`;
}

// Placeholder functions for compatibility
function initDashboard() {
    console.log('Dashboard initialized');
}

function updateGreeting() {
    console.log('Greeting updated');
}

function showView(view) {
    console.log('Show view:', view);
}

function resetForm() {
    console.log('Form reset');
}

function loadHistory(days) {
    console.log('Load history:', days);
}

async function loadUserConfig() {
    return { language: 'de', units: 'metric' };
}

async function loadTranslations(lang) {
    translations = {};
    return translations;
}

function t(key) {
    return translations[key] || key;
}

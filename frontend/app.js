// API Configuration
// API_BASE is now defined in api-config.js

// Current user info
let currentUser = null;
let isSetupRequired = false;

// Override fetch to always include credentials
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    return originalFetch(url, {
        ...options,
        credentials: 'include'
    });
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

// Initialize app - check if setup or login is needed
async function initApp() {
    try {
        // Check if setup is required (no users exist yet)
        const setupResponse = await fetch(`${API_BASE}/api/auth/setup-required`, {
            credentials: 'include'
        });
        
        if (setupResponse.ok) {
            const setupData = await setupResponse.json();
            isSetupRequired = setupData.setup_required;
            
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
                    showApp();
                } else {
                    // Show login form
                    showLoginForm();
                }
            }
        } else {
            showLoginForm();
        }
    } catch (error) {
        console.error('Init error:', error);
        showLoginForm();
    }
}

// Show setup form (for first user)
function showSetupForm() {
    document.getElementById('login-loading').classList.add('hidden');
    document.getElementById('setup-form-container').classList.remove('hidden');
    document.getElementById('login-form-container').classList.add('hidden');
}

// Show login form
function showLoginForm() {
    document.getElementById('login-loading').classList.add('hidden');
    document.getElementById('setup-form-container').classList.add('hidden');
    document.getElementById('login-form-container').classList.remove('hidden');
}

// Show main app
function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.querySelector('.bottom-nav').style.display = 'flex';
    document.querySelector('header').style.display = 'block';
    
    // Show dashboard
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    // Initialize
    initDashboard();
    updateGreeting();
}

// Handle setup form submission (first user)
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
            // Auto-login after setup
            await handleLoginAfterSetup(username, password);
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
            // Show login form if auto-login fails
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
    const remember = document.getElementById('login-remember').checked;
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
            const data = await response.json();
            currentUser = data;
            showApp();
        } else {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Login fehlgeschlagen';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Verbindungsfehler. Bitte später erneut versuchen.';
        errorDiv.classList.remove('hidden');
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
    location.reload(); // Reload to show login
}

// Helper function for API URLs
function apiUrl(path) {
    return `${API_BASE}${path}`;
}

// Placeholder functions for the rest of the app
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

// Global state for translations
let currentLang = 'de';
let translations = {};

async function loadUserConfig() {
    // Placeholder
    return { language: 'de', units: 'metric' };
}

async function loadTranslations(lang) {
    // Placeholder
    translations = {};
    return translations;
}

function t(key) {
    return translations[key] || key;
}

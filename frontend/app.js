// API Configuration
// API_BASE is now defined in api-config.js

// Detect language from browser
const browserLang = navigator.language || navigator.userLanguage || 'en';
const isGerman = browserLang.toLowerCase().startsWith('de');

// Current user info
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Check authentication status
async function checkAuth() {
    try {
        // First check if setup is required
        const setupResponse = await fetch(`${API_BASE}/api/auth/setup-required`, {
            credentials: 'include'
        });
        
        if (setupResponse.ok) {
            const setupData = await setupResponse.json();
            if (setupData.setup_required) {
                showSetupForm();
                return;
            }
        }
        
        // Check if already logged in
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: 'include'  // Important: send cookies
        });
        
        if (response.ok) {
            currentUser = await response.json();
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLogin();
    }
}

// Show login view
function showLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('add-view').classList.add('hidden');
    document.getElementById('history-view').classList.add('hidden');
    document.querySelector('.bottom-nav').style.display = 'none';
    document.querySelector('header').style.display = 'none';
}

// Update greeting
function updateGreeting() {
    const greetingEl = document.getElementById('greeting');
    const nameEl = document.getElementById('greeting-name');
    
    if (greetingEl && nameEl && currentUser && currentUser.username) {
        nameEl.textContent = `Willkommen ${currentUser.username}! 👋`;
        greetingEl.style.opacity = '1';
    }
}

// Initialize date input
function initDate() {
    const dateInput = document.getElementById('input-date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
}

// Initialize dark mode
function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
}

// Initialize dashboard
function initDashboard() {
    // Dashboard is already visible, nothing special to do
    console.log('Dashboard initialized');
}

// Show setup form (for first user)
function showSetupForm() {
    const loginView = document.getElementById('login-view');
    loginView.classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('add-view').classList.add('hidden');
    document.getElementById('history-view').classList.add('hidden');
    document.querySelector('.bottom-nav').style.display = 'none';
    document.querySelector('header').style.display = 'none';
    
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
            
            <form id="setup-form" onsubmit="handleSetup(event)">
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
            // Setup successful - reload to show login
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

// Show main app
async function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.querySelector('.bottom-nav').style.display = 'flex';
    document.querySelector('header').style.display = 'block';
    
    // Initialize app
    await loadUserConfig();
    await loadTranslations(currentLang);
    initDate();
    initDarkMode();
    updateGreeting();
    await loadAllEntries();
    initForm();
    updateUIText();
    
    // Delay chart init to ensure DOM is visible and has dimensions
    setTimeout(() => {
        initCharts();
        // Force resize after a short delay to ensure charts render correctly
        setTimeout(() => {
            [stepsChart, sleepChart, hrChart].forEach(chart => {
                if (chart && chart.resize) {
                    chart.resize();
                }
            });
        }, 100);
    }, 50);
}

// Handle login form submit
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
    showLogin();
    
    // Clear form
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
}

// Validate token before loading app
let tokenValid = false;
let authCheckComplete = false;

// Helper function to add token to URL
function apiUrl(path) {
    return `${API_BASE}${path}`;
}

// Helper function for API calls with credentials
async function apiFetch(path, options = {}) {
    return fetch(apiUrl(path), {
        ...options,
        credentials: 'include'
    });
}

// Override fetch to always include credentials
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    // Ensure credentials are included for API calls
    const isApiCall = url.includes(API_BASE) || (typeof url === 'string' && url.startsWith('/api/'));
    if (isApiCall) {
        options = { ...options, credentials: 'include' };
    }
    return originalFetch(url, options);
};

// Global state
let currentLang = 'de';
let currentUnits = 'metric';
let translations = {};
let stepsChart, sleepChart, hrChart;
let allEntries = [];
let currentEntryIndex = 0;
let editingEntryId = null;
let currentUsername = 'User';

// Unit conversion functions
function kgToLbs(kg) {
    return kg * 2.20462;
}

function lbsToKg(lbs) {
    return lbs / 2.20462;
}

function convertWeight(value, toUnit) {
    if (toUnit === 'imperial') {
        return kgToLbs(value);
    }
    return value;
}

function formatWeight(value, units) {
    const converted = convertWeight(value, units);
    const unit = units === 'imperial' ? 'lbs' : 'kg';
    return `${converted.toFixed(1)} ${unit}`;
}

// Load translations
async function loadTranslations(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        return translations;
    } catch (err) {
        console.error('Error loading translations:', err);
        // Fallback to German
        return {};
    }
}

// Translation helper
function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
        value = value?.[k];
    }
    if (typeof value === 'string') {
        return value.replace(/\{([^}]+)\}/g, (match, param) => params[param] || match);
    }
    return key;
}

// Helper functions for time conversion
function decimalToTimeString(decimal) {
    if (!decimal && decimal !== 0) return '-';
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function timeStringToDecimal(timeStr) {
    if (!timeStr) return 0;
    if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + (minutes / 60);
    }
    return parseFloat(timeStr);
}

// Connection check
let isBackendConnected = true;
let connectionCheckInterval = null;

async function checkConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await apiFetch('/api/user/config');
        clearTimeout(timeoutId);
        
        const wasConnected = isBackendConnected;
        isBackendConnected = response.ok;
        
        updateConnectionStatus();
        
        // Reconnect toast
        if (!wasConnected && isBackendConnected) {
            const reconnectMsg = t('messages.reconnected') !== 'messages.reconnected'
                ? t('messages.reconnected')
                : (currentLang === 'de' ? '✅ Verbindung wiederhergestellt' : '✅ Connection restored');
            showToast(reconnectMsg);
            await loadAllEntries();
            initCharts();
        }
        
        return isBackendConnected;
    } catch (err) {
        isBackendConnected = false;
        updateConnectionStatus();
        return false;
    }
}

function updateConnectionStatus() {
    const statusEl = document.getElementById('connection-status');
    const statusDot = document.querySelector('#connection-status .pulse-dot');
    
    if (statusEl && statusDot) {
        if (isBackendConnected) {
            statusEl.innerHTML = '<span class="inline-block w-2 h-2 bg-green-500 rounded-full pulse-dot mr-1"></span> Online';
            statusEl.classList.remove('text-red-500', 'font-semibold');
        } else {
            statusEl.innerHTML = '<span class="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span> Offline';
            statusEl.classList.add('text-red-500', 'font-semibold');
            
            // Show offline warning toast if not already shown recently
            showOfflineWarning();
        }
    }
}

let offlineWarningShown = false;
function showOfflineWarning() {
    if (offlineWarningShown) return;
    
    // Use translation if loaded, otherwise fallback
    const message = t('messages.offline') !== 'messages.offline' 
        ? t('messages.offline')
        : (currentLang === 'de' 
            ? '⚠️ Keine Verbindung zum Server. Prüfe ob das Backend läuft!' 
            : '⚠️ Cannot connect to server. Check if backend is running!');
    
    showToast(message);
    offlineWarningShown = true;
    
    setTimeout(() => { offlineWarningShown = false; }, 10000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
});

// Load user config (language + units)
async function loadUserConfig() {
    try {
        const config = await fetch(apiUrl('/api/user/config')).then(r => r.json());
        currentLang = config.language || 'de';
        currentUnits = config.units || 'metric';
    } catch (err) {
        console.error('Error loading config:', err);
    }
}

// Load user info
function loadUserInfo() {
    const greetingEl = document.getElementById('greeting');
    const nameEl = document.getElementById('greeting-name');
    
    if (greetingEl && nameEl && currentUsername) {
        nameEl.textContent = `${t('greeting.hello')} ${currentUsername}! 👋`;
        greetingEl.style.opacity = '1';
    }
}

// Update all UI text based on current language
function updateUIText() {
    // Nav
    const navDashboard = document.querySelector('[data-view="dashboard"] span');
    if (navDashboard) navDashboard.textContent = t('nav.overview');
    
    const navAdd = document.querySelector('[data-view="add"] span');
    if (navAdd) navAdd.textContent = t('nav.add');
    
    const navHistory = document.querySelector('[data-view="history"] span');
    if (navHistory) navHistory.textContent = t('nav.history');
    
    // Stats cards
    const stepsLabel = document.querySelector('#steps-value + div');
    if (stepsLabel) stepsLabel.textContent = t('stats.stepsToday');
    
    const sleepLabel = document.querySelector('#sleep-value + div');
    if (sleepLabel) sleepLabel.textContent = t('stats.sleepHours');
    
    const hrLabel = document.querySelector('#hr-value + div');
    if (hrLabel) hrLabel.textContent = t('stats.restingHR');
    
    const energyLabel = document.querySelector('#energy-value + div');
    if (energyLabel) energyLabel.textContent = t('stats.energyKcal');
    
    // Chart titles
    const stepsTitle = document.querySelector('#dashboard-view h3');
    if (stepsTitle) stepsTitle.textContent = t('charts.steps7Days');
    
    // Stats section
    const statsTitle = document.querySelector('#stats-container h3');
    if (statsTitle) statsTitle.textContent = t('statsSection.title');
    
    // Form
    const formTitle = document.querySelector('#add-view h2');
    if (formTitle) formTitle.textContent = editingEntryId ? t('form.editEntry') : t('form.newEntry');
    
    // Update all visible entries
    const historyView = document.getElementById('history-view');
    if (historyView && !historyView.classList.contains('hidden')) {
        loadHistory(7);
    }
}

// Dark Mode Functions
function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        document.documentElement.classList.add('dark');
        updateDarkModeIcons(true);
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeIcons(isDark);
    updateChartColors();
}

function updateDarkModeIcons(isDark) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    if (sunIcon && moonIcon) {
        sunIcon.classList.toggle('hidden', !isDark);
        moonIcon.classList.toggle('hidden', isDark);
    }
}

// Initialize date
function initDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date').textContent = today.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', options);
    document.getElementById('input-datum').value = today.toISOString().split('T')[0];
}

// Load all entries for navigation
async function loadAllEntries() {
    try {
        const response = await apiFetch('/api/health?limit=1000');
        if (!response.ok) {
            if (response.status === 401) {
                showLogin();
                return;
            }
            throw new Error('Failed to load entries');
        }
        allEntries = await response.json();
        allEntries.sort((a, b) => new Date(b.datum) - new Date(a.datum));
        
        if (allEntries.length > 0) {
            currentEntryIndex = 0;
            displayEntry(currentEntryIndex);
            updateNavigationButtons();
        } else {
            initDashboard();
        }
    } catch (err) {
        console.error('Error loading entries:', err);
        initDashboard();
    }
}

// Display a specific entry
function displayEntry(index) {
    const entry = allEntries[index];
    if (!entry) return;
    
    const date = new Date(entry.datum);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date').textContent = date.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', options);
    
    document.getElementById('steps-value').textContent = entry.schritte?.toLocaleString(currentLang === 'de' ? 'de-DE' : 'en-US') || '-';
    document.getElementById('sleep-value').textContent = decimalToTimeString(entry.schlaf_stunden);
    document.getElementById('hr-value').textContent = entry.herzfrequenz_ruhe || '-';
    document.getElementById('energy-value').textContent = entry.aktivitaetsenergie?.toLocaleString(currentLang === 'de' ? 'de-DE' : 'en-US') || '-';
    
    loadStats();
}

// Navigation
function navigateDay(direction) {
    const newIndex = currentEntryIndex + direction;
    
    if (newIndex >= 0 && newIndex < allEntries.length) {
        currentEntryIndex = newIndex;
        displayEntry(currentEntryIndex);
        updateNavigationButtons();
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-day-btn');
    const nextBtn = document.getElementById('next-day-btn');
    
    if (allEntries.length === 0) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    prevBtn.disabled = currentEntryIndex >= allEntries.length - 1;
    nextBtn.disabled = currentEntryIndex <= 0;
}

// Load stats
async function loadStats() {
    try {
        const stats = await fetch(apiUrl('/api/health/stats?days=30')).then(r => r.json());
        
        document.getElementById('avg-steps').textContent = stats.avg_schritte?.toLocaleString(currentLang === 'de' ? 'de-DE' : 'en-US') || '-';
        document.getElementById('avg-sleep').textContent = decimalToTimeString(stats.avg_schlaf_stunden);
        document.getElementById('avg-hr').textContent = (stats.avg_herzfrequenz_ruhe + ' bpm') || '-';
        document.getElementById('avg-weight').textContent = formatWeight(stats.avg_gewicht, currentUnits);
        document.getElementById('avg-training').textContent = Math.round(stats.avg_training_minuten * 7) + ' min' || '-';
        
        updateTrend('steps-trend', stats.trend_schritte);
        updateTrend('sleep-trend', stats.trend_schlaf);
    } catch (err) {
        console.error('Stats error:', err);
    }
}

function updateTrend(elementId, trend) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (trend === 'up') {
        el.textContent = '↑';
        el.className = 'text-xs opacity-80 text-green-300';
    } else if (trend === 'down') {
        el.textContent = '↓';
        el.className = 'text-xs opacity-80 text-red-300';
    } else {
        el.textContent = '→';
        el.className = 'text-xs opacity-80';
    }
}

// View Navigation
function showView(viewName) {
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('add-view').classList.add('hidden');
    document.getElementById('history-view').classList.add('hidden');
    
    document.getElementById(viewName + '-view').classList.remove('hidden');
    
    // Check if dark mode is active
    const isDark = document.documentElement.classList.contains('dark');
    const inactiveColor = isDark ? '#9ca3af' : '#6b7280';
    const activeColor = '#10b981';
    
    // Update navigation active states
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        el.style.color = inactiveColor;
    });
    
    const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = activeColor;
    }
    
    if (viewName === 'history') {
        loadHistory(7);
    }
    
    // Update UI text when switching views
    updateUIText();
}

// Dashboard fallback
async function initDashboard() {
    try {
        const latest = await fetch(apiUrl('/api/health/latest')).then(r => r.json());
        if (latest) {
            document.getElementById('steps-value').textContent = latest.schritte?.toLocaleString(currentLang === 'de' ? 'de-DE' : 'en-US') || '-';
            document.getElementById('sleep-value').textContent = decimalToTimeString(latest.schlaf_stunden);
            document.getElementById('hr-value').textContent = latest.herzfrequenz_ruhe || '-';
            document.getElementById('energy-value').textContent = latest.aktivitaetsenergie?.toLocaleString(currentLang === 'de' ? 'de-DE' : 'en-US') || '-';
        }
        loadStats();
    } catch (err) {
        console.error('Dashboard error:', err);
    }
    updateNavigationButtons();
}

// Charts
function initCharts() {
    // Load all charts in parallel
    Promise.all([
        loadStepsChart(7),
        loadSleepChart(),
        loadHRChart()
    ]).then(() => {
        console.log('All charts loaded');
    }).catch(err => {
        console.error('Error loading charts:', err);
    });
}

function updateChartColors() {
    const colors = getChartColors();
    
    [stepsChart, sleepChart, hrChart].forEach(chart => {
        if (chart) {
            chart.options.scales.y.grid.color = colors.gridColor;
            chart.options.scales.y.ticks.color = colors.textColor;
            chart.options.scales.x.ticks.color = colors.textColor;
            chart.options.plugins.legend.labels.color = colors.titleColor;
            chart.update();
        }
    });
}

function getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
        gridColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
        textColor: isDark ? '#e5e7eb' : '#6b7280',
        titleColor: isDark ? '#f3f4f6' : '#1f2937'
    };
}

async function loadStepsChart(days) {
    try {
        const colors = getChartColors();
        const response = await apiFetch(`/api/health/chart/schritte?days=${days}`);
        if (!response.ok) {
            console.error('Steps chart error:', response.status);
            return;
        }
        const data = await response.json();
        
        const canvas = document.getElementById('stepsChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (stepsChart) stepsChart.destroy();
        
        stepsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: t('stats.steps'),
                    data: data.values,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: false,
                        labels: { color: colors.titleColor }
                    }
                },
                scales: {
                    y: { 
                        grid: { color: colors.gridColor },
                        ticks: { color: colors.textColor }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: colors.textColor, maxTicksLimit: 6 }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    } catch (err) {
        console.error('Error loading steps chart:', err);
    }
}

async function loadSleepChart() {
    try {
        const colors = getChartColors();
        const response = await apiFetch('/api/health/chart/schlaf_stunden?days=30');
        if (!response.ok) {
            console.error('Sleep chart error:', response.status);
            return;
        }
        const data = await response.json();
        
        const canvas = document.getElementById('sleepChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (sleepChart) sleepChart.destroy();
        
        sleepChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: t('stats.sleep'),
                    data: data.values,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        grid: { color: colors.gridColor },
                        ticks: { color: colors.textColor }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: colors.textColor, maxTicksLimit: 6 }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error loading sleep chart:', err);
    }
}

async function loadHRChart() {
    try {
        const colors = getChartColors();
        const [restResponse, avgResponse] = await Promise.all([
            apiFetch('/api/health/chart/herzfrequenz_ruhe?days=30'),
            apiFetch('/api/health/chart/herzfrequenz_avg?days=30')
        ]);
        
        if (!restResponse.ok || !avgResponse.ok) {
            console.error('HR chart error:', restResponse.status, avgResponse.status);
            return;
        }
        
        const dataRest = await restResponse.json();
        const dataAvg = await avgResponse.json();
        
        const canvas = document.getElementById('hrChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (hrChart) hrChart.destroy();
        
        hrChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dataRest.labels,
                datasets: [
                    {
                        label: t('stats.restingHR'),
                        data: dataRest.values,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: t('stats.avgHR'),
                        data: dataAvg.values,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'top',
                        labels: { 
                            usePointStyle: true, 
                            boxWidth: 8,
                            color: colors.textColor
                        }
                    } 
                },
                scales: {
                    y: { 
                        grid: { color: colors.gridColor },
                        ticks: { color: colors.textColor }
                    },
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: colors.textColor, maxTicksLimit: 6 } 
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    } catch (err) {
        console.error('Error loading HR chart:', err);
    }
}

// Custom Confirm Modal
function customConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const content = document.getElementById('confirm-modal-content');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const cancelBtn = document.getElementById('confirm-cancel');
        const okBtn = document.getElementById('confirm-ok');
        
        titleEl.textContent = title || 'Bestätigen';
        messageEl.textContent = message || 'Möchtest du das wirklich tun?';
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Animation
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        const closeModal = (result) => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 200);
            resolve(result);
        };
        
        cancelBtn.onclick = () => closeModal(false);
        okBtn.onclick = () => closeModal(true);
        
        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) closeModal(false);
        };
    });
}

// Steps chart range selector
const stepsRange = document.getElementById('steps-range');
if (stepsRange) {
    stepsRange.addEventListener('change', (e) => {
        loadStepsChart(parseInt(e.target.value));
    });
}

// Form
function initForm() {
    document.getElementById('entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let weightValue = parseFloat(document.getElementById('input-gewicht').value) || 0;
        // Convert lbs to kg if imperial
        if (currentUnits === 'imperial' && weightValue > 0) {
            weightValue = lbsToKg(weightValue);
        }
        
        const data = {
            datum: document.getElementById('input-datum').value,
            schritte: parseInt(document.getElementById('input-schritte').value) || 0,
            schlaf_stunden: timeStringToDecimal(document.getElementById('input-schlaf').value),
            schlaf_index: parseFloat(document.getElementById('input-schlaf-index').value) || 0,
            herzfrequenz_ruhe: parseInt(document.getElementById('input-hf-ruhe').value) || 0,
            herzfrequenz_avg: parseInt(document.getElementById('input-hf-avg').value) || 0,
            gewicht: weightValue,
            aktivitaetsenergie: parseInt(document.getElementById('input-energie').value) || 0,
            training_minuten: parseInt(document.getElementById('input-training').value) || 0,
            notizen: document.getElementById('input-notizen').value
        };
        
        try {
            let res;
            
            if (editingEntryId) {
                res = await apiFetch(`/api/health/${editingEntryId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                res = await apiFetch('/api/health', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            if (res.ok) {
                showToast(editingEntryId ? t('messages.updated') : t('messages.saved'));
                resetForm();
                await loadAllEntries();
                initCharts();
            } else {
                const error = await res.text();
                showToast(t('messages.error') + ': ' + error);
            }
        } catch (err) {
            showToast(t('messages.connectionError'));
            console.error(err);
        }
    });
    
    // Delete button handler
    const deleteBtn = document.getElementById('delete-entry-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!editingEntryId) return;
            
            const confirmed = await customConfirm('Eintrag löschen', 'Diesen Eintrag wirklich löschen?');
            if (!confirmed) return;
            
            try {
                const res = await apiFetch(`/api/health/${editingEntryId}`, {
                    method: 'DELETE'
                });
                
                if (res.ok) {
                    showToast('🗑️ Eintrag gelöscht!');
                    resetForm();
                    await loadAllEntries();
                    initCharts();
                } else {
                    showToast(t('messages.error'));
                }
            } catch (err) {
                showToast(t('messages.connectionError'));
                console.error(err);
            }
        });
    }
}

// History
async function loadHistory(days) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (parseInt(btn.dataset.days) === days) {
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-emerald-500', 'text-white');
        } else {
            btn.classList.add('bg-gray-200', 'text-gray-700');
            btn.classList.remove('bg-emerald-500', 'text-white');
        }
    });
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    const startDate = since.toISOString().split('T')[0];
    
    try {
        const entries = await fetch(apiUrl(`/api/health?start_date=${startDate}`)).then(r => r.json());

        const container = document.getElementById('history-list');
        container.innerHTML = '';
        
        if (entries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p>${t('history.noEntries')}</p>
                </div>
            `;
            return;
        }
        
        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700';
            
            const lastSync = entry.updated_at ? new Date(entry.updated_at).toLocaleTimeString(currentLang === 'de' ? 'de-DE' : 'en-US', {hour: '2-digit', minute: '2-digit'}) : '';
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-semibold text-gray-800 dark:text-gray-200">${formatDate(entry.datum)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${entry.notizen || ''}</div>
                        ${lastSync ? `<div class="text-xs text-emerald-500 mt-1">🕐 ${t('history.lastSync')}: ${lastSync}</div>` : ''}
                    </div>
                    <button onclick="loadEntryForEdit('${entry.datum}')" class="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-emerald-100 hover:text-emerald-600 transition-colors" title="${t('history.edit')}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                </div>
                <div class="grid grid-cols-5 gap-2 text-xs">
                    <div class="bg-emerald-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${entry.schritte?.toLocaleString(currentLang === 'de' ? 'de-DE' : 'en-US')}</div>
                        <div class="opacity-80">${t('stats.steps')}</div>
                    </div>
                    <div class="bg-blue-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${decimalToTimeString(entry.schlaf_stunden)}</div>
                        <div class="opacity-80">${t('stats.sleep')}</div>
                    </div>
                    <div class="bg-purple-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${entry.herzfrequenz_ruhe}</div>
                        <div class="opacity-80">${t('stats.restingHR')}</div>
                    </div>
                    <div class="bg-orange-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${formatWeight(entry.gewicht, currentUnits)}</div>
                        <div class="opacity-80">${t('stats.weightUnit', {unit: currentUnits === 'imperial' ? 'lbs' : 'kg'})}</div>
                    </div>
                    <div class="bg-amber-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${entry.training_minuten}</div>
                        <div class="opacity-80">${t('stats.training')}</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        
    } catch (err) {
        console.error('History error:', err);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', options);
}

// Load entry for editing
async function loadEntryForEdit(date) {
    try {
        const entry = await fetch(apiUrl(`/api/health/date/${date}`)).then(r => r.json());
        
        if (entry) {
            editingEntryId = entry.id;
            
            // Convert kg to lbs for display if imperial
            let displayWeight = entry.gewicht;
            if (currentUnits === 'imperial' && displayWeight > 0) {
                displayWeight = kgToLbs(displayWeight);
            }
            
            document.getElementById('input-datum').value = entry.datum;
            document.getElementById('input-schritte').value = entry.schritte || '';
            document.getElementById('input-schlaf').value = decimalToTimeString(entry.schlaf_stunden).replace(':', ':');
            document.getElementById('input-schlaf-index').value = entry.schlaf_index || '';
            document.getElementById('input-gewicht').value = displayWeight || '';
            document.getElementById('input-hf-ruhe').value = entry.herzfrequenz_ruhe || '';
            document.getElementById('input-hf-avg').value = entry.herzfrequenz_avg || '';
            document.getElementById('input-energie').value = entry.aktivitaetsenergie || '';
            document.getElementById('input-training').value = entry.training_minuten || '';
            document.getElementById('input-notizen').value = entry.notizen || '';
            
            document.querySelector('#add-view h2').textContent = t('form.editEntry');
            
            // Show delete button and update button, hide save button
            const deleteContainer = document.getElementById('delete-button-container');
            const saveButton = document.getElementById('save-button');
            if (deleteContainer) deleteContainer.style.display = 'flex';
            if (saveButton) saveButton.style.display = 'none';
            
            showView('add');
        }
    } catch (err) {
        console.error('Error loading entry for edit:', err);
        showToast(t('messages.error'));
    }
}

// Reset form
function resetForm() {
    editingEntryId = null;
    document.getElementById('entry-form').reset();
    document.getElementById('input-datum').value = new Date().toISOString().split('T')[0];
    document.getElementById('input-schlaf').value = '';
    document.querySelector('#add-view h2').textContent = t('form.newEntry');
    
    // Show save button, hide delete+update buttons
    const deleteContainer = document.getElementById('delete-button-container');
    const saveButton = document.getElementById('save-button');
    if (deleteContainer) deleteContainer.style.display = 'none';
    if (saveButton) saveButton.style.display = 'block';
}

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// ============ API KEY MANAGEMENT ============

// Load API keys
async function loadApiKeys() {
    try {
        const response = await apiFetch('/api/auth/apikeys');
        if (!response.ok) {
            if (response.status === 401) {
                showLogin();
                return;
            }
            throw new Error('Failed to load API keys');
        }
        
        const data = await response.json();
        displayApiKeys(data.api_keys || []);
    } catch (err) {
        console.error('Error loading API keys:', err);
        document.getElementById('apikeys-list').innerHTML = 
            '<p class="text-red-500 text-sm">Fehler beim Laden der API Keys</p>';
    }
}

// Display API keys
function displayApiKeys(keys) {
    const list = document.getElementById('apikeys-list');
    
    if (!keys || keys.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm">Keine API Keys vorhanden</p>';
        return;
    }
    
    list.innerHTML = keys.map(key => `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
                <p class="font-medium text-gray-800 dark:text-white">${key.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${key.prefix || '****'}****</p>
            </div>
            <button onclick="revokeApiKey(${key.id})" 
                class="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors">
                Löschen
            </button>
        </div>
    `).join('');
}

// Create new API key
async function handleCreateApiKey(event) {
    event.preventDefault();
    
    const name = document.getElementById('apikey-name').value;
    
    try {
        const formData = new FormData();
        formData.append('name', name);
        
        const response = await apiFetch('/api/auth/apikeys', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Show the new key
            document.getElementById('new-apikey-value').textContent = data.api_key;
            document.getElementById('new-apikey-display').classList.remove('hidden');
            
            // Reset form
            document.getElementById('apikey-form').reset();
            
            // Reload keys list
            await loadApiKeys();
            
            showToast('✅ API Key erstellt!');
        } else {
            const error = await response.json();
            showToast('❌ ' + (error.detail || 'Fehler'));
        }
    } catch (err) {
        console.error('Error creating API key:', err);
        showToast('❌ Verbindungsfehler');
    }
}

// Revoke API key
async function revokeApiKey(keyId) {
    if (!confirm('Möchtest du diesen API Key wirklich löschen?')) {
        return;
    }
    
    try {
        const response = await apiFetch(`/api/auth/apikeys/${keyId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('🗑️ API Key gelöscht');
            await loadApiKeys();
        } else {
            const error = await response.json();
            showToast('❌ ' + (error.detail || 'Fehler'));
        }
    } catch (err) {
        console.error('Error revoking API key:', err);
        showToast('❌ Verbindungsfehler');
    }
}

// Copy API key to clipboard
function copyApiKey() {
    const key = document.getElementById('new-apikey-value').textContent;
    navigator.clipboard.writeText(key).then(() => {
        showToast('📋 Kopiert!');
    }).catch(() => {
        showToast('❌ Konnte nicht kopieren');
    });
}

// ============ PROFILE MENU ============

// Toggle profile dropdown menu
function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    menu.classList.toggle('hidden');
    
    // Update username in menu
    if (currentUser && currentUser.username) {
        const usernameEl = document.getElementById('profile-username');
        if (usernameEl) usernameEl.textContent = currentUser.username;
    }
    
    // Update dark mode text based on current state
    const isDark = document.documentElement.classList.contains('dark');
    const darkText = document.getElementById('profile-dark-text');
    const darkIcon = document.getElementById('profile-dark-icon');
    if (darkText) {
        darkText.textContent = isDark ? 'Hellmodus' : 'Dunkelmodus';
    }
    if (darkIcon) {
        darkIcon.innerHTML = isDark
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    }
    
    // Close menu when clicking outside
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeProfileMenuOnClickOutside, { once: true });
        }, 100);
    }
}

// Close profile menu when clicking outside
function closeProfileMenuOnClickOutside(e) {
    const menu = document.getElementById('profile-menu');
    const button = e.target.closest('button[onclick="toggleProfileMenu()"]');
    
    if (!menu.contains(e.target) && !button) {
        menu.classList.add('hidden');
    }
}

// Show profile modal
function showProfileModal(section) {
    const modal = document.getElementById('profile-modal');
    const apikeysSection = document.getElementById('profile-apikeys-section');
    const passwordSection = document.getElementById('profile-password-section');
    
    // Hide all sections
    apikeysSection.classList.add('hidden');
    passwordSection.classList.add('hidden');
    
    // Show selected section
    if (section === 'apikeys') {
        apikeysSection.classList.remove('hidden');
        loadApiKeys();
    } else if (section === 'password') {
        passwordSection.classList.remove('hidden');
    }
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close profile modal
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Reset forms
    document.getElementById('change-password-form')?.reset();
    document.getElementById('apikey-form')?.reset();
    document.getElementById('new-apikey-display')?.classList.add('hidden');
    document.getElementById('password-error')?.classList.add('hidden');
}

// Handle password change
async function handleChangePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('password-error');
    
    // Validate
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'Passwörter stimmen nicht überein';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (newPassword.length < 6) {
        errorDiv.textContent = 'Passwort muss mindestens 6 Zeichen haben';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);
        
        const response = await apiFetch('/api/auth/change-password', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showToast('✅ Passwort geändert!');
            closeProfileModal();
        } else {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Fehler beim Ändern des Passworts';
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error changing password:', err);
        errorDiv.textContent = 'Verbindungsfehler';
        errorDiv.classList.remove('hidden');
    }
}

// Update showView to remove apikeys (now in profile modal)
const originalShowView = showView;
showView = function(view) {
    originalShowView(view);
    // Close profile menu if open
    document.getElementById('profile-menu')?.classList.add('hidden');
};
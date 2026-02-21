// API Configuration
const API_BASE = `http://${window.location.hostname}:8000`;

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const AUTH_TOKEN = urlParams.get('token');

// Detect language from browser for error messages
const browserLang = navigator.language || navigator.userLanguage || 'en';
const isGerman = browserLang.toLowerCase().startsWith('de');

const texts = {
    de: {
        title: 'Zugriff verweigert',
        message: 'Kein oder ungültiger Token angegeben. Ein gültiger Authentifizierungs-Token ist erforderlich.',
        help: 'Bitte rufen Sie diese Seite mit einem gültigen Token auf:',
    },
    en: {
        title: 'Access Denied',
        message: 'No or invalid token provided. A valid authentication token is required.',
        help: 'Please access this page with a valid token:',
    }
};

const deniedTexts = isGerman ? texts.de : texts.en;
const exampleUrl = `${window.location.origin}${window.location.pathname}?token=your-token-here`;

// Function to show access denied page
function showAccessDenied() {
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html lang="${isGerman ? 'de' : 'en'}" class="antialiased">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${deniedTexts.title} | Open Health Server</title>
            <script src="https://cdn.tailwindcss.com"><\/script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
                html { height: 100%; }
                body { min-height: 100vh; margin: 0; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.5s ease-out; }
                @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                .animate-pulse-slow { animation: pulse-slow 2s infinite; }
            </style>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div class="animate-fade-in" style="width: 100%; max-width: 448px;">
                <!-- Card -->
                <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <!-- Header with icon -->
                    <div class="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
                        <div class="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                        </div>
                        <h1 class="text-2xl font-bold text-white">${deniedTexts.title}</h1>
                    </div>
                    
                    <!-- Content -->
                    <div class="p-8">
                        <p class="text-gray-600 dark:text-gray-300 text-center mb-6 leading-relaxed">
                            ${deniedTexts.message}
                        </p>
                        
                        <!-- Code example box -->
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-2">${deniedTexts.help}</p>
                            <code class="block bg-gray-900 text-green-400 px-4 py-3 rounded-lg text-sm font-mono break-all">
                                ${exampleUrl}
                            </code>
                        </div>
                        
                        <!-- Footer -->
                        <div class="mt-6 text-center">
                            <p class="text-xs text-gray-400 dark:text-gray-500">
                                Open Health Server © ${new Date().getFullYear()}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Decorative elements -->
            </div>
        </body>
        </html>
    `;
}

// Validate token before loading app
let tokenValid = false;
let authCheckComplete = false;

// Helper function to add token to URL
function apiUrl(path) {
    const separator = path.includes('?') ? '&' : '?';
    return `${API_BASE}${path}${separator}token=${AUTH_TOKEN}`;
}

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
        
        const response = await fetch(apiUrl('/api/user/config'), { 
            signal: controller.signal,
            cache: 'no-store'
        });
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
    // First: check if token exists
    if (!AUTH_TOKEN) {
        showAccessDenied();
        return;
    }
    
    // Validate token with backend
    try {
        const response = await fetch(apiUrl('/api/user/me'), { cache: 'no-store' });
        if (!response.ok) {
            showAccessDenied();
            return;
        }
        const user = await response.json();
        currentUsername = user.username;
        tokenValid = true;
    } catch (err) {
        console.error('Token validation error:', err);
        showAccessDenied();
        return;
    }
    
    // Token is valid - proceed with app initialization
    try {
        // Reihenfolge ist wichtig:
        // 1. Config laden (enthält Sprache)
        await loadUserConfig();
        // 2. Translations laden (für t() Funktion)
        await loadTranslations(currentLang);
        // 3. UI initialisieren
        initDate();
        initDarkMode();
        loadUserInfo();
        
        // 4. Daten laden
        await loadAllEntries();
        initForm();
        initCharts();
        updateUIText();
        
        // 5. Connection check starten
        connectionCheckInterval = setInterval(checkConnection, 30000);
    } catch (err) {
        console.error('App initialization error:', err);
    }
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
        allEntries = await fetch(apiUrl('/api/health?limit=1000')).then(r => r.json());
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
    
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active', 'text-emerald-500');
        el.classList.add('text-gray-400');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.remove('text-gray-400');
    
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
    loadStepsChart(7);
    loadSleepChart();
    loadHRChart();
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
    const colors = getChartColors();
    const data = await fetch(apiUrl(`/api/health/chart/schritte?days=${days}`)).then(r => r.json());
    
    const ctx = document.getElementById('stepsChart').getContext('2d');
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
}

async function loadSleepChart() {
    const colors = getChartColors();
    const data = await fetch(apiUrl('/api/health/chart/schlaf_stunden?days=30')).then(r => r.json());
    
    const ctx = document.getElementById('sleepChart').getContext('2d');
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
}

async function loadHRChart() {
    const colors = getChartColors();
    const dataRest = await fetch(apiUrl('/api/health/chart/herzfrequenz_ruhe?days=30')).then(r => r.json());
    const dataAvg = await fetch(apiUrl('/api/health/chart/herzfrequenz_avg?days=30')).then(r => r.json());
    
    const ctx = document.getElementById('hrChart').getContext('2d');
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
                res = await fetch(apiUrl(`/api/health/${editingEntryId}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                res = await fetch(apiUrl('/api/health'), {
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
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-semibold text-gray-800 dark:text-gray-200">${formatDate(entry.datum)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${entry.notizen || ''}</div>
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
            document.querySelector('#entry-form button[type="submit"]').textContent = '💾 ' + t('form.update');
            
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
    document.querySelector('#entry-form button[type="submit"]').textContent = '💾 ' + t('form.save');
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
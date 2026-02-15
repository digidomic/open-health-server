// API Configuration
// Backend läuft auf Port 8000, egal ob localhost oder IP
const API_BASE = `http://${window.location.hostname}:8000`;

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const AUTH_TOKEN = urlParams.get('token');

if (!AUTH_TOKEN) {
    alert('Fehlender Auth Token! Bitte URL mit ?token=... aufrufen.');
}

// Helper function to add token to URL
function apiUrl(path) {
    const separator = path.includes('?') ? '&' : '?';
    return `${API_BASE}${path}${separator}token=${AUTH_TOKEN}`;
}

// Chart instances
let stepsChart, sleepChart, hrChart;

// Chart colors for dark/light mode
function getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
        gridColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
        textColor: isDark ? '#e5e7eb' : '#6b7280',
        titleColor: isDark ? '#f3f4f6' : '#1f2937'
    };
}

// Global entries data for navigation
let allEntries = [];
let currentEntryIndex = 0;
let editingEntryId = null; // Track if we're editing an existing entry
let currentUsername = 'User';

// Helper functions for time conversion
function decimalToTimeString(decimal) {
    if (!decimal && decimal !== 0) return '-';
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function timeStringToDecimal(timeStr) {
    if (!timeStr) return 0;
    // Handle both "9:30" and "9.5" formats
    if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + (minutes / 60);
    }
    return parseFloat(timeStr);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initDate();
    initDarkMode();
    await loadUserInfo(); // Wait for user info first
    loadAllEntries();
    initForm();
    initCharts();
});

// Load user info
async function loadUserInfo() {
    try {
        const user = await fetch(apiUrl('/api/user/me')).then(r => r.json());
        currentUsername = user.username;
        
        // Set greeting with name
        const greetingEl = document.getElementById('greeting');
        const nameEl = document.getElementById('greeting-name');
        
        if (greetingEl && nameEl) {
            nameEl.textContent = `Hallo ${currentUsername}! 👋`;
            // Fade in
            greetingEl.style.opacity = '1';
        }
    } catch (err) {
        console.error('Error loading user info:', err);
        // Fallback greeting
        const greetingEl = document.getElementById('greeting');
        const nameEl = document.getElementById('greeting-name');
        if (greetingEl && nameEl) {
            nameEl.textContent = 'Hallo! 👋';
            greetingEl.style.opacity = '1';
        }
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
    // Reload charts with new colors
    initCharts();
}

function updateDarkModeIcons(isDark) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    if (sunIcon && moonIcon) {
        if (isDark) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }
}

// Load entry for editing
async function loadEntryForEdit(date) {
    try {
        const entry = await fetch(apiUrl(`/api/health/date/${date}`)).then(r => r.json());
        
        if (entry) {
            editingEntryId = entry.id;
            
            // Populate form with existing data
            document.getElementById('input-datum').value = entry.datum;
            document.getElementById('input-schritte').value = entry.schritte || '';
            document.getElementById('input-schlaf').value = decimalToTimeString(entry.schlaf_stunden).replace(':', ':');
            document.getElementById('input-schlaf-index').value = entry.schlaf_index || '';
            document.getElementById('input-gewicht').value = entry.gewicht || '';
            document.getElementById('input-hf-ruhe').value = entry.herzfrequenz_ruhe || '';
            document.getElementById('input-hf-avg').value = entry.herzfrequenz_avg || '';
            document.getElementById('input-energie').value = entry.aktivitaetsenergie || '';
            document.getElementById('input-training').value = entry.training_minuten || '';
            document.getElementById('input-notizen').value = entry.notizen || '';
            
            // Change form title and button
            document.querySelector('#add-view h2').textContent = 'Eintrag bearbeiten';
            document.querySelector('#entry-form button[type="submit"]').textContent = '💾 Aktualisieren';
            
            // Switch to add/edit view
            showView('add');
        }
    } catch (err) {
        console.error('Error loading entry for edit:', err);
        showToast('❌ Fehler beim Laden');
    }
}

// Reset form to "add new" mode
function resetForm() {
    editingEntryId = null;
    document.getElementById('entry-form').reset();
    document.getElementById('input-datum').value = new Date().toISOString().split('T')[0];
    document.getElementById('input-schlaf').value = '';
    document.querySelector('#add-view h2').textContent = 'Neuer Eintrag';
    document.querySelector('#entry-form button[type="submit"]').textContent = '💾 Speichern';
}

function initDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date').textContent = today.toLocaleDateString('de-DE', options);
    document.getElementById('input-datum').value = today.toISOString().split('T')[0];
}

// Load all entries for navigation
async function loadAllEntries() {
    try {
        allEntries = await fetch(apiUrl('/api/health?limit=1000')).then(r => r.json());
        // Sort by date descending (newest first)
        allEntries.sort((a, b) => new Date(b.datum) - new Date(a.datum));
        
        if (allEntries.length > 0) {
            currentEntryIndex = 0; // Start with the latest entry
            displayEntry(currentEntryIndex);
            updateNavigationButtons();
        } else {
            // No entries - show default dashboard
            initDashboard();
        }
    } catch (err) {
        console.error('Error loading entries:', err);
        initDashboard();
    }
}

// Display a specific entry by index
function displayEntry(index) {
    const entry = allEntries[index];
    if (!entry) return;
    
    // Update date display
    const date = new Date(entry.datum);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date').textContent = date.toLocaleDateString('de-DE', options);
    
    // Update stat cards
    document.getElementById('steps-value').textContent = entry.schritte?.toLocaleString() || '-';
    document.getElementById('sleep-value').textContent = decimalToTimeString(entry.schlaf_stunden);
    document.getElementById('hr-value').textContent = entry.herzfrequenz_ruhe || '-';
    document.getElementById('energy-value').textContent = entry.aktivitaetsenergie?.toLocaleString() || '-';
    
    // Load stats from all entries for the stats section
    loadStats();
}

// Navigate to previous/next day
function navigateDay(direction) {
    const newIndex = currentEntryIndex + direction;
    
    // Check if the new index is valid
    if (newIndex >= 0 && newIndex < allEntries.length) {
        currentEntryIndex = newIndex;
        displayEntry(currentEntryIndex);
        updateNavigationButtons();
    }
}

// Update navigation button states
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-day-btn');
    const nextBtn = document.getElementById('next-day-btn');
    
    // Previous button: disabled if we're at the last entry (oldest)
    prevBtn.disabled = currentEntryIndex >= allEntries.length - 1;
    
    // Next button: disabled if we're at the first entry (newest)
    nextBtn.disabled = currentEntryIndex <= 0;
}

// Load stats (30-day average)
async function loadStats() {
    try {
        const stats = await fetch(apiUrl('/api/health/stats?days=30')).then(r => r.json());
        document.getElementById('avg-steps').textContent = stats.avg_schritte?.toLocaleString() || '-';
        document.getElementById('avg-sleep').textContent = decimalToTimeString(stats.avg_schlaf_stunden);
        document.getElementById('avg-hr').textContent = stats.avg_herzfrequenz_ruhe + ' bpm' || '-';
        document.getElementById('avg-weight').textContent = stats.avg_gewicht + ' kg' || '-';
        document.getElementById('avg-training').textContent = Math.round(stats.avg_training_minuten * 7) + ' min' || '-';
        
        // Trends
        updateTrend('steps-trend', stats.trend_schritte);
        updateTrend('sleep-trend', stats.trend_schlaf);
    } catch (err) {
        console.error('Stats error:', err);
    }
}

// View Navigation
function showView(viewName) {
    // Hide all views
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('add-view').classList.add('hidden');
    document.getElementById('history-view').classList.add('hidden');
    
    // Show selected view
    document.getElementById(viewName + '-view').classList.remove('hidden');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active', 'text-emerald-500');
        el.classList.add('text-gray-400');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.remove('text-gray-400');
    
    // Special handling
    if (viewName === 'history') {
        loadHistory(7);
    }
}

// Dashboard - Fallback when no entries
async function initDashboard() {
    try {
        // Load latest entry
        const latest = await fetch(apiUrl('/api/health/latest')).then(r => r.json());
        if (latest) {
            document.getElementById('steps-value').textContent = latest.schritte?.toLocaleString() || '-';
            document.getElementById('sleep-value').textContent = latest.schlaf_stunden || '-';
            document.getElementById('hr-value').textContent = latest.herzfrequenz_ruhe || '-';
            document.getElementById('energy-value').textContent = latest.aktivitaetsenergie?.toLocaleString() || '-';
        }
        
        // Load stats
        loadStats();
        
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

function updateTrend(elementId, trend) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (trend === 'up') {
        el.innerHTML = '↗️ Steigend';
        el.className = 'text-xs text-white';
    } else if (trend === 'down') {
        el.innerHTML = '↘️ Fallend';
        el.className = 'text-xs text-white';
    } else {
        el.innerHTML = '➡️ Stabil';
        el.className = 'text-xs opacity-80';
    }
}

// Charts
async function initCharts() {
    await loadStepsChart(7);
    await loadSleepChart();
    await loadHrChart();
}

async function loadStepsChart(days) {
    const data = await fetch(apiUrl(`/api/health/chart/schritte?days=${days}`)).then(r => r.json());
    const colors = getChartColors();
    
    const ctx = document.getElementById('stepsChart').getContext('2d');
    
    if (stepsChart) stepsChart.destroy();
    
    stepsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels.slice(-days).map(d => d.slice(5)),
            datasets: [{
                label: 'Schritte',
                data: data.values.slice(-days),
                backgroundColor: '#10b981',
                borderRadius: 6,
                borderSkipped: false
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
                    beginAtZero: true, 
                    grid: { color: colors.gridColor },
                    ticks: { color: colors.textColor }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: colors.textColor }
                }
            }
        }
    });
}

async function loadSleepChart() {
    const data = await fetch(apiUrl('/api/health/chart/schlaf_stunden?days=30')).then(r => r.json());
    const colors = getChartColors();
    
    const ctx = document.getElementById('sleepChart').getContext('2d');
    
    if (sleepChart) sleepChart.destroy();
    
    sleepChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels.map(d => d.slice(5)),
            datasets: [{
                label: 'Schlaf (h)',
                data: data.values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHitRadius: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    beginAtZero: true, 
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

async function loadHrChart() {
    const ruhe = await fetch(apiUrl('/api/health/chart/herzfrequenz_ruhe?days=30')).then(r => r.json());
    const avg = await fetch(apiUrl('/api/health/chart/herzfrequenz_avg?days=30')).then(r => r.json());
    const colors = getChartColors();
    
    const ctx = document.getElementById('hrChart').getContext('2d');
    
    if (hrChart) hrChart.destroy();
    
    hrChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ruhe.labels.map(d => d.slice(5)),
            datasets: [
                {
                    label: 'Ruhe',
                    data: ruhe.values,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'Ø',
                    data: avg.values,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true,
                    position: 'top',
                    align: 'end',
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
document.getElementById('steps-range')?.addEventListener('change', (e) => {
    loadStepsChart(parseInt(e.target.value));
});

// Form
function initForm() {
    document.getElementById('entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            datum: document.getElementById('input-datum').value,
            schritte: parseInt(document.getElementById('input-schritte').value) || 0,
            schlaf_stunden: timeStringToDecimal(document.getElementById('input-schlaf').value),
            schlaf_index: parseFloat(document.getElementById('input-schlaf-index').value) || 0,
            herzfrequenz_ruhe: parseInt(document.getElementById('input-hf-ruhe').value) || 0,
            herzfrequenz_avg: parseInt(document.getElementById('input-hf-avg').value) || 0,
            gewicht: parseFloat(document.getElementById('input-gewicht').value) || 0,
            aktivitaetsenergie: parseInt(document.getElementById('input-energie').value) || 0,
            training_minuten: parseInt(document.getElementById('input-training').value) || 0,
            notizen: document.getElementById('input-notizen').value
        };
        
        try {
            let res;
            
            if (editingEntryId) {
                // Update existing entry
                res = await fetch(apiUrl(`/api/health/${editingEntryId}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                // Create new entry
                res = await fetch(apiUrl('/api/health'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            if (res.ok) {
                showToast(editingEntryId ? '✅ Aktualisiert!' : '✅ Gespeichert!');
                resetForm();
                // Reload all entries to include the new/updated one
                await loadAllEntries();
                initCharts();
            } else {
                const error = await res.text();
                showToast('❌ Fehler: ' + error);
            }
        } catch (err) {
            showToast('❌ Verbindungsfehler');
            console.error(err);
        }
    });
}

// History
async function loadHistory(days) {
    // Update filter buttons
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
                    <p>Keine Einträge vorhanden</p>
                </div>
            `;
            return;
        }
        
        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100';
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-semibold text-gray-800">${formatDate(entry.datum)}</div>
                        <div class="text-xs text-gray-500">${entry.notizen || 'Keine Notizen'}</div>
                    </div>
                    <button onclick="loadEntryForEdit('${entry.datum}')" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors" title="Bearbeiten">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                </div>
                <div class="grid grid-cols-5 gap-2 text-xs">
                    <div class="bg-emerald-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${entry.schritte?.toLocaleString()}</div>
                        <div class="opacity-80">Schritte</div>
                    </div>
                    <div class="bg-blue-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${decimalToTimeString(entry.schlaf_stunden)}</div>
                        <div class="opacity-80">Schlaf</div>
                    </div>
                    <div class="bg-purple-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${entry.herzfrequenz_ruhe}</div>
                        <div class="opacity-80">HF</div>
                    </div>
                    <div class="bg-orange-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${entry.gewicht}</div>
                        <div class="opacity-80">Körpergewicht in Kg</div>
                    </div>
                    <div class="bg-amber-500 rounded-lg p-2 text-center text-white">
                        <div class="font-semibold">${entry.training_minuten}</div>
                        <div class="opacity-80">Minuten Training</div>
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
    return date.toLocaleDateString('de-DE', options);
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

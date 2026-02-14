// SimplePro MEP Productivity Tracker - Complete Application

// ========== STATE MANAGEMENT ==========
let state = {
    currentScreen: 'homeScreen',
    currentDate: new Date().toISOString().split('T')[0],
    reportDate: new Date().toISOString().split('T')[0],
    selectedWorkers: [],
    selectedActivity: null,
    lastSavedTask: null,
    tasks: [],
    leaderboardSortBy: 'high', // high or low
    companyData: {
        projectName: 'Al Barsha Mall Project',
        standardHours: 8,
        overtimeHours: 2,
        skilledRate: 14,
        helperRate: 10.5,
        locations: ['First Floor', 'Second Floor', 'Security Room', 'External - North Wing', 'Basement'],
        trades: ['Plumbing', 'Ducting', 'HVAC', 'Chilled Water', 'Electrical']
    },
    workers: [...WORKERS],
    productivityRates: [...DATA],
    editingTaskId: null
};

// ========== INITIALIZE APP ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('SimplePro MEP initializing...');
    loadStateFromStorage();
    initializeApp();
    setupEventListeners();
    updateHomeScreen();
    console.log('SimplePro MEP ready!');
});

function initializeApp() {
    document.getElementById('currentDate').textContent = formatDateFull(new Date());
    document.getElementById('taskDate').valueAsDate = new Date();
    document.getElementById('reportDate').textContent = formatDateShort(new Date(state.reportDate));
    
    updateCompanyDataDisplay();
    populateLocations();
    populateTrades();
    renderAvailableWorkers();
}

function updateCompanyDataDisplay() {
    document.getElementById('projectName').textContent = state.companyData.projectName;
    document.getElementById('displayProjectName').textContent = state.companyData.projectName;
    document.getElementById('displayStandardHours').textContent = `${state.companyData.standardHours} hrs/day`;
    document.getElementById('displayOvertimeHours').textContent = `${state.companyData.overtimeHours} hrs/day`;
    document.getElementById('displayMaxHours').textContent = `${state.companyData.standardHours + state.companyData.overtimeHours} hrs/day`;
    document.getElementById('displaySkilledRate').textContent = `AED ${state.companyData.skilledRate}/hr`;
    document.getElementById('displayHelperRate').textContent = `AED ${state.companyData.helperRate}/hr`;
    document.getElementById('displayWorkersCount').textContent = state.workers.length;
    document.getElementById('displayRatesCount').textContent = state.productivityRates.filter(r => r.activity).length;
}

// ========== STORAGE ==========
function loadStateFromStorage() {
    try {
        const saved = localStorage.getItem('simplePro_state');
        if (saved) {
            const loaded = JSON.parse(saved);
            state.tasks = loaded.tasks || [];
            state.companyData = loaded.companyData || state.companyData;
            state.workers = loaded.workers || state.workers;
            state.productivityRates = loaded.productivityRates || state.productivityRates;
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

function saveStateToStorage() {
    try {
        localStorage.setItem('simplePro_state', JSON.stringify({
            tasks: state.tasks,
            companyData: state.companyData,
            workers: state.workers,
            productivityRates: state.productivityRates
        }));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// ========== NAVIGATION ==========
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
    });
    
    document.getElementById('createTaskForm').addEventListener('submit', handleSaveTask);
    document.getElementById('shareTaskBtn').addEventListener('click', handleShareTask);
    
    const mainActivityInput = document.getElementById('mainActivity');
    mainActivityInput.addEventListener('input', handleMainActivitySearch);
    mainActivityInput.addEventListener('focus', showAllMainActivities);
    
    document.getElementById('activity').addEventListener('change', handleActivityChange);
    document.getElementById('workerSearch').addEventListener('input', handleWorkerSearch);
    document.getElementById('hours').addEventListener('input', calculateTarget);
    
    document.getElementById('prevDate').addEventListener('click', () => navigateDate(-1));
    document.getElementById('nextDate').addEventListener('click', () => navigateDate(1));
    document.getElementById('statusFilter').addEventListener('change', loadReports);
    document.getElementById('calendarBtn').addEventListener('click', () => {
        const picker = document.getElementById('reportDatePicker');
        picker.value = state.reportDate;
        picker.style.display = 'block';
        picker.click();
        picker.addEventListener('change', function() { 
            handleDatePick(this.value); 
            this.style.display = 'none'; 
        }, { once: true });
    });
    
    document.getElementById('workersScreenSearch').addEventListener('input', handleWorkersScreenSearch);
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.screen === screenId) btn.classList.add('active');
    });
    
    if (screenId === 'homeScreen') updateHomeScreen();
    else if (screenId === 'createScreen' && !state.editingTaskId) {
        // Only reset if NOT in edit mode
        resetCreateForm();
    }
    else if (screenId === 'reportsScreen') loadReports();
    else if (screenId === 'workersScreen') loadWorkersScreen();
    else if (screenId === 'settingsScreen') updateCompanyDataDisplay();
    else if (screenId === 'calculatorScreen') initCalculator();
    
    state.currentScreen = screenId;
}

// ========== CALCULATOR ==========
let calcSelectedActivity = null;

function initCalculator() {
    const mainActivityInput = document.getElementById('calcMainActivity');
    mainActivityInput.addEventListener('input', handleCalcMainActivitySearch);
    mainActivityInput.addEventListener('focus', showCalcAllMainActivities);
    
    document.getElementById('calcActivity').addEventListener('change', handleCalcActivityChange);
    document.getElementById('calcSkilledWorkers').addEventListener('input', calculateCalcTarget);
    document.getElementById('calcHelpers').addEventListener('input', calculateCalcTarget);
    document.getElementById('calcHours').addEventListener('input', calculateCalcTarget);
}

function showCalcAllMainActivities() {
    renderCalcMainActivitySuggestions(getMainActivities());
}

function handleCalcMainActivitySearch(e) {
    const query = e.target.value.toLowerCase();
    const activities = getMainActivities().filter(a => a.toLowerCase().includes(query));
    renderCalcMainActivitySuggestions(activities);
}

function renderCalcMainActivitySuggestions(activities) {
    const container = document.getElementById('calcMainActivitySuggestions');
    if (activities.length === 0 || !document.getElementById('calcMainActivity').value) {
        container.innerHTML = '';
        return;
    }
    
    const html = activities.map(activity => 
        `<div class="suggestion-item" onclick="selectCalcMainActivity(\`${activity.replace(/`/g, '\\`')}\`)">${activity}</div>`
    ).join('');
    
    container.innerHTML = `<div class="suggestions-list">${html}</div>`;
}

function selectCalcMainActivity(category) {
    document.getElementById('calcMainActivity').value = category;
    document.getElementById('calcMainActivitySuggestions').innerHTML = '';
    populateCalcActivities(category);
}

function populateCalcActivities(category) {
    const activitySelect = document.getElementById('calcActivity');
    const activities = state.productivityRates.filter(d => d.category === category && d.activity);
    
    activitySelect.innerHTML = '<option value="">Select activity...</option>' +
        activities.map(a => `<option value="${a.activity}">${a.activity}</option>`).join('');
    
    activitySelect.classList.add('placeholder');
}

function handleCalcActivityChange(e) {
    const activity = e.target.value;
    const category = document.getElementById('calcMainActivity').value;
    
    if (activity) {
        e.target.classList.remove('placeholder');
        const row = state.productivityRates.find(d => d.category === category && d.activity === activity);
        calcSelectedActivity = row;
        calculateCalcTarget();
    } else {
        e.target.classList.add('placeholder');
        calcSelectedActivity = null;
    }
}

function calculateCalcTarget() {
    if (!calcSelectedActivity) {
        document.getElementById('calcTargetQuantity').textContent = '—';
        return;
    }
    
    const skilled = parseInt(document.getElementById('calcSkilledWorkers').value) || 0;
    const helpers = parseInt(document.getElementById('calcHelpers').value) || 0;
    const hours = parseFloat(document.getElementById('calcHours').value) || 0;
    
    if (hours <= 0) {
        document.getElementById('calcTargetQuantity').textContent = '—';
        return;
    }
    
    const rate = calcSelectedActivity.rate;
    const target = ((skilled * state.companyData.skilledRate) + (helpers * state.companyData.helperRate)) * hours / rate;
    
    document.getElementById('calcTargetQuantity').textContent = 
        `${formatNumber(target)} ${calcSelectedActivity.unit}`;
}

function calculateProductivity() {
    if (!calcSelectedActivity) {
        showToast('⚠️ Please select an activity');
        return;
    }
    
    const skilled = parseInt(document.getElementById('calcSkilledWorkers').value) || 0;
    const helpers = parseInt(document.getElementById('calcHelpers').value) || 0;
    const hours = parseFloat(document.getElementById('calcHours').value) || 0;
    
    if (skilled === 0 && helpers === 0) {
        showToast('⚠️ Please add at least one worker');
        return;
    }
    
    if (hours <= 0) {
        showToast('⚠️ Please enter working hours');
        return;
    }
    
    calculateCalcTarget();
    showToast('✓ Target calculated!');
}

function resetCalculator() {
    document.getElementById('calculatorForm').reset();
    document.getElementById('calcSkilledWorkers').value = '0';
    document.getElementById('calcHelpers').value = '0';
    document.getElementById('calcHours').value = '8';
    document.getElementById('calcActivity').classList.add('placeholder');
    document.getElementById('calcTargetQuantity').textContent = '—';
    document.getElementById('calcMainActivitySuggestions').innerHTML = '';
    calcSelectedActivity = null;
}

// ========== HOME SCREEN ==========
let homeSortBy = 'default'; // default, taskId, trade, teamName

function updateHomeScreen() {
    let todayTasks = state.tasks.filter(t => t.date === state.currentDate);
    
    // Apply sorting
    if (homeSortBy === 'taskId') {
        todayTasks.sort((a, b) => a.taskIdentifier.localeCompare(b.taskIdentifier));
    } else if (homeSortBy === 'trade') {
        todayTasks.sort((a, b) => a.trade.localeCompare(b.trade));
    } else if (homeSortBy === 'teamName') {
        todayTasks.sort((a, b) => a.teamName.localeCompare(b.teamName));
    }
    
    document.getElementById('activeTasks').textContent = todayTasks.length;
    const uniqueTeams = new Set(todayTasks.map(t => t.teamName));
    document.getElementById('activeTeams').textContent = uniqueTeams.size;
    
    const completed = todayTasks.filter(t => t.status === 'completed');
    const pending = todayTasks.filter(t => t.status === 'pending');
    document.getElementById('completedTasks').textContent = completed.length;
    document.getElementById('pendingTasks').textContent = pending.length;
    
    const tasksList = document.getElementById('recentTasksList');
    if (todayTasks.length === 0) {
        tasksList.innerHTML = '<div class="empty-state"><p>No tasks for today</p><p class="empty-hint">Create a task to get started</p></div>';
    } else {
        tasksList.innerHTML = todayTasks.map(task => renderTaskCard(task, 'home')).join('');
    }
}

function showHomeSortMenu() {
    const html = `
        <div class="sort-menu-item ${homeSortBy === 'default' ? 'active' : ''}" onclick="sortHomeBy('default')">
            Default Order
        </div>
        <div class="sort-menu-item ${homeSortBy === 'taskId' ? 'active' : ''}" onclick="sortHomeBy('taskId')">
            Sort by Task ID
        </div>
        <div class="sort-menu-item ${homeSortBy === 'trade' ? 'active' : ''}" onclick="sortHomeBy('trade')">
            Sort by Trade
        </div>
        <div class="sort-menu-item ${homeSortBy === 'teamName' ? 'active' : ''}" onclick="sortHomeBy('teamName')">
            Sort by Team Name
        </div>
    `;
    
    showModal('Sort Tasks', html);
}

function sortHomeBy(sortType) {
    homeSortBy = sortType;
    updateHomeScreen();
    closeGenericModal();
    showToast(`Sorted by ${sortType === 'default' ? 'default order' : sortType === 'taskId' ? 'Task ID' : sortType === 'trade' ? 'Trade' : 'Team Name'}`);
}

function renderTaskCard(task, context = 'home') {
    const workers = task.workers || [];
    const skilled = workers.filter(w => w.type === 'skilled').length;
    const helpers = workers.filter(w => w.type === 'helper').length;
    
    let statusHtml = '';
    if (task.status === 'completed' && task.productivity) {
        let prodColor = task.productivity >= 100 ? '#2b8a3e' : task.productivity >= 90 ? '#d9730d' : '#d63031';
        let prodBg = task.productivity >= 100 ? '#d4f8d4' : task.productivity >= 90 ? '#ffe8cc' : '#ffd4d4';
        statusHtml = `
            <div class="task-card-status completed">
                <span>Completed</span>
                <span style="background:${prodBg}; color:${prodColor}; padding:2px 8px; border-radius:6px; font-weight:700;">${Math.round(task.productivity)}%</span>
            </div>`;
    } else {
        statusHtml = `<div class="task-card-status pending">⏳ In Progress</div>`;
    }
    
    const onclick = context === 'reports' 
        ? `openTrackModal('${task.id}')` 
        : `editTask('${task.id}')`;
    
    return `
        <div class="task-card" onclick="${onclick}">
            <div class="task-card-name">${task.taskName}</div>
            <div class="task-card-row">${task.taskIdentifier}</div>
            <div class="task-card-row">${task.trade}</div>
            <div class="task-card-row bold">${task.teamName}</div>
            <div class="task-card-row">${skilled} Skilled ${helpers > 0 ? '• ' + helpers + ' Helper' : ''}</div>
            <div class="task-card-row bold">${task.targetQuantity ? formatNumber(task.targetQuantity) + ' ' + task.unit : '—'}</div>
            ${statusHtml}
        </div>
    `;
}

// Continue in next message due to length...

// ========== CREATE TASK ==========
function resetCreateForm() {
    document.getElementById('createTaskForm').reset();
    document.getElementById('taskDate').valueAsDate = new Date();
    
    const todayTasks = state.tasks.filter(t => t.date === state.currentDate);
    const nextNum = todayTasks.length + 1;
    document.getElementById('taskId').value = `Task-${String(nextNum).padStart(2, '0')}`;
    
    state.selectedWorkers = [];
    state.selectedActivity = null;
    state.editingTaskId = null;
    document.getElementById('targetQuantity').textContent = '—';
    updateSelectedWorkersDisplay();
    renderAvailableWorkers();
    
    document.getElementById('shareTaskBtn').disabled = true;
    document.getElementById('saveTaskBtn').textContent = 'Save Task';
    document.getElementById('cancelEditBtn').style.display = 'none';
    state.lastSavedTask = null;
    clearAllErrors();
}

function editTask(taskId) {
    console.log('=== EDIT TASK CALLED ===');
    console.log('Task ID to edit:', taskId);
    console.log('All task IDs:', state.tasks.map(t => ({ id: t.id, identifier: t.taskIdentifier })));
    
    const task = state.tasks.find(t => t.id === taskId);
    
    if (!task) {
        console.error('Task not found with ID:', taskId);
        showToast('⚠️ Task not found');
        return;
    }
    
    if (task.status === 'completed') {
        showToast('Cannot edit completed tasks');
        return;
    }
    
    console.log('Found task to edit:', task);
    state.editingTaskId = taskId;
    console.log('Set state.editingTaskId to:', state.editingTaskId);
    
    switchScreen('createScreen');
    
    document.getElementById('taskDate').value = task.date;
    document.getElementById('taskId').value = task.taskIdentifier;
    document.getElementById('teamName').value = task.teamName;
    document.getElementById('taskName').value = task.taskName;
    document.getElementById('location').value = task.location;
    document.getElementById('trade').value = task.trade;
    document.getElementById('mainActivity').value = task.mainActivity;
    
    populateActivities(task.mainActivity);
    setTimeout(() => {
        document.getElementById('activity').value = task.activity;
        document.getElementById('activity').classList.remove('placeholder');
    }, 100);
    
    state.selectedWorkers = task.workers.map(w => w.id);
    state.selectedActivity = state.productivityRates.find(r => 
        r.category === task.mainActivity && r.activity === task.activity
    );
    
    document.getElementById('hours').value = task.hours;
    
    updateSelectedWorkersDisplay();
    renderAvailableWorkers();
    calculateTarget();
    
    // Update UI for editing mode
    document.getElementById('saveTaskBtn').textContent = 'Save Changes';
    document.getElementById('cancelEditBtn').style.display = 'block';
    document.getElementById('shareTaskBtn').disabled = true;
    
    console.log('=== EDIT MODE ACTIVATED ===');
    showToast('Editing task...');
}

function cancelEdit() {
    if (confirm('Cancel editing? Unsaved changes will be lost.')) {
        // Clear editing state first
        state.editingTaskId = null;
        
        if (state.returnToWorkersScreen) {
            state.returnToWorkersScreen = false;
            switchScreen('workersScreen');
        } else {
            switchScreen('homeScreen');
        }
        showToast('Edit cancelled');
    }
}

function populateLocations() {
    const locationSelect = document.getElementById('location');
    const locationFilter = document.getElementById('locationFilter');
    
    locationSelect.innerHTML = '<option value="">Select location...</option>' +
        state.companyData.locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    
    locationFilter.innerHTML = '<option value="">All Locations</option>' +
        state.companyData.locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
}

function populateTrades() {
    const tradeSelect = document.getElementById('trade');
    tradeSelect.innerHTML = '<option value="">Select trade...</option>' +
        state.companyData.trades.map(t => `<option value="${t}">${t}</option>`).join('');
}

// ========== MAIN ACTIVITY ==========
function getMainActivities() {
    const categories = state.productivityRates
        .filter(d => d.category && d.activity)
        .map(d => d.category);
    return [...new Set(categories)].sort();
}

function showAllMainActivities() {
    renderMainActivitySuggestions(getMainActivities());
}

function handleMainActivitySearch(e) {
    const query = e.target.value.toLowerCase();
    const activities = getMainActivities().filter(a => a.toLowerCase().includes(query));
    renderMainActivitySuggestions(activities);
}

function renderMainActivitySuggestions(activities) {
    const container = document.getElementById('mainActivitySuggestions');
    if (activities.length === 0 || !document.getElementById('mainActivity').value) {
        container.innerHTML = '';
        return;
    }
    
    const html = activities.map(activity => 
        `<div class="suggestion-item" onclick="selectMainActivity(\`${activity.replace(/`/g, '\\`')}\`)">${activity}</div>`
    ).join('');
    
    container.innerHTML = `<div class="suggestions-list">${html}</div>`;
}

function selectMainActivity(category) {
    document.getElementById('mainActivity').value = category;
    document.getElementById('mainActivitySuggestions').innerHTML = '';
    populateActivities(category);
}

function populateActivities(category) {
    const activitySelect = document.getElementById('activity');
    const activities = state.productivityRates.filter(d => d.category === category && d.activity);
    
    activitySelect.innerHTML = '<option value="">Select activity...</option>' +
        activities.map(a => `<option value="${a.activity}">${a.activity}</option>`).join('');
    
    activitySelect.classList.add('placeholder');
}

function handleActivityChange(e) {
    const activity = e.target.value;
    const category = document.getElementById('mainActivity').value;
    
    if (activity) {
        e.target.classList.remove('placeholder');
        const row = state.productivityRates.find(d => d.category === category && d.activity === activity);
        state.selectedActivity = row;
        calculateTarget();
    } else {
        e.target.classList.add('placeholder');
        state.selectedActivity = null;
    }
}

// ========== WORKERS SELECTION ==========
function handleWorkerSearch(e) {
    renderAvailableWorkers(e.target.value);
}

function renderAvailableWorkers(searchQuery = '') {
    let workers = state.workers;
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        workers = workers.filter(w => 
            w.name.toLowerCase().includes(q) || 
            w.id.toString().includes(q) ||
            w.occupation.toLowerCase().includes(q)
        );
    }
    
    // Filter out already selected workers
    workers = workers.filter(w => !state.selectedWorkers.includes(w.id));
    
    const taskDate = document.getElementById('taskDate').value;
    const maxHours = state.companyData.standardHours + state.companyData.overtimeHours;
    
    const container = document.getElementById('availableWorkersList');
    if (workers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No workers available</p></div>';
        return;
    }
    
    container.innerHTML = workers.map(worker => {
        const status = getWorkerStatus(worker.id, taskDate, maxHours, state.editingTaskId, state.tasks);
        const isOverbooked = status.status === 'overbooked';
        const overbookedClass = isOverbooked ? 'overbooked' : '';
        
        return `
            <div class="worker-item ${overbookedClass}" onclick="addWorker(${worker.id})">
                <div class="worker-icon add">➕</div>
                <div class="worker-info">
                    <div class="worker-name">${worker.name}</div>
                    <div class="worker-details">${worker.id} • ${worker.occupation}</div>
                </div>
                <span class="worker-badge">${worker.type}</span>
                ${isOverbooked ? '<span class="worker-status overbooked">🔴 ' + status.used + '/' + status.max + ' hrs</span>' : 
                                '<span class="worker-status available">' + status.available + ' hrs</span>'}
            </div>
        `;
    }).join('');
}

function addWorker(workerId) {
    if (!state.selectedWorkers.includes(workerId)) {
        state.selectedWorkers.push(workerId);
        updateSelectedWorkersDisplay();
        renderAvailableWorkers(document.getElementById('workerSearch').value);
        calculateTarget();
    }
}

function removeWorker(workerId) {
    state.selectedWorkers = state.selectedWorkers.filter(id => id !== workerId);
    updateSelectedWorkersDisplay();
    renderAvailableWorkers(document.getElementById('workerSearch').value);
    calculateTarget();
}

function updateSelectedWorkersDisplay() {
    const section = document.getElementById('selectedWorkersSection');
    const container = document.getElementById('selectedWorkersList');
    
    if (state.selectedWorkers.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    const workers = state.selectedWorkers.map(id => {
        const worker = state.workers.find(w => w.id === id);
        return worker;
    }).filter(w => w);
    
    const skilled = workers.filter(w => w.type === 'skilled').length;
    const helpers = workers.filter(w => w.type === 'helper').length;
    
    document.getElementById('selectedCount').textContent = `Skilled: ${skilled}, Helper: ${helpers}`;
    
    container.innerHTML = workers.map(worker => `
        <div class="worker-item" onclick="removeWorker(${worker.id})">
            <div class="worker-icon remove">➖</div>
            <div class="worker-info">
                <div class="worker-name">${worker.name}</div>
                <div class="worker-details">${worker.id} • ${worker.occupation}</div>
            </div>
            <span class="worker-badge">${worker.type}</span>
        </div>
    `).join('');
}

// ========== TARGET CALCULATION ==========
function calculateTarget() {
    if (!state.selectedActivity || state.selectedWorkers.length === 0) {
        document.getElementById('targetQuantity').textContent = '—';
        return;
    }
    
    const hours = parseFloat(document.getElementById('hours').value) || 0;
    if (hours <= 0) {
        document.getElementById('targetQuantity').textContent = '—';
        return;
    }
    
    const workers = state.selectedWorkers.map(id => state.workers.find(w => w.id === id)).filter(w => w);
    const skilled = workers.filter(w => w.type === 'skilled').length;
    const helpers = workers.filter(w => w.type === 'helper').length;
    
    const rate = state.selectedActivity.rate;
    const target = ((skilled * state.companyData.skilledRate) + (helpers * state.companyData.helperRate)) * hours / rate;
    
    document.getElementById('targetQuantity').textContent = 
        `${formatNumber(target)} ${state.selectedActivity.unit}`;
}

// Continue...

// ========== VALIDATION & SAVE ==========
function validateForm() {
    clearAllErrors();
    const errors = [];
    
    if (!document.getElementById('taskId').value.trim()) {
        showFieldError('taskId', 'Task ID is required');
        errors.push('taskId');
    }
    if (!document.getElementById('teamName').value.trim()) {
        showFieldError('teamName', 'Team name is required');
        errors.push('teamName');
    }
    if (!document.getElementById('taskName').value.trim()) {
        showFieldError('taskName', 'Task name is required');
        errors.push('taskName');
    }
    if (!document.getElementById('location').value) {
        showFieldError('location', 'Please select a location');
        errors.push('location');
    }
    if (!document.getElementById('trade').value) {
        showFieldError('trade', 'Please select a trade');
        errors.push('trade');
    }
    if (!document.getElementById('mainActivity').value.trim()) {
        showFieldError('mainActivity', 'Please select a main activity');
        errors.push('mainActivity');
    }
    if (!document.getElementById('activity').value) {
        showFieldError('activity', 'Please select an activity');
        errors.push('activity');
    }
    if (state.selectedWorkers.length === 0) {
        document.getElementById('workersError').textContent = '⚠️ Please select at least 1 worker';
        document.getElementById('workersError').classList.add('show');
        errors.push('workers');
    }
    const hours = parseFloat(document.getElementById('hours').value);
    if (!hours || hours <= 0) {
        showFieldError('hours', 'Hours must be greater than 0');
        errors.push('hours');
    }
    
    if (errors.length > 0) {
        showToast('⚠️ Please complete all required fields');
        return false;
    }
    return true;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = field.parentElement.querySelector('.error-message');
    field.classList.add('error');
    if (errorDiv) {
        errorDiv.textContent = `⚠️ ${message}`;
        errorDiv.classList.add('show');
    }
}

function clearAllErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => {
        el.classList.remove('show');
        el.textContent = '';
    });
}

function handleSaveTask(e) {
    e.preventDefault();
    console.log('=== SAVE TASK CALLED ===');
    console.log('state.editingTaskId:', state.editingTaskId);
    
    if (!validateForm()) return;
    
    const workers = state.selectedWorkers.map(id => state.workers.find(w => w.id === id)).filter(w => w);
    const skilled = workers.filter(w => w.type === 'skilled').length;
    const helpers = workers.filter(w => w.type === 'helper').length;
    const hours = parseFloat(document.getElementById('hours').value);
    const rate = state.selectedActivity.rate;
    const target = ((skilled * state.companyData.skilledRate) + (helpers * state.companyData.helperRate)) * hours / rate;
    
    console.log('Workers:', workers.length, '| Skilled:', skilled, '| Helpers:', helpers);
    console.log('Target quantity:', target);
    
    if (state.editingTaskId) {
        // UPDATE existing task
        console.log('Editing task with ID:', state.editingTaskId);
        const index = state.tasks.findIndex(t => t.id === state.editingTaskId);
        
        if (index === -1) {
            console.error('Task not found for editing!', state.editingTaskId);
            showToast('⚠️ Error: Task not found');
            return;
        }
        
        const existingTask = state.tasks[index];
        console.log('Found task at index:', index);
        
        state.tasks[index] = {
            ...existingTask,
            date: document.getElementById('taskDate').value,
            taskIdentifier: document.getElementById('taskId').value.trim(),
            teamName: document.getElementById('teamName').value.trim(),
            taskName: document.getElementById('taskName').value.trim(),
            location: document.getElementById('location').value,
            trade: document.getElementById('trade').value,
            mainActivity: document.getElementById('mainActivity').value.trim(),
            activity: document.getElementById('activity').value,
            workers: workers,
            hours: hours,
            targetQuantity: target,
            unit: state.selectedActivity.unit,
            rate: rate
        };
        
        state.lastSavedTask = state.tasks[index];
        showToast('✓ Task updated!');
    } else {
        // CREATE new task
        console.log('Creating new task');
        const task = {
            id: Date.now().toString(),
            date: document.getElementById('taskDate').value,
            taskIdentifier: document.getElementById('taskId').value.trim(),
            teamName: document.getElementById('teamName').value.trim(),
            taskName: document.getElementById('taskName').value.trim(),
            location: document.getElementById('location').value,
            trade: document.getElementById('trade').value,
            mainActivity: document.getElementById('mainActivity').value.trim(),
            activity: document.getElementById('activity').value,
            workers: workers,
            hours: hours,
            targetQuantity: target,
            unit: state.selectedActivity.unit,
            rate: rate,
            actualQuantity: null,
            productivity: null,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        state.tasks.push(task);
        state.lastSavedTask = task;
        showToast('✓ Task saved!');
    }
    
    saveStateToStorage();
    document.getElementById('shareTaskBtn').disabled = false;
    
    // Reset editing state completely
    state.editingTaskId = null;
    state.returnToWorkersScreen = false;
    
    // Reset form UI
    document.getElementById('saveTaskBtn').textContent = 'Save Task';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Stay on page so user can share - they press Home tab when ready
    showToast('✓ Task saved! Share or press Home when ready.');
}

function handleShareTask() {
    if (!state.lastSavedTask) return;
    
    const task = state.lastSavedTask;
    const workersList = task.workers.map((w, i) => 
        `${i + 1}. ${w.name} (${w.id}) - ${w.occupation}`
    ).join('\n');
    
    const message = `SimplePro - Task Assignment

📋 Task: ${task.taskName}
👥 Team: ${task.teamName}
🔧 Trade: ${task.trade}
📍 Location: ${task.location}
📅 Date: ${formatDateFull(new Date(task.date))}

Activity: ${task.activity}

👷 Workers (${task.workers.length}):
${workersList}

⏰ Hours: ${task.hours}
🎯 Target: ${formatNumber(task.targetQuantity)} ${task.unit}

Good luck team! 💪`;
    
    if (navigator.share) {
        navigator.share({ title: 'SimplePro Task', text: message }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(message).then(() => showToast('✓ Copied to clipboard!'));
    } else {
        alert(message);
    }
}

// ========== REPORTS ==========
function navigateDate(direction) {
    const date = new Date(state.reportDate);
    date.setDate(date.getDate() + direction);
    state.reportDate = date.toISOString().split('T')[0];
    document.getElementById('reportDate').textContent = formatDateShort(date);
    loadReports();
}

let reportsSortBy = 'default';

function showReportsSortMenu() {
    const html = `
        <div class="sort-menu-item ${reportsSortBy === 'default' ? 'active' : ''}" onclick="sortReportsBy('default')">Default Order</div>
        <div class="sort-menu-item ${reportsSortBy === 'trade' ? 'active' : ''}" onclick="sortReportsBy('trade')">Sort by Trade</div>
        <div class="sort-menu-item ${reportsSortBy === 'high' ? 'active' : ''}" onclick="sortReportsBy('high')">Productivity: High to Low</div>
        <div class="sort-menu-item ${reportsSortBy === 'low' ? 'active' : ''}" onclick="sortReportsBy('low')">Productivity: Low to High</div>
        <div class="sort-menu-item" onclick="showProductivityByTrade(); closeGenericModal();">📊 Productivity by Trade</div>
    `;
    showModal('Sort & Filter', html);
}

function sortReportsBy(sortType) {
    reportsSortBy = sortType;
    loadReports();
    closeGenericModal();
}

function handleDatePick(value) {
    if (value) {
        state.reportDate = value;
        document.getElementById('reportDate').textContent = formatDateShort(new Date(value + 'T00:00:00'));
        loadReports();
    }
}

function loadReports() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    let tasks = state.tasks.filter(t => t.date === state.reportDate);
    
    if (statusFilter) tasks = tasks.filter(t => t.status === statusFilter);
    
    const reportsList = document.getElementById('reportsList');
    
    if (tasks.length === 0) {
        reportsList.innerHTML = '<div class="empty-state"><p>No tasks for this date</p></div>';
        document.getElementById('leaderboard').style.display = 'none';
        document.getElementById('totalProductivity').textContent = '—';
        document.getElementById('totalProductivity').parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        return;
    }
    
    reportsList.innerHTML = tasks.map(task => renderTaskCard(task, 'reports')).join('');
    
    // Calculate total productivity
    const completed = tasks.filter(t => t.status === 'completed');
    if (completed.length > 0) {
        let totalBudgetedCost = 0;
        let totalActualCost = 0;
        
        completed.forEach(task => {
            const budgetedCost = task.actualQuantity * task.rate;
            const skilled = task.workers.filter(w => w.type === 'skilled').length;
            const helpers = task.workers.filter(w => w.type === 'helper').length;
            const actualCost = (skilled * state.companyData.skilledRate + helpers * state.companyData.helperRate) * task.hours;
            
            totalBudgetedCost += budgetedCost;
            totalActualCost += actualCost;
        });
        
        const totalProductivity = (totalBudgetedCost / totalActualCost) * 100;
        document.getElementById('totalProductivity').textContent = Math.round(totalProductivity) + '%';
        
        // Apply color coding to total productivity banner
        const banner = document.getElementById('totalProductivity').parentElement;
        if (totalProductivity >= 100) {
            banner.style.background = '#d4f8d4';
            banner.style.color = '#2b8a3e';
        } else if (totalProductivity >= 90) {
            banner.style.background = '#ffe8cc';
            banner.style.color = '#d9730d';
        } else {
            banner.style.background = '#ffd4d4';
            banner.style.color = '#d63031';
        }
        
        renderLeaderboard(completed);
    } else {
        document.getElementById('totalProductivity').textContent = '—';
        document.getElementById('totalProductivity').parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        document.getElementById('totalProductivity').parentElement.style.color = 'white';
        document.getElementById('leaderboard').style.display = 'none';
    }
}

function renderLeaderboard(tasks) {
    const teamStats = {};
    tasks.forEach(task => {
        if (!teamStats[task.teamName]) teamStats[task.teamName] = { total: 0, count: 0 };
        teamStats[task.teamName].total += task.productivity;
        teamStats[task.teamName].count++;
    });
    
    let teams = Object.keys(teamStats).map(name => ({
        name: name,
        productivity: teamStats[name].total / teamStats[name].count
    }));
    
    // Apply sorting based on leaderboardSortBy
    if (state.leaderboardSortBy === 'high') {
        teams.sort((a, b) => b.productivity - a.productivity);
    } else if (state.leaderboardSortBy === 'low') {
        teams.sort((a, b) => a.productivity - b.productivity);
    }
    
    // Show all teams with medals for top 3
    const medals = ['🥇', '🥈', '🥉'];
    
    const html = teams.map((team, i) => {
        let prodColor = team.productivity >= 100 ? '#2b8a3e' : team.productivity >= 90 ? '#d9730d' : '#d63031';
        let prodBg = team.productivity >= 100 ? '#d4f8d4' : team.productivity >= 90 ? '#ffe8cc' : '#ffd4d4';
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank" style="font-weight:700; color:var(--text-muted); font-size:14px;">${i+1}</div>
                <div class="leaderboard-team">${team.name}</div>
                <div class="leaderboard-score" style="background:${prodBg}; color:${prodColor}; padding:4px 10px; border-radius:8px;">${Math.round(team.productivity)}%</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('leaderboardList').innerHTML = html;
    document.getElementById('leaderboard').style.display = 'block';
}

function showLeaderboardSortMenu() {
    const html = `
        <div class="sort-menu-item ${state.leaderboardSortBy === 'high' ? 'active' : ''}" onclick="sortLeaderboardBy('high')">
            Productivity: High to Low
        </div>
        <div class="sort-menu-item ${state.leaderboardSortBy === 'low' ? 'active' : ''}" onclick="sortLeaderboardBy('low')">
            Productivity: Low to High
        </div>
    `;
    
    showModal('Sort Leaderboard', html);
}

function sortLeaderboardBy(sortType) {
    state.leaderboardSortBy = sortType;
    loadReports(); // Refresh to apply sorting
    closeGenericModal();
    showToast(`Sorted by ${sortType === 'high' ? 'highest first' : 'lowest first'}`);
}

function showProductivityByTrade() {
    const completed = state.tasks.filter(t => t.status === 'completed');
    
    if (completed.length === 0) {
        showToast('No completed tasks to analyze');
        return;
    }
    
    const tradeStats = {};
    
    completed.forEach(task => {
        if (!tradeStats[task.trade]) {
            tradeStats[task.trade] = { budgeted: 0, actual: 0 };
        }
        
        const budgeted = task.actualQuantity * task.rate;
        const skilled = task.workers.filter(w => w.type === 'skilled').length;
        const helpers = task.workers.filter(w => w.type === 'helper').length;
        const actual = (skilled * state.companyData.skilledRate + helpers * state.companyData.helperRate) * task.hours;
        
        tradeStats[task.trade].budgeted += budgeted;
        tradeStats[task.trade].actual += actual;
    });
    
    const trades = Object.keys(tradeStats).map(name => ({
        name,
        productivity: (tradeStats[name].budgeted / tradeStats[name].actual) * 100
    })).sort((a, b) => b.productivity - a.productivity);
    
    const html = trades.map(trade => {
        const color = trade.productivity >= 100 ? '🟢' : trade.productivity >= 90 ? '🟠' : '🔴';
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-team">${trade.name}</div>
                <div class="leaderboard-score">${Math.round(trade.productivity)}% ${color}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('tradeModalBody').innerHTML = html || '<div class="empty-state"><p>No data</p></div>';
    document.getElementById('tradeModal').classList.add('show');
}

function closeTradeModal() {
    document.getElementById('tradeModal').classList.remove('show');
}

// ========== TRACK PERFORMANCE ==========
function openTrackModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.getElementById('trackModal');
    const body = document.getElementById('trackModalBody');
    
    body.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
            <div>
                <h3 style="font-size:17px; font-weight:700;">${task.taskName}</h3>
                <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">${task.taskIdentifier} • ${task.trade}</div>
                <div style="font-size:13px; color:var(--text-muted);">${task.activity}</div>
                <div style="font-size:13px; color:var(--text-muted);">👥 ${task.teamName} • 📍 ${task.location}</div>
            </div>
            <div style="position:relative;">
                <button onclick="toggleTaskMenu('${taskId}')" style="background:none;border:none;font-size:20px;cursor:pointer;padding:4px 8px;">⋮</button>
                <div id="taskMenu_${taskId}" style="display:none; position:absolute; right:0; top:30px; background:white; border:1px solid var(--border); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,.15); z-index:100; min-width:120px;">
                    <div onclick="closeTrackModal(); editTask('${taskId}');" style="padding:12px 16px; cursor:pointer; font-weight:600; font-size:14px;">✏️ Edit Task</div>
                </div>
            </div>
        </div>
        
        <div class="target-display">
            <div class="target-label">TARGET</div>
            <div class="target-value">${formatNumber(task.targetQuantity)} ${task.unit}</div>
        </div>
        
        <div style="height: 20px;"></div>
        
        <div class="form-group">
            <label for="actualQuantity">Actual Completed</label>
            <input type="number" id="actualQuantity" placeholder="Enter actual quantity" 
                   value="${task.actualQuantity || ''}" step="0.1" min="0">
        </div>
        
        <div id="productivityResult" class="target-display" style="margin-top: 16px; display: none;">
            <div class="target-label">PRODUCTIVITY</div>
            <div class="target-value" id="productivityValue">—</div>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 12px;">
            <button class="btn-secondary" onclick="closeTrackModal()" style="flex: 1;">Cancel</button>
            <button class="btn-primary" onclick="savePerformance('${taskId}')" style="flex: 1;">Save</button>
        </div>
    `;
    
    modal.classList.add('show');
    
    document.getElementById('actualQuantity').addEventListener('input', function() {
        const actual = parseFloat(this.value);
        if (actual && actual > 0) {
            const productivity = (actual / task.targetQuantity) * 100;
            document.getElementById('productivityResult').style.display = 'block';
            document.getElementById('productivityValue').textContent = Math.round(productivity) + '%';
        } else {
            document.getElementById('productivityResult').style.display = 'none';
        }
    });
}

function toggleTaskMenu(taskId) {
    const menu = document.getElementById('taskMenu_' + taskId);
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeTrackModal() {
    document.getElementById('trackModal').classList.remove('show');
}

function savePerformance(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const actual = parseFloat(document.getElementById('actualQuantity').value);
    if (!actual || actual <= 0) {
        showToast('⚠️ Please enter actual quantity');
        return;
    }
    
    task.actualQuantity = actual;
    task.productivity = (actual / task.targetQuantity) * 100;
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    
    saveStateToStorage();
    closeTrackModal();
    showToast('✓ Performance saved!');
    
    if (state.currentScreen === 'homeScreen') updateHomeScreen();
    else if (state.currentScreen === 'reportsScreen') loadReports();
}

function viewTaskDetails(taskId) {
    openTrackModal(taskId);
}

// ========== WORKERS SCREEN ==========
let workersSortBy = 'name'; // name, trade, hours, productivity

function loadWorkersScreen() {
    const skilled = state.workers.filter(w => w.type === 'skilled').length;
    const helpers = state.workers.filter(w => w.type === 'helper').length;
    
    document.getElementById('workersCount').textContent = `${state.workers.length} workers`;
    document.getElementById('workersBreakdown').textContent = `Skilled: ${skilled}, Helper: ${helpers}`;
    
    renderWorkersDirectory();
}

function handleWorkersScreenSearch(e) {
    renderWorkersDirectory(e.target.value);
}

function showWorkersSortMenu() {
    const html = `
        <div class="sort-menu-item ${workersSortBy === 'name' ? 'active' : ''}" onclick="sortWorkersBy('name')">
            Sort by Name
        </div>
        <div class="sort-menu-item ${workersSortBy === 'trade' ? 'active' : ''}" onclick="sortWorkersBy('trade')">
            Sort by Trade
        </div>
        <div class="sort-menu-item ${workersSortBy === 'hours' ? 'active' : ''}" onclick="sortWorkersBy('hours')">
            Sort by Hours Assigned
        </div>
        <div class="sort-menu-item ${workersSortBy === 'productivity' ? 'active' : ''}" onclick="sortWorkersBy('productivity')">
            Sort by Productivity
        </div>
    `;
    
    showModal('Sort Workers', html);
}

function sortWorkersBy(sortType) {
    workersSortBy = sortType;
    renderWorkersDirectory(document.getElementById('workersScreenSearch').value);
    closeGenericModal();
    showToast(`Sorted by ${sortType === 'name' ? 'Name' : sortType === 'trade' ? 'Trade' : sortType === 'hours' ? 'Hours' : 'Productivity'}`);
}

function renderWorkersDirectory(searchQuery = '') {
    const maxHours = state.companyData.standardHours + state.companyData.overtimeHours;
    
    let workers = state.workers.map(w => {
        const todayTasks = state.tasks.filter(t => 
            t.date === state.currentDate && 
            t.workers.some(tw => tw.id === w.id)
        );
        
        let totalHours = 0;
        todayTasks.forEach(t => totalHours += t.hours);
        
        const completedTasks = state.tasks.filter(t => 
            t.status === 'completed' &&
            t.workers.some(tw => tw.id === w.id)
        );
        
        let avgProductivity = 0;
        if (completedTasks.length > 0) {
            avgProductivity = completedTasks.reduce((sum, t) => sum + t.productivity, 0) / completedTasks.length;
        }
        
        // Determine trade (most common trade from their tasks)
        const trades = state.tasks.filter(t => t.workers.some(tw => tw.id === w.id)).map(t => t.trade);
        const tradeCount = {};
        trades.forEach(t => tradeCount[t] = (tradeCount[t] || 0) + 1);
        const mostCommonTrade = Object.keys(tradeCount).sort((a, b) => tradeCount[b] - tradeCount[a])[0] || 'General';
        
        return { ...w, todayTasks: todayTasks.length, totalHours, avgProductivity, trade: mostCommonTrade };
    });
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        workers = workers.filter(w => 
            w.name.toLowerCase().includes(q) || 
            w.id.toString().includes(q) ||
            w.occupation.toLowerCase().includes(q)
        );
    }
    
    // Sort workers
    if (workersSortBy === 'name') {
        workers.sort((a, b) => a.name.localeCompare(b.name));
    } else if (workersSortBy === 'trade') {
        workers.sort((a, b) => a.trade.localeCompare(b.trade));
    } else if (workersSortBy === 'hours') {
        workers.sort((a, b) => b.totalHours - a.totalHours);
    } else if (workersSortBy === 'productivity') {
        workers.sort((a, b) => b.avgProductivity - a.avgProductivity);
    }
    
    const container = document.getElementById('workersScreenList');
    
    if (workers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No workers found</p></div>';
        return;
    }
    
    container.innerHTML = workers.map(worker => {
        let productivityColor = '';
        let productivityBg = '';
        if (worker.avgProductivity > 0) {
            if (worker.avgProductivity >= 100) {
                productivityColor = '#2b8a3e';
                productivityBg = '#d4f8d4';
            } else if (worker.avgProductivity >= 90) {
                productivityColor = '#d9730d';
                productivityBg = '#ffe8cc';
            } else {
                productivityColor = '#d63031';
                productivityBg = '#ffd4d4';
            }
        }
        
        const hoursColor = (worker.totalHours < maxHours || worker.totalHours > maxHours) ? '#d63031' : 'inherit';
        const hoursBold = (worker.totalHours < maxHours || worker.totalHours > maxHours) ? '700' : '500';
        
        return `
            <div class="worker-card" onclick="showWorkerDashboard(${worker.id})">
                <div class="worker-card-header">
                    <div class="worker-card-name">${worker.name}</div>
                    <div class="worker-card-id">${worker.id}</div>
                </div>
                <div class="worker-card-occupation">${worker.occupation} • ${worker.type} • ${worker.trade}</div>
                <div class="worker-card-stats">
                    Today: ${worker.todayTasks} tasks • <span style="color: ${hoursColor}; font-weight: ${hoursBold};">${worker.totalHours}/${maxHours} hrs</span>
                    ${worker.avgProductivity > 0 ? 
                        `<span style="background: ${productivityBg}; color: ${productivityColor}; padding: 4px 8px; border-radius: 6px; margin-left: 8px; font-weight: 700;">
                            ${Math.round(worker.avgProductivity)}%
                        </span>` : ''
                    }
                </div>
            </div>
        `;
    }).join('');
}

function showWorkerDashboard(workerId) {
    const worker = state.workers.find(w => w.id === workerId);
    if (!worker) return;
    
    const workerTasks = state.tasks.filter(t => t.workers.some(w => w.id === workerId));
    const completed = workerTasks.filter(t => t.status === 'completed');
    
    let avgProductivity = 0;
    if (completed.length > 0) {
        avgProductivity = completed.reduce((sum, t) => sum + t.productivity, 0) / completed.length;
    }
    
    const html = `
        <div class="worker-info" style="text-align: center; padding: 20px;">
            <h2>${worker.name}</h2>
            <p style="color: var(--text-muted); margin-top: 8px;">
                ${worker.occupation} • ${worker.type}
            </p>
            <p style="color: var(--text-muted);">ID: ${worker.id}</p>
        </div>
        
        <div class="overview-cards" style="margin: 20px 0;">
            <div class="card-row">
                <div class="stat-card">
                    <div class="stat-value">${workerTasks.length}</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${completed.length}</div>
                    <div class="stat-label">Completed</div>
                </div>
            </div>
            <div class="card-row">
                <div class="stat-card">
                    <div class="stat-value">${Math.round(avgProductivity)}%</div>
                    <div class="stat-label">Avg Productivity</div>
                </div>
            </div>
        </div>
        
        <h3 style="margin: 20px 0 12px;">Recent Tasks</h3>
        ${workerTasks.slice(0, 10).map(task => {
            let prodHtml = '';
            if (task.status === 'completed' && task.productivity) {
                let color = task.productivity >= 100 ? '#2b8a3e' : task.productivity >= 90 ? '#d9730d' : '#d63031';
                let bg = task.productivity >= 100 ? '#d4f8d4' : task.productivity >= 90 ? '#ffe8cc' : '#ffd4d4';
                prodHtml = `<span style="background: ${bg}; color: ${color}; padding: 4px 8px; border-radius: 6px; font-weight: 700; margin-left: 8px;">${Math.round(task.productivity)}%</span>`;
            }
            
            return `
                <div class="task-card" style="margin-bottom: 8px; cursor: pointer;" onclick="viewTaskFromWorkerDashboard('${task.id}')">
                    <div class="task-title">${task.taskName}</div>
                    <div class="task-meta">🆔 ${task.taskIdentifier}</div>
                    <div class="task-meta">👥 ${task.teamName} • 📍 ${task.location}</div>
                    <div class="task-meta">${formatDateShort(new Date(task.date))}</div>
                    <div class="task-status ${task.status === 'completed' ? 'completed' : 'pending'}">
                        ${task.status === 'completed' ? '✓ Completed' : '⏳ In Progress'}${prodHtml}
                    </div>
                </div>
            `;
        }).join('') || '<div class="empty-state"><p>No tasks yet</p></div>'}
        
        <button class="btn-primary" onclick="closeWorkerModal()" style="margin-top: 20px; width: 100%;">Close</button>
    `;
    
    document.getElementById('workerModalBody').innerHTML = html;
    document.getElementById('workerModal').classList.add('show');
}

function viewTaskFromWorkerDashboard(taskId) {
    closeWorkerModal();
    
    // Store that we came from workers screen
    state.returnToWorkersScreen = true;
    
    // Open task in edit mode (view only)
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        if (task.status === 'completed') {
            viewTaskDetails(taskId);
        } else {
            editTask(taskId);
        }
    }
}

function closeWorkerModal() {
    document.getElementById('workerModal').classList.remove('show');
}

// ========== SETTINGS ==========
function openSettings() {
    switchScreen('settingsScreen');
}

function editProjectName() {
    const newName = prompt('Enter project name:', state.companyData.projectName);
    if (newName && newName.trim()) {
        state.companyData.projectName = newName.trim();
        updateCompanyDataDisplay();
        saveStateToStorage();
        showToast('✓ Updated');
    }
}

function editStandardHours() {
    const newHours = prompt('Standard working hours per day:', state.companyData.standardHours);
    const hours = parseFloat(newHours);
    if (hours && hours > 0) {
        state.companyData.standardHours = hours;
        updateCompanyDataDisplay();
        saveStateToStorage();
        showToast('✓ Updated');
    }
}

function editOvertimeHours() {
    const newHours = prompt('Overtime hours per day:', state.companyData.overtimeHours);
    const hours = parseFloat(newHours);
    if (hours && hours >= 0) {
        state.companyData.overtimeHours = hours;
        updateCompanyDataDisplay();
        saveStateToStorage();
        showToast('✓ Updated');
    }
}

function editSkilledRate() {
    const newRate = prompt('Skilled worker hourly rate (AED):', state.companyData.skilledRate);
    const rate = parseFloat(newRate);
    if (rate && rate > 0) {
        state.companyData.skilledRate = rate;
        updateCompanyDataDisplay();
        saveStateToStorage();
        showToast('✓ Updated');
    }
}

function editHelperRate() {
    const newRate = prompt('Helper hourly rate (AED):', state.companyData.helperRate);
    const rate = parseFloat(newRate);
    if (rate && rate > 0) {
        state.companyData.helperRate = rate;
        updateCompanyDataDisplay();
        saveStateToStorage();
        showToast('✓ Updated');
    }
}

function manageLocations() {
    const html = `
        <h3 style="margin-bottom: 16px;">Manage Locations</h3>
        <div id="locationsList">
            ${state.companyData.locations.map((loc, i) => `
                <div class="setting-item" style="margin-bottom: 8px;">
                    <div>${loc}</div>
                    <button class="btn-secondary" onclick="deleteLocation(${i})" style="padding: 6px 12px; font-size: 13px;">Delete</button>
                </div>
            `).join('')}
        </div>
        <div style="margin-top: 20px;">
            <input type="text" id="newLocation" placeholder="Enter new location..." 
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; margin-bottom: 12px;">
            <button class="btn-primary" onclick="addLocation()" style="width: 100%;">Add Location</button>
        </div>
        <button class="btn-secondary" onclick="closeLocationModal()" style="width: 100%; margin-top: 12px;">Close</button>
    `;
    
    showModal('Location Management', html);
}

function addLocation() {
    const input = document.getElementById('newLocation');
    const newLoc = input.value.trim();
    if (newLoc && !state.companyData.locations.includes(newLoc)) {
        state.companyData.locations.push(newLoc);
        populateLocations();
        saveStateToStorage();
        manageLocations();
        showToast('✓ Location added');
    } else if (state.companyData.locations.includes(newLoc)) {
        showToast('⚠️ Location already exists');
    }
}

function deleteLocation(index) {
    if (confirm('Delete this location?')) {
        state.companyData.locations.splice(index, 1);
        populateLocations();
        saveStateToStorage();
        manageLocations();
        showToast('✓ Location deleted');
    }
}

function closeLocationModal() {
    closeGenericModal();
}

function manageTrades() {
    const html = `
        <h3 style="margin-bottom: 16px;">Manage Trades</h3>
        <div id="tradesList">
            ${state.companyData.trades.map((trade, i) => `
                <div class="setting-item" style="margin-bottom: 8px;">
                    <div>${trade}</div>
                    <button class="btn-secondary" onclick="deleteTrade(${i})" style="padding: 6px 12px; font-size: 13px;">Delete</button>
                </div>
            `).join('')}
        </div>
        <div style="margin-top: 20px;">
            <input type="text" id="newTrade" placeholder="Enter new trade..." 
                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; margin-bottom: 12px;">
            <button class="btn-primary" onclick="addTrade()" style="width: 100%;">Add Trade</button>
        </div>
        <button class="btn-secondary" onclick="closeTradeManagementModal()" style="width: 100%; margin-top: 12px;">Close</button>
    `;
    
    showModal('Trade Management', html);
}

function addTrade() {
    const input = document.getElementById('newTrade');
    const newTrade = input.value.trim();
    if (newTrade && !state.companyData.trades.includes(newTrade)) {
        state.companyData.trades.push(newTrade);
        populateTrades();
        saveStateToStorage();
        manageTrades();
        showToast('✓ Trade added');
    } else if (state.companyData.trades.includes(newTrade)) {
        showToast('⚠️ Trade already exists');
    }
}

function deleteTrade(index) {
    if (confirm('Delete this trade?')) {
        state.companyData.trades.splice(index, 1);
        populateTrades();
        saveStateToStorage();
        manageTrades();
        showToast('✓ Trade deleted');
    }
}

function closeTradeManagementModal() {
    closeGenericModal();
}

function importWorkers() {
    showToast('Excel import coming in Phase 2!');
}

function manageWorkers() {
    const html = `
        <h3 style="margin-bottom: 16px;">Manage Workers</h3>
        <input type="text" id="workerSearchModal" placeholder="Search workers..." 
               style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; margin-bottom: 12px;"
               oninput="filterWorkersInModal(this.value)">
        <div id="workersListModal" style="max-height: 300px; overflow-y: auto;">
            ${renderWorkersListForModal()}
        </div>
        <button class="btn-primary" onclick="addNewWorkerPrompt()" style="width: 100%; margin-top: 12px;">➕ Add New Worker</button>
        <button class="btn-secondary" onclick="closeGenericModal()" style="width: 100%; margin-top: 12px;">Close</button>
    `;
    
    showModal('Workers Management', html);
}

function renderWorkersListForModal(searchQuery = '') {
    let workers = state.workers;
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        workers = workers.filter(w => 
            w.name.toLowerCase().includes(q) || 
            w.id.toString().includes(q) ||
            w.occupation.toLowerCase().includes(q)
        );
    }
    
    return workers.map((w, index) => `
        <div class="setting-item" style="margin-bottom: 8px;">
            <div>
                <strong>${w.name}</strong><br>
                <small style="color: var(--text-muted);">${w.id} • ${w.occupation} • ${w.type}</small>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-secondary" onclick="editWorkerPrompt(${index})" style="padding: 6px 12px; font-size: 13px;">Edit</button>
                <button class="btn-secondary" onclick="deleteWorker(${index})" style="padding: 6px 12px; font-size: 13px;">Delete</button>
            </div>
        </div>
    `).join('') || '<div class="empty-state"><p>No workers found</p></div>';
}

function filterWorkersInModal(query) {
    document.getElementById('workersListModal').innerHTML = renderWorkersListForModal(query);
}

function addNewWorkerPrompt() {
    const name = prompt('Worker Name:');
    if (!name) return;
    
    const id = prompt('Worker ID (number):');
    if (!id) return;
    
    const occupation = prompt('Occupation (e.g., Electrician, MEP Helper):');
    if (!occupation) return;
    
    const workerId = parseInt(id);
    if (isNaN(workerId)) {
        showToast('⚠️ Invalid ID');
        return;
    }
    
    if (state.workers.find(w => w.id === workerId)) {
        showToast('⚠️ Worker ID already exists');
        return;
    }
    
    const worker = {
        id: workerId,
        name: name.trim(),
        occupation: occupation.trim(),
        type: getWorkerType(occupation.trim())
    };
    
    state.workers.push(worker);
    state.workers.sort((a, b) => a.id - b.id);
    saveStateToStorage();
    updateCompanyDataDisplay();
    manageWorkers();
    showToast('✓ Worker added');
}

function editWorkerPrompt(index) {
    const worker = state.workers[index];
    
    const name = prompt('Worker Name:', worker.name);
    if (name === null) return;
    
    const occupation = prompt('Occupation:', worker.occupation);
    if (occupation === null) return;
    
    if (name.trim()) worker.name = name.trim();
    if (occupation.trim()) {
        worker.occupation = occupation.trim();
        worker.type = getWorkerType(occupation.trim());
    }
    
    saveStateToStorage();
    updateCompanyDataDisplay();
    manageWorkers();
    showToast('✓ Worker updated');
}

function deleteWorker(index) {
    const worker = state.workers[index];
    if (confirm(`Delete ${worker.name}?`)) {
        state.workers.splice(index, 1);
        saveStateToStorage();
        updateCompanyDataDisplay();
        manageWorkers();
        showToast('✓ Worker deleted');
    }
}

function showModal(title, content) {
    const modal = document.getElementById('genericModal');
    if (!modal) {
        // Create generic modal if doesn't exist
        const modalHtml = `
            <div id="genericModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="genericModalTitle"></h2>
                        <button class="modal-close" onclick="closeGenericModal()">✕</button>
                    </div>
                    <div id="genericModalBody" class="modal-body"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    document.getElementById('genericModalTitle').textContent = title;
    document.getElementById('genericModalBody').innerHTML = content;
    document.getElementById('genericModal').classList.add('show');
}

function closeGenericModal() {
    const modal = document.getElementById('genericModal');
    if (modal) modal.classList.remove('show');
}

function importRates() {
    showToast('Excel import coming in Phase 2!');
}

function exportAllData() {
    const data = { companyData: state.companyData, tasks: state.tasks, workers: state.workers };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SimplePro_Export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('✓ Data exported');
}

function clearAllData() {
    if (confirm('Clear all data? This cannot be undone.')) {
        state.tasks = [];
        saveStateToStorage();
        updateHomeScreen();
        showToast('✓ Data cleared');
    }
}

// ========== UTILITIES ==========
function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDateFull(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
}

function formatDateShort(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('click', function(e) {
    const modals = ['trackModal', 'workerModal', 'tradeModal'];
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (e.target === modal) modal.classList.remove('show');
    });
});

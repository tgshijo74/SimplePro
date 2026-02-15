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
    leaderboardSortBy: 'high',
    groups: [],
    companyData: {
        projectName: 'Al Barsha Mall Project',
        standardHours: 8,
        overtimeHours: 2,
        skilledRate: 14,
        helperRate: 10.5,
        locations: ['First Floor', 'Second Floor', 'Security Room', 'External - North Wing', 'Basement'],
        trades: ['Plumbing', 'Ducting', 'HVAC', 'Chilled Water', 'Electrical']
    },
    workers: typeof workersData !== "undefined" ? workersData.map(w => ({...w, id: Number(w.id)})) : [],
    productivityRates: [...DATA],
    editingTaskId: null
};

// ========== INITIALIZE APP ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('SimplePro MEP initializing...');
    loadStateFromStorage();
    initGroups();
    initializeApp();
    setupEventListeners();
    updateHomeScreen();
    console.log('SimplePro MEP ready!');
});

function initializeApp() {
    const el = id => document.getElementById(id);
    if (el('currentDate')) el('currentDate').textContent = formatDateFull(new Date());
    if (el('reportDate')) el('reportDate').textContent = formatDateShort(new Date(state.reportDate));
    updateCompanyDataDisplay();
    populateLocations();
    populateTrades();
    // Don't call renderAvailableWorkers() here - old element removed
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
            // Only restore tasks and company settings - workers/groups always fresh from JS files
            state.tasks = loaded.tasks || [];
            state.companyData = loaded.companyData || state.companyData;
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
            groups: state.groups,
            productivityRates: state.productivityRates
        }));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// ========== NAVIGATION ==========
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
    });
    
    // Create Task Form
    const createForm = document.getElementById('createTaskForm');
    if (createForm) createForm.addEventListener('submit', handleSaveTask);
    
    const shareBtn = document.getElementById('shareTaskBtn');
    if (shareBtn) shareBtn.addEventListener('click', handleShareTask);
    
    // Old form elements removed - handled via inline onchange/oninput in new form
    
    // Reports
    const prevDate = document.getElementById('prevDate');
    if (prevDate) prevDate.addEventListener('click', () => navigateDate(-1));
    
    const nextDate = document.getElementById('nextDate');
    if (nextDate) nextDate.addEventListener('click', () => navigateDate(1));
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', loadReports);
    
    const calendarBtn = document.getElementById('calendarBtn');
    if (calendarBtn) calendarBtn.addEventListener('click', () => {
        const picker = document.getElementById('reportDatePicker');
        if (!picker) return;
        picker.value = state.reportDate;
        picker.style.display = 'block';
        picker.click();
        picker.addEventListener('change', function() { 
            handleDatePick(this.value); 
            this.style.display = 'none'; 
        }, { once: true });
    });
    
    // Workers
    const workersSearch = document.getElementById('workersScreenSearch');
    if (workersSearch) workersSearch.addEventListener('input', handleWorkersScreenSearch);
    
    // Close ALL suggestion dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        // Close group suggestions
        if (!e.target.closest('#groupSearch') && !e.target.closest('#groupSuggestions')) {
            const s = document.getElementById('groupSuggestions');
            if (s) s.innerHTML = '';
        }
        // Close worker search results
        if (!e.target.closest('#workerSearch') && !e.target.closest('#workerSearchResults')) {
            const s = document.getElementById('workerSearchResults');
            if (s) s.innerHTML = '';
        }
        // Close main activity suggestions (dynamic ones)
        if (!e.target.closest('[id^="mainActivity_"]') && !e.target.closest('[id^="mainActivitySuggestions_"]')) {
            document.querySelectorAll('[id^="mainActivitySuggestions_"]').forEach(el => el.innerHTML = '');
        }
        if (!e.target.closest('#calcMainActivity') && !e.target.closest('#calcMainActivitySuggestions')) {
            const s = document.getElementById('calcMainActivitySuggestions');
            if (s) s.innerHTML = '';
        }
        // Close modals on backdrop click
        ['trackModal','workerModal','tradeModal'].forEach(id => {
            const modal = document.getElementById(id);
            if (e.target === modal) modal.classList.remove('show');
        });
    });
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.screen === screenId) btn.classList.add('active');
    });
    
    if (screenId === 'homeScreen') updateHomeScreen();
    else if (screenId === 'createScreen') {
        if (!state.editingTaskId) {
            initCreateScreen(); // Fresh form
        }
        // If editing, form is already populated by editTask()
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
            <div class="task-card-row bold">${task.groupName || task.teamName}</div>
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
    (document.getElementById('taskId') || {}).value = `Task-${String(nextNum).padStart(2, '0')}`;
    
    state.selectedWorkers = [];
    state.selectedActivity = null;
    state.editingTaskId = null;
    const tqEl = document.getElementById('targetQuantity'); if (tqEl) tqEl.textContent = '—';
    updateSelectedWorkersDisplay();
    renderAvailableWorkers();
    
    document.getElementById('shareTaskBtn').disabled = true;
    const delBtn = document.getElementById('deleteTaskBtn');
    if (delBtn) delBtn.disabled = true;
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
    // taskId moved to new form - skipped
    // teamName moved to group in new form - skipped
    // taskName moved to activity in new form - skipped
    // location moved to dynamic activity form
    document.getElementById('trade').value = task.trade;
    // mainActivity moved to activity in new form - skipped
    
    populateActivities(task.mainActivity);
    setTimeout(() => {
        // activity element moved to dynamic form
        // activity element moved to dynamic form
    }, 100);
    
    state.selectedWorkers = task.workers.map(w => w.id);
    state.selectedActivity = state.productivityRates.find(r => 
        r.category === task.mainActivity && r.activity === task.activity
    );
    
    // hours moved to duration in new form - skipped
    
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
    // Location dropdowns are now inside dynamic activity blocks
    // They get populated when activities are rendered
    // Settings location management still works via manageLocations()
}

function populateTrades() {
    const tradeSelect = document.getElementById('trade');
    if (!tradeSelect) return;
    
    // Use trades found in workers data (auto-populated from Excel)
    // Combine with company trades, remove duplicates, sort
    const workerTrades = typeof tradesFromWorkers !== 'undefined' ? tradesFromWorkers : [];
    const companyTrades = state.companyData.trades || [];
    
    // Union of both, remove empty, sort
    const allTrades = [...new Set([...workerTrades, ...companyTrades])]
        .filter(t => t && t.trim())
        .sort();
    
    // Update companyData.trades to match
    if (workerTrades.length > 0) {
        state.companyData.trades = allTrades;
    }
    
    tradeSelect.innerHTML = '<option value="">Select...</option>' +
        allTrades.map(t => `<option value="${t}">${t}</option>`).join('');
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
    if (!container) return;
    if (activities.length === 0 || !(document.getElementById('mainActivity') || {}).value) {
        container.innerHTML = '';
        return;
    }
    
    const html = activities.map(activity => 
        `<div class="suggestion-item" onclick="selectMainActivity(\`${activity.replace(/`/g, '\\`')}\`)">${activity}</div>`
    ).join('');
    
    container.innerHTML = `<div class="suggestions-list">${html}</div>`;
}

function selectMainActivity(category) {
    (document.getElementById('mainActivity') || {}).value = category;
    const ms = document.getElementById('mainActivitySuggestions'); if (ms) ms.innerHTML = '';
    populateActivities(category);
}

function populateActivities(category) {
    const activitySelect = document.getElementById('activity');
    if (!activitySelect) return;
    const activities = state.productivityRates.filter(d => d.category === category && d.activity);
    
    activitySelect.innerHTML = '<option value="">Select activity...</option>' +
        activities.map(a => `<option value="${a.activity}">${a.activity}</option>`).join('');
    
    activitySelect.classList.add('placeholder');
}

function handleActivityChange(e) {
    const activity = e.target.value;
    const category = (document.getElementById('mainActivity') || {}).value;
    
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
    if (!container) return; // Old form element
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
    // This function handles OLD form - new form uses renderWorkerChips()
    const section = document.getElementById('selectedWorkersSection');
    if (!section) return; // Old element - new form uses workers chips instead
    
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
    
    const scEl = document.getElementById('selectedCount'); if (scEl) scEl.textContent = `Skilled: ${skilled}, Helper: ${helpers}`;
    
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
        (document.getElementById('targetQuantity') || {}).textContent = '—';
        return;
    }
    
    const hours = parseFloat((document.getElementById('hours') || {}).value) || 0;
    if (hours <= 0) {
        (document.getElementById('targetQuantity') || {}).textContent = '—';
        return;
    }
    
    const workers = state.selectedWorkers.map(id => state.workers.find(w => w.id === id)).filter(w => w);
    const skilled = workers.filter(w => w.type === 'skilled').length;
    const helpers = workers.filter(w => w.type === 'helper').length;
    
    const rate = state.selectedActivity.rate;
    const target = ((skilled * state.companyData.skilledRate) + (helpers * state.companyData.helperRate)) * hours / rate;
    
    (document.getElementById('targetQuantity') || {}).textContent = 
        `${formatNumber(target)} ${state.selectedActivity.unit}`;
}

// Continue...

// ========== VALIDATION & SAVE ==========
function validateForm() {
    // Old validation - replaced by validateNewTaskForm()
    return validateNewTaskForm();
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


// Old handleSaveTask removed - using new multi-activity version


function deleteLastSavedTasks() {
    if (!state.lastSavedTaskIds || state.lastSavedTaskIds.length === 0) {
        showToast('No recently saved tasks to delete');
        return;
    }
    
    const count = state.lastSavedTaskIds.length;
    const msg = count > 1 
        ? `Delete these ${count} tasks? This cannot be undone.`
        : 'Delete this task? This cannot be undone.';
    
    if (!confirm(msg)) return;
    
    // Remove tasks
    state.tasks = state.tasks.filter(t => !state.lastSavedTaskIds.includes(t.id));
    state.lastSavedTaskIds = [];
    state.lastSavedTask = null;
    
    // Disable buttons
    document.getElementById('shareTaskBtn').disabled = true;
    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (deleteBtn) deleteBtn.disabled = true;
    
    saveStateToStorage();
    showToast(`🗑️ ${count} task${count > 1 ? 's' : ''} deleted`);
    
    // Reset form after short delay
    setTimeout(() => initCreateScreen(), 800);
}

function handleShareTask() {
    if (!state.lastSavedTask) return;
    
    const task = state.lastSavedTask;
    const workersList = task.workers.map((w, i) => 
        `${i + 1}. ${w.isLeader ? '⭐ ' : ''}${w.name} (${w.id}) - ${w.occupation}`
    ).join('\n');
    
    const message = `SimplePro - Task Assignment

📋 Task: ${task.taskName}
👥 Group: ${task.groupName || task.teamName}
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

// ========== GROUPS DATA ==========
function initGroups() {
    // Always reload from groupsData (source of truth from workers-data.js)
    // This ensures 'trade' field is always fresh from Excel import
    if (typeof groupsData !== 'undefined' && groupsData.length > 0) {
        // Merge: keep any custom groups added by user, refresh built-in groups
        const builtInIds = groupsData.map(g => g.id);
        const customGroups = (state.groups || []).filter(g => !builtInIds.includes(g.id));
        state.groups = [...JSON.parse(JSON.stringify(groupsData)), ...customGroups];
    } else if (!state.groups || state.groups.length === 0) {
        state.groups = [];
    }
}

// ========== TASK ID GENERATOR ==========
function generateTaskId(date, groupName, seq) {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    const gName = (groupName || 'CUSTOM').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7);
    const num = String(seq).padStart(2, '0');
    return `${dd}${mm}${yy}${gName}${num}`;
}

// ========== NEW CREATE TASK ==========
let createState = {
    selectedWorkers: [],   // [{id, name, occupation, type, isLeader}]
    activities: [],        // [{taskName, location, mainActivity, activity, duration, rate, unit}]
    groupId: null,
    groupName: '',
    isCustomGroup: false,
    editingTaskIds: []     // for edit mode
};

function initCreateScreen() {
    // Full reset of create state
    createState = { 
        selectedWorkers: [], 
        activities: [], 
        groupId: null, 
        groupName: '', 
        isCustomGroup: false, 
        editingTaskIds: [] 
    };
    
    // Reset session saved IDs (prevent stale delete)
    state.lastSavedTaskIds = [];
    state.lastSavedTask = null;
    
    // Reset all form fields
    document.getElementById('taskDate').valueAsDate = new Date();
    
    // Reset trade dropdown to blank
    const tradeEl = document.getElementById('trade');
    if (tradeEl) tradeEl.value = '';
    
    // Reset group field
    document.getElementById('groupSearch').value = '';
    document.getElementById('selectedGroupId').value = '';
    document.getElementById('selectedGroupName').value = '';
    document.getElementById('groupSuggestions').innerHTML = '';
    
    // Reset worker search
    document.getElementById('workerSearch').value = '';
    document.getElementById('workerSearchResults').innerHTML = '';
    
    // Reset buttons
    document.getElementById('saveTaskBtn').textContent = 'Save Tasks';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('shareTaskBtn').disabled = true;
    const delBtn = document.getElementById('deleteTaskBtn');
    if (delBtn) delBtn.disabled = true;
    
    // Populate trades from workers data
    populateTrades();
    
    // Render empty workers
    renderWorkerChips();
    
    // Start with ONE clean empty activity
    createState.activities = [createEmptyActivity()];
    renderActivities();
    updateTotalHours();
}

function createEmptyActivity() {
    return { taskName: '', location: '', mainActivity: '', activity: '', duration: 8, rate: null, unit: '', targetQty: null };
}

// ========== TRADE CHANGE ==========
function handleTradeChange() {
    const trade = getSelectedTrade();
    const groupSearch = document.getElementById('groupSearch');
    const groupSuggestions = document.getElementById('groupSuggestions');
    
    // If no trade selected, close the dropdown
    if (!trade) {
        if (groupSuggestions) groupSuggestions.innerHTML = '';
        return;
    }
    
    // Re-run group search with current query
    const query = groupSearch ? groupSearch.value : '';
    handleGroupSearch(query);
    renderWorkerChips();
}

function getSelectedTrade() {
    return document.getElementById('trade')?.value || '';
}

// ========== GROUP SEARCH ==========
function handleGroupFocus() {
    handleGroupSearch(document.getElementById('groupSearch').value);
}

function handleGroupSearch(query) {
    const trade = getSelectedTrade();
    const container = document.getElementById('groupSuggestions');
    if (!container) return;
    const groups = state.groups || [];
    const selectedTrade = trade || '';
    const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);

    // If no trade selected and no query, hide the dropdown
    if (!selectedTrade && !query) {
        container.innerHTML = '';
        return;
    }

    // Filter groups by query
    let matched = groups.filter(g => !query || g.name.toLowerCase().includes(query.toLowerCase()));

    // *** COMPUTE tradeLabel + hoursToday + isFullyBooked for EACH group ***
    // This MUST happen before filtering/sorting
    matched = matched.map(g => {
        const memberIds = g.memberIds || [];
        // Find members using Number() to fix string/number mismatch from localStorage
        const members = memberIds.map(id => state.workers.find(w => Number(w.id) === Number(id))).filter(Boolean);
        
        // Count trades from members (use worker.trade from Excel column E)
        const tradeCounts = {};
        members.forEach(w => {
            const t = (w.trade || '').trim();
            if (t) tradeCounts[t] = (tradeCounts[t] || 0) + 1;
        });
        
        // Get dominant trade
        let tradeLabel = '';
        if (Object.keys(tradeCounts).length > 0) {
            tradeLabel = Object.entries(tradeCounts).sort((a,b) => b[1]-a[1])[0][0];
        } else if (g.trade && g.trade.trim()) {
            tradeLabel = g.trade;
        }
        
        // Calculate hours today for this group
        const today = document.getElementById('taskDate')?.value || state.currentDate;
        const groupTasks = state.tasks.filter(t =>
            t.date === today &&
            t.groupName && t.groupName.toUpperCase() === g.name.toUpperCase()
        );
        const hoursToday = groupTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
        const isFullyBooked = hoursToday >= maxHours;

        return { ...g, tradeLabel, hoursToday, isFullyBooked };
    });

    // Sort: available + trade match first, available others next, fully booked at bottom
    matched.sort((a, b) => {
        if (a.isFullyBooked !== b.isFullyBooked) return a.isFullyBooked ? 1 : -1;
        const aMatch = selectedTrade && a.tradeLabel === selectedTrade ? -1 : 1;
        const bMatch = selectedTrade && b.tradeLabel === selectedTrade ? -1 : 1;
        return aMatch - bMatch;
    });

    let html = '';
    
    // Create new option - always first if query exists
    const displayName = query || '';
    html += `<div class="suggestions-list">`;
    if (displayName) {
        html += `<div class="group-suggestion-item create-new" onclick="selectCustomGroup('${displayName.replace(/'/g,"\\'")}')">
            ✨ Create custom group "${displayName}"
        </div>`;
    }
    
    // Trade-matching groups (using computed tradeLabel)
    const tradMatched = matched.filter(g => g.tradeLabel === selectedTrade);
    const others = matched.filter(g => g.tradeLabel !== selectedTrade);
    
    if (tradMatched.length > 0 && selectedTrade) {
        html += `<div class="group-suggestion-divider">Best Match</div>`;
        tradMatched.forEach(g => {
            const leader = state.workers.find(w => w.id === g.leaderId);
            const leaderName = leader ? leader.name.split(' ')[0] : '';
            const hoursColor = g.isFullyBooked ? '#d63031' : g.hoursToday > 0 ? '#d9730d' : '#2b8a3e';
            const hoursBg = g.isFullyBooked ? '#ffd4d4' : g.hoursToday > 0 ? '#ffe8cc' : '#d4f8d4';
            const maxH = (state.companyData.standardHours||8)+(state.companyData.overtimeHours||2);
            html += `<div class="group-suggestion-item ${g.isFullyBooked ? 'worker-fully-booked' : ''}" 
                onclick="${g.isFullyBooked ? `showToast('⚠️ ${g.name} already at ${maxH}hrs today')` : `selectGroup('${g.id}')`}">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:600;">👥 ${g.name}</span>
                    <span style="background:${hoursBg};color:${hoursColor};padding:2px 8px;border-radius:8px;font-size:12px;font-weight:700;">${g.hoursToday}/${maxH} hrs</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                    ${g.tradeLabel || 'General'} · ${g.memberIds.length} workers${leaderName ? ' · ⭐'+leaderName : ''}${g.isFullyBooked ? ' · ⚠️ Fully booked' : ''}
                </div>
            </div>`;
        });
    }
    
    if (others.length > 0) {
        if (tradMatched.length > 0) html += `<div class="group-suggestion-divider">Other Groups</div>`;
        others.forEach(g => {
            const leader = state.workers.find(w => w.id === g.leaderId);
            const leaderName = leader ? leader.name.split(' ')[0] : '';
            const hoursColor = g.isFullyBooked ? '#d63031' : g.hoursToday > 0 ? '#d9730d' : '#2b8a3e';
            const hoursBg = g.isFullyBooked ? '#ffd4d4' : g.hoursToday > 0 ? '#ffe8cc' : '#d4f8d4';
            const maxH = (state.companyData.standardHours||8)+(state.companyData.overtimeHours||2);
            html += `<div class="group-suggestion-item ${g.isFullyBooked ? 'worker-fully-booked' : ''}"
                onclick="${g.isFullyBooked ? `showToast('⚠️ ${g.name} already at ${maxH}hrs today')` : `selectGroup('${g.id}')`}">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:600;">👥 ${g.name}</span>
                    <span style="background:${hoursBg};color:${hoursColor};padding:2px 8px;border-radius:8px;font-size:12px;font-weight:700;">${g.hoursToday}/${maxH} hrs</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                    ${g.tradeLabel || 'General'} · ${g.memberIds.length} workers${leaderName ? ' · ⭐'+leaderName : ''}${g.isFullyBooked ? ' · ⚠️ Fully booked' : ''}
                </div>
            </div>`;
        });
    }
    
    if (!displayName && matched.length === 0) {
        html += `<div style="padding:12px 16px; color:var(--text-muted); font-size:13px;">No groups found</div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function selectGroup(groupId) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return;
    
    createState.groupId = groupId;
    createState.groupName = group.name;
    createState.isCustomGroup = false;
    
    document.getElementById('groupSearch').value = group.name;
    document.getElementById('selectedGroupId').value = groupId;
    document.getElementById('selectedGroupName').value = group.name;
    document.getElementById('groupSuggestions').innerHTML = '';
    
    // Load workers from group sorted by trade
    const trade = getSelectedTrade();
    // Use Number() to handle string/number mismatch after localStorage
    let workers = group.memberIds.map(id => state.workers.find(w => Number(w.id) === Number(id))).filter(Boolean);
    
    // Sort: leader first, then trade-matching by worker.trade, then others
    workers.sort((a, b) => {
        if (a.isLeader) return -1;
        if (b.isLeader) return 1;
        const aMatch = trade && a.trade === trade ? -1 : 1;
        const bMatch = trade && b.trade === trade ? -1 : 1;
        return aMatch - bMatch;
    });
    
    createState.selectedWorkers = workers.map(w => ({ ...w }));
    renderWorkerChips();
    updateTotalHours();
    generateAllTaskIds();
}

function selectCustomGroup(name) {
    createState.groupId = null;
    createState.groupName = name + '*';
    createState.isCustomGroup = true;
    createState.selectedWorkers = [];
    
    document.getElementById('groupSearch').value = name + '*';
    document.getElementById('selectedGroupId').value = '';
    document.getElementById('selectedGroupName').value = name + '*';
    document.getElementById('groupSuggestions').innerHTML = '';
    
    renderWorkerChips();
    generateAllTaskIds();
    showToast('Custom group - please add workers manually');
}

// ========== WORKER CHIPS ==========
function renderWorkerChips() {
    const container = document.getElementById('selectedWorkersList');
    if (!container) return;
    
    if (createState.selectedWorkers.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding:4px 0;">No workers selected yet</div>';
        updateWorkersHoursBadge();
        return;
    }
    
    const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);
    
    container.innerHTML = createState.selectedWorkers.map((w) => {
        const hoursToday = getWorkerHoursToday(w.id);
        const isBooked = hoursToday >= maxHours;
        const isPartial = !isBooked && hoursToday > 0;
        const chipStyle = isBooked ? 'border-color:#d63031; background:#fff5f5;' : 
                          isPartial ? 'border-color:#f59f00;' : '';
        const hoursStyle = isBooked ? 'color:#d63031; font-weight:700;' : 
                           isPartial ? 'color:#d9730d; font-weight:600;' : 'color:#2b8a3e;';
        const hoursDisplay = `${hoursToday}/${maxHours}h`;
        return `
        <div class="worker-chip ${w.isLeader ? 'leader' : ''}" style="${chipStyle}" title="${w.name} - ${w.occupation}">
            ${w.isLeader ? '⭐ ' : ''}${w.name.split(' ')[0]}
            <span style="font-size:11px; ${hoursStyle}">${hoursDisplay}</span>
            <button class="worker-chip-remove" onclick="removeWorkerFromTask(${w.id})">−</button>
        </div>`;
    }).join('');
    
    updateWorkersHoursBadge();
}

function updateWorkersHoursBadge() {
    const badge = document.getElementById('workersHoursBadge');
    const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);
    const totalHours = getTotalHours();
    const skilled = createState.selectedWorkers.filter(w => w.type === 'skilled').length;
    const helpers = createState.selectedWorkers.filter(w => w.type === 'helper').length;
    
    badge.textContent = `${skilled} Skilled · ${helpers} Helper`;
    badge.className = 'hours-badge';
}

function removeWorkerFromTask(workerId) {
    createState.selectedWorkers = createState.selectedWorkers.filter(w => w.id !== workerId);
    renderWorkerChips();
    recalculateAllTargets();
}

// ========== WORKER SEARCH (Add to task) ==========
function handleWorkerSearchFocus() {
    // Show ALL available workers when focused
    handleWorkerSearch(document.getElementById('workerSearch').value || '__ALL__');
}

function getWorkerHoursToday(workerId) {
    const today = document.getElementById('taskDate')?.value || state.currentDate;
    let totalHours = 0;
    state.tasks.forEach(t => {
        if (t.date === today && t.workers && 
            t.workers.some(w => Number(w.id) === Number(workerId))) {
            totalHours += (parseFloat(t.hours) || 0);
        }
    });
    return totalHours;
}

function getWorkerGroupLabel(worker) {
    // Use worker.group directly from workers-data.js (set from Excel column F)
    // This is the most reliable - no ID comparison needed
    if (worker.group && worker.group.trim()) return `Group: ${worker.group.trim()}`;
    return 'No group';
}

function handleWorkerSearch(query) {
    const trade = getSelectedTrade();
    const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);
    
    // Use Number() to avoid string/number mismatch from localStorage
    const alreadySelected = createState.selectedWorkers.map(w => Number(w.id));
    let workers = state.workers.filter(w => !alreadySelected.includes(Number(w.id)));
    
    const trimmedQuery = (query === '__ALL__') ? '' : query.trim();
    if (trimmedQuery) {
        workers = workers.filter(w => 
            w.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
            w.occupation.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
            String(w.id).includes(trimmedQuery)
        );
    }
    // If no query - show ALL workers (all 34), just sorted by trade priority
    
    // Sort: 
    // 1. Exact trade match first (green)
    // 2. MEP Helpers / no trade (flexible - works anywhere)
    // 3. Other trades
    // Within each group: available hours ascending (most available first)
    workers.sort((a, b) => {
        const aExact = trade && a.trade === trade ? 0 : ((!a.trade || a.trade === '') ? 1 : 2);
        const bExact = trade && b.trade === trade ? 0 : ((!b.trade || b.trade === '') ? 1 : 2);
        if (aExact !== bExact) return aExact - bExact;
        return getWorkerHoursToday(a.id) - getWorkerHoursToday(b.id);
    });
    
    const container = document.getElementById('workerSearchResults');
    if (!container) return;
    // Only hide if query is truly empty AND not triggered by focus
    if (!query) { container.innerHTML = ''; return; }
    if (workers.length === 0) { 
        container.innerHTML = '<div class="suggestions-list"><div style="padding:12px 16px; color:var(--text-muted);">No workers available</div></div>';
        return;
    }
    
    container.innerHTML = `<div class="suggestions-list">` +
        workers.slice(0, 34).map(w => {
            const hoursToday = getWorkerHoursToday(w.id);
            const isFullyBooked = hoursToday >= maxHours;
            const groupLabel = getWorkerGroupLabel(w);
            
            // Hours color
            const hoursColor = isFullyBooked ? '#d63031' : hoursToday > 0 ? '#d9730d' : '#2b8a3e';
            const hoursBg = isFullyBooked ? '#ffd4d4' : hoursToday > 0 ? '#ffe8cc' : '#d4f8d4';
            const hoursText = `${hoursToday}/${maxHours} hrs`;
            
            // Warning if fully booked
            const bookedWarning = isFullyBooked ? ' ⚠️ Fully booked' : '';
            
            const tradeMatch = trade && w.trade === trade;
            const isHelper = w.type === 'helper' || w.occupation.toLowerCase().includes('helper');
            const badgeText = w.trade ? w.trade : (isHelper ? 'Helper' : w.occupation);
            const badgeBg   = tradeMatch ? '#e8f5e9' : isHelper ? '#fff3cd' : '#f0f0f0';
            const badgeColor = tradeMatch ? '#2b8a3e' : isHelper ? '#856404' : '#888';
            const tradeBadge = `<span style="background:${badgeBg}; color:${badgeColor}; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:600; margin-left:4px;">${badgeText}</span>`;

            // Hours remaining display
            const hoursLeft = maxHours - hoursToday;
            const hoursLeftText = isFullyBooked ? '0 hrs left' : `${hoursLeft} hrs left`;
            
            return `
            <div class="group-suggestion-item ${isFullyBooked ? 'worker-fully-booked' : ''}" 
                 onclick="${isFullyBooked ? `showToast('⛔ ${w.name.split(' ')[0]} is at maximum hours')` : `addWorkerToTask(${w.id})`}">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <div style="flex:1; min-width:0;">
                        <span style="font-weight:600;">${w.isLeader ? '⭐ ' : ''}${w.name}</span>${tradeBadge}
                    </div>
                    <span style="background:${hoursBg}; color:${hoursColor}; padding:2px 8px; border-radius:8px; font-size:12px; font-weight:700; white-space:nowrap;">${hoursText}</span>
                </div>
                <div style="color:var(--text-muted); font-size:12px; margin-top:3px;">
                    ${w.occupation} · ${groupLabel} · <span style="color:${hoursColor}; font-weight:600;">${hoursLeftText}</span>${bookedWarning}
                </div>
            </div>`;
        }).join('') + `</div>`;
}

function addWorkerToTask(workerId) {
    const worker = state.workers.find(w => w.id === workerId);
    if (!worker) return;
    if (createState.selectedWorkers.find(w => w.id === workerId)) {
        showToast('Worker already added!'); return;
    }
    
    // Block adding worker if already at max hours
    const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);
    const hoursToday = getWorkerHoursToday(workerId);
    if (hoursToday >= maxHours) {
        showToast(`⛔ ${worker.name.split(' ')[0]} is at maximum hours (${hoursToday}/${maxHours} hrs). Cannot add.`);
        return; // BLOCK - cannot add
    }
    
    createState.selectedWorkers.push({ ...worker });
    document.getElementById('workerSearch').value = '';
    document.getElementById('workerSearchResults').innerHTML = '';
    renderWorkerChips();
    recalculateAllTargets();
}

// ========== ACTIVITIES ==========
function renderActivities() {
    const container = document.getElementById('activitiesContainer');
    container.innerHTML = createState.activities.map((act, i) => renderActivityBlock(act, i)).join('');
    
    // Add + button
    container.innerHTML += `<button type="button" class="add-activity-btn" onclick="addActivity()">+ Add Another Activity</button>`;
    
    // Re-attach event listeners for each activity
    createState.activities.forEach((act, i) => {
        const mainInput = document.getElementById(`mainActivity_${i}`);
        if (mainInput) {
            mainInput.addEventListener('input', (e) => handleActivityMainSearch(e.target.value, i));
            mainInput.addEventListener('focus', () => handleActivityMainSearch(document.getElementById(`mainActivity_${i}`).value, i));
        }
        const actSelect = document.getElementById(`activity_${i}`);
        if (actSelect) actSelect.addEventListener('change', (e) => handleActivityChange(e.target.value, i));
        const durInput = document.getElementById(`duration_${i}`);
        if (durInput) durInput.addEventListener('input', (e) => handleDurationChange(e.target.value, i));
        const taskNameInput = document.getElementById(`taskName_${i}`);
        if (taskNameInput) taskNameInput.addEventListener('input', (e) => { createState.activities[i].taskName = e.target.value; });
        const locSelect = document.getElementById(`location_${i}`);
        if (locSelect) locSelect.addEventListener('change', (e) => { createState.activities[i].location = e.target.value; });
    });
}

function renderActivityBlock(act, index) {
    const locations = state.companyData.locations || [];
    const locOptions = locations.map(l => `<option value="${l}" ${act.location === l ? 'selected' : ''}>${l}</option>`).join('');
    const canDelete = index > 0;
    
    let targetHtml = '';
    if (act.targetQty !== null && act.targetQty !== undefined) {
        targetHtml = `
            <div class="activity-target-display">
                <span class="activity-target-label">Target Quantity</span>
                <span class="activity-target-value">${formatNumber(act.targetQty)} ${act.unit}</span>
            </div>`;
    }
    
    return `
        <div class="activity-block" id="activityBlock_${index}">
            <div class="activity-block-header">
                <span class="activity-block-title">Activity ${index + 1}</span>
                ${canDelete ? `<button type="button" class="btn-delete-activity" onclick="removeActivity(${index})">🗑️</button>` : ''}
            </div>
            
            <div class="form-group">
                <label>Task Name</label>
                <input type="text" id="taskName_${index}" placeholder="e.g., Duct installation lobby" 
                       value="${act.taskName}" required>
            </div>
            
            <div class="form-group">
                <label>Location</label>
                <select id="location_${index}" required>
                    <option value="">Select location...</option>
                    ${locOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label>Main Activity</label>
                <input type="text" id="mainActivity_${index}" placeholder="Type to search..." 
                       value="${act.mainActivity}" autocomplete="off">
                <div id="mainActivitySuggestions_${index}" class="suggestions"></div>
            </div>
            
            <div class="form-group">
                <label>Activity</label>
                <select id="activity_${index}" class="${act.activity ? '' : 'placeholder'}">
                    <option value="">Select activity...</option>
                    ${act.mainActivity ? getActivityOptions(act.mainActivity, act.activity) : ''}
                </select>
            </div>
            
            <div class="form-group">
                <label>Duration (hrs)</label>
                <input type="number" id="duration_${index}" value="${act.duration || 8}" 
                       min="0.5" step="0.5" required>
            </div>
            
            ${targetHtml}
        </div>
    `;
}

function getActivityOptions(category, selected) {
    const activities = state.productivityRates.filter(r => r.category === category && r.activity);
    return activities.map(a => `<option value="${a.activity}" ${a.activity === selected ? 'selected' : ''}>${a.activity}</option>`).join('');
}

function handleActivityMainSearch(query, index) {
    const container = document.getElementById(`mainActivitySuggestions_${index}`);
    if (!container) return;
    
    const activities = getMainActivities().filter(a => !query || a.toLowerCase().includes(query.toLowerCase()));
    
    if (activities.length === 0) { container.innerHTML = ''; return; }
    
    container.innerHTML = `<div class="suggestions-list">` +
        activities.slice(0, 8).map(a => `
            <div class="suggestion-item" onclick="selectActivityMain('${a.replace(/'/g,"\\'")}', ${index})">${a}</div>
        `).join('') + `</div>`;
}

function selectActivityMain(category, index) {
    createState.activities[index].mainActivity = category;
    createState.activities[index].activity = '';
    createState.activities[index].rate = null;
    createState.activities[index].targetQty = null;
    
    document.getElementById(`mainActivity_${index}`).value = category;
    document.getElementById(`mainActivitySuggestions_${index}`).innerHTML = '';
    
    const actSelect = document.getElementById(`activity_${index}`);
    actSelect.innerHTML = '<option value="">Select activity...</option>' + getActivityOptions(category, '');
    actSelect.classList.add('placeholder');
    
    // Update target display
    const block = document.getElementById(`activityBlock_${index}`);
    const existing = block.querySelector('.activity-target-display');
    if (existing) existing.remove();
}

function handleActivityChange(value, index) {
    const category = createState.activities[index].mainActivity;
    const row = state.productivityRates.find(r => r.category === category && r.activity === value);
    
    createState.activities[index].activity = value;
    createState.activities[index].rate = row ? row.rate : null;
    createState.activities[index].unit = row ? row.unit : '';
    
    document.getElementById(`activity_${index}`).classList.toggle('placeholder', !value);
    calculateActivityTarget(index);
}

function handleDurationChange(value, index) {
    createState.activities[index].duration = parseFloat(value) || 0;
    calculateActivityTarget(index);
    updateTotalHours();
}

function calculateActivityTarget(index) {
    const act = createState.activities[index];
    if (!act.rate || !act.duration) { act.targetQty = null; return; }
    
    const skilled = createState.selectedWorkers.filter(w => w.type === 'skilled').length;
    const helpers = createState.selectedWorkers.filter(w => w.type === 'helper').length;
    
    if (skilled === 0 && helpers === 0) { act.targetQty = null; return; }
    
    const target = ((skilled * state.companyData.skilledRate) + (helpers * state.companyData.helperRate)) * act.duration / act.rate;
    act.targetQty = target;
    
    // Update display inline
    const block = document.getElementById(`activityBlock_${index}`);
    if (!block) return;
    let targetDiv = block.querySelector('.activity-target-display');
    if (!targetDiv) {
        targetDiv = document.createElement('div');
        targetDiv.className = 'activity-target-display';
        block.appendChild(targetDiv);
    }
    targetDiv.innerHTML = `
        <span class="activity-target-label">Target Quantity</span>
        <span class="activity-target-value">${formatNumber(target)} ${act.unit}</span>
    `;
}

function recalculateAllTargets() {
    createState.activities.forEach((_, i) => calculateActivityTarget(i));
}

function addActivity() {
    const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);
    if (getTotalHours() >= maxHours) {
        showToast(`⚠️ Total hours already at maximum (${maxHours}hrs)`);
        return;
    }
    createState.activities.push(createEmptyActivity());
    renderActivities();
    updateTotalHours();
}

function removeActivity(index) {
    if (createState.activities.length <= 1) return;
    createState.activities.splice(index, 1);
    renderActivities();
    updateTotalHours();
}

function getTotalHours() {
    return createState.activities.reduce((sum, a) => sum + (parseFloat(a.duration) || 0), 0);
}

function updateTotalHours() {
    const total = getTotalHours();
    const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);
    const display = document.getElementById('totalHoursDisplay');
    if (!display) return;
    
    display.textContent = `${total} / ${maxHours} hrs`;
    display.className = 'total-hours-value';
    if (total > maxHours) display.classList.add('danger');
    else if (total >= maxHours * 0.9) display.classList.add('warning');
    
    generateAllTaskIds();
}

function generateAllTaskIds() {
    const date = document.getElementById('taskDate')?.value || new Date().toISOString().split('T')[0];
    const groupName = (createState.groupName || 'CUSTOM').replace('*', '');
    
    const todayGroupTasks = state.tasks.filter(t => 
        t.date === date && t.groupName && 
        t.groupName.replace('*','').toUpperCase() === groupName.toUpperCase()
    );
    
    const startSeq = todayGroupTasks.length + 1;
    createState.activities.forEach((act, i) => {
        act.taskId = generateTaskId(date, groupName, startSeq + i);
    });
}

// ========== SAVE TASKS ==========
function handleSaveTask(e) {
    e.preventDefault();
    
    if (!validateNewTaskForm()) return;
    
    const date = document.getElementById('taskDate').value;
    const trade = document.getElementById('trade').value;
    
    // Make sure groupName is set - check both createState and the input field
    if (!createState.groupName) {
        const groupInput = document.getElementById('groupSearch').value.trim();
        if (groupInput) {
            createState.groupName = groupInput;
        } else {
            showToast('⚠️ Please select or create a Group');
            return;
        }
    }
    
    const groupName = createState.groupName;
    const workers = createState.selectedWorkers;
    
    // FIX DUPLICATION: Remove previously saved tasks from THIS save session first
    // So pressing Save again replaces, not duplicates
    if (state.lastSavedTaskIds && state.lastSavedTaskIds.length > 0) {
        state.tasks = state.tasks.filter(t => !state.lastSavedTaskIds.includes(t.id));
    }
    
    generateAllTaskIds();
    
    const sessionId = Date.now().toString();
    const newTasks = [];
    
    createState.activities.forEach((act, i) => {
        const taskName = document.getElementById(`taskName_${i}`)?.value?.trim() || '';
        const location = document.getElementById(`location_${i}`)?.value || '';
        const duration = parseFloat(document.getElementById(`duration_${i}`)?.value) || 8;
        
        // Read latest values from DOM into createState
        createState.activities[i].taskName = taskName;
        createState.activities[i].location = location;
        createState.activities[i].duration = duration;
        
        const task = {
            id: sessionId + '_' + i,
            date: date,
            taskIdentifier: act.taskId || generateTaskId(date, groupName, i + 1),
            groupName: groupName,
            teamName: groupName,
            taskName: taskName,
            location: location,
            trade: trade,
            mainActivity: act.mainActivity,
            activity: act.activity,
            workers: workers.map(w => ({...w})), // copy workers
            hours: duration,
            targetQuantity: act.targetQty,
            unit: act.unit || '',
            rate: act.rate,
            actualQuantity: null,
            productivity: null,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        state.tasks.push(task);
        newTasks.push(task);
    });
    
    state.lastSavedTask = newTasks[0];
    state.lastSavedTaskIds = newTasks.map(t => t.id);
    state.editingTaskId = null;
    
    // Update currentDate to match saved task date so Home screen shows it
    state.currentDate = date;
    
    saveStateToStorage();
    
    document.getElementById('shareTaskBtn').disabled = false;
    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (deleteBtn) deleteBtn.disabled = false;
    document.getElementById('saveTaskBtn').textContent = 'Save Tasks';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    const count = newTasks.length;
    showToast(`✓ ${count} task${count > 1 ? 's' : ''} saved! Share or go to Home.`);
}

function validateNewTaskForm() {
    let valid = true;
    
    if (!document.getElementById('trade').value) {
        showToast('⚠️ Please select a Trade'); valid = false;
    } else if (!createState.groupName && !document.getElementById('groupSearch').value) {
        showToast('⚠️ Please select or create a Group'); valid = false;
    } else if (createState.selectedWorkers.length === 0) {
        showToast('⚠️ Please add at least one worker'); valid = false;
    } else {
        const maxHours = (state.companyData.standardHours || 8) + (state.companyData.overtimeHours || 2);
        if (getTotalHours() > maxHours) {
            showToast(`⚠️ Total hours exceed maximum (${maxHours}hrs)`); valid = false;
        }
        createState.activities.forEach((act, i) => {
            const taskName = document.getElementById(`taskName_${i}`)?.value?.trim();
            if (!taskName) { showToast(`⚠️ Activity ${i+1}: Please enter a Task Name`); valid = false; }
        });
    }
    
    return valid;
}

// ========== MANAGE GROUPS IN SETTINGS ==========
function manageGroups() {
    const groups = state.groups || [];
    
    const html = `
        <div style="margin-bottom:16px;">
            ${groups.map(g => {
                const leader = state.workers.find(w => w.id === g.leaderId);
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border);">
                        <div>
                            <div style="font-weight:700;">👥 ${g.name}</div>
                            <div style="font-size:12px; color:var(--text-muted);">
                                ${g.memberIds.length} workers${leader ? ' · ⭐ ' + leader.name.split(' ')[0] : ''}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-secondary" onclick="editGroupInSettings('${g.id}')" style="padding:6px 12px; font-size:13px;">Edit</button>
                            <button class="btn-secondary" onclick="deleteGroup('${g.id}')" style="padding:6px 12px; font-size:13px; color:#d63031;">Delete</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <button class="btn-primary" onclick="createNewGroupInSettings()" style="width:100%;">+ Create New Group</button>
    `;
    
    showModal('Manage Groups', html);
}

function editGroupInSettings(groupId) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return;
    
    const members = group.memberIds.map(id => state.workers.find(w => w.id === id)).filter(Boolean);
    
    const html = `
        <div style="margin-bottom:12px;">
            <label style="font-size:13px; font-weight:600;">Group Name</label>
            <input type="text" id="editGroupName" value="${group.name}" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:6px; box-sizing:border-box;">
        </div>
        <div style="font-size:13px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">MEMBERS</div>
        <div id="editGroupMembers">
            ${members.map(w => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
                    <span>${w.isLeader ? '⭐ ' : ''}${w.name} <span style="color:var(--text-muted); font-size:12px;">(${w.occupation})</span></span>
                    <button onclick="removeFromGroup('${groupId}', ${w.id})" style="background:none;border:none;color:#d63031;cursor:pointer;font-size:18px;font-weight:700;">−</button>
                </div>
            `).join('')}
        </div>
        <input type="text" id="addToGroupSearch" placeholder="Search to add worker..." 
               style="width:100%; padding:10px; border:1px dashed var(--border); border-radius:8px; margin-top:12px; box-sizing:border-box;"
               oninput="searchWorkerForGroup('${groupId}', this.value)">
        <div id="addToGroupResults"></div>
        <button class="btn-primary" onclick="saveGroupEdits('${groupId}')" style="width:100%; margin-top:16px;">Save Group</button>
    `;
    
    showModal(`Edit Group: ${group.name}`, html);
}

function removeFromGroup(groupId, workerId) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return;
    group.memberIds = group.memberIds.filter(id => id !== workerId);
    saveStateToStorage();
    editGroupInSettings(groupId);
}

function searchWorkerForGroup(groupId, query) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group || !query) { document.getElementById('addToGroupResults').innerHTML = ''; return; }
    
    const workers = state.workers.filter(w => 
        !group.memberIds.includes(w.id) &&
        (w.name.toLowerCase().includes(query.toLowerCase()) || w.occupation.toLowerCase().includes(query.toLowerCase()))
    );
    
    document.getElementById('addToGroupResults').innerHTML = `<div class="suggestions-list">` +
        workers.slice(0, 5).map(w => `
            <div class="group-suggestion-item" onclick="addToGroup('${groupId}', ${w.id})">
                ${w.name} <span style="color:var(--text-muted);font-size:12px;">${w.occupation}</span>
            </div>
        `).join('') + `</div>`;
}

function addToGroup(groupId, workerId) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return;
    if (!group.memberIds.includes(workerId)) group.memberIds.push(workerId);
    saveStateToStorage();
    editGroupInSettings(groupId);
}

function saveGroupEdits(groupId) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return;
    const newName = document.getElementById('editGroupName')?.value?.trim();
    if (newName) group.name = newName;
    saveStateToStorage();
    closeGenericModal();
    showToast('✓ Group saved!');
}

function deleteGroup(groupId) {
    if (!confirm('Delete this group? Workers will not be deleted.')) return;
    state.groups = (state.groups || []).filter(g => g.id !== groupId);
    saveStateToStorage();
    closeGenericModal();
    showToast('Group deleted');
}

function createNewGroupInSettings() {
    const name = prompt('Group name:');
    if (!name) return;
    const newGroup = {
        id: name.toUpperCase().replace(/\s/g, ''),
        name: name.toUpperCase(),
        leaderId: null,
        memberIds: [],
        tradeTag: 'General'
    };
    if (!state.groups) state.groups = [];
    state.groups.push(newGroup);
    saveStateToStorage();
    editGroupInSettings(newGroup.id);
}


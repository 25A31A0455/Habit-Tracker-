/* ============================================================
   HabitFlow — Habit Tracker & Student Life Organizer
   ============================================================ */

(function () {
    'use strict';

    // ─── Default Habits ─────────────────────────────────────
    const DEFAULT_HABITS = [
        'Wake up at 5 AM',
        'Gym',
        'Study',
        'Reading',
        'Coding Practice',
        'Budget Tracking',
        'Project Work',
        'Social Media Detox',
        'Goal Journaling',
        'Cold Shower'
    ];

    // ─── State ──────────────────────────────────────────────
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    let habits = [];
    let checkData = {}; // { "YYYY-MM": { "habitIndex-day": true } }
    let consistencyChart = null;

    // ─── Storage Keys ───────────────────────────────────────
    function storageKey(prefix) {
        const mm = String(currentMonth + 1).padStart(2, '0');
        return `habitflow_${prefix}_${currentYear}_${mm}`;
    }

    function globalKey(key) {
        return `habitflow_${key}`;
    }

    // ─── Load / Save ────────────────────────────────────────
    function loadData() {
        const habitsRaw = localStorage.getItem(storageKey('habits'));
        habits = habitsRaw ? JSON.parse(habitsRaw) : [...DEFAULT_HABITS];

        const checkRaw = localStorage.getItem(storageKey('checks'));
        checkData = checkRaw ? JSON.parse(checkRaw) : {};
    }

    function saveData() {
        localStorage.setItem(storageKey('habits'), JSON.stringify(habits));
        localStorage.setItem(storageKey('checks'), JSON.stringify(checkData));
    }

    // ─── Calendar Helpers ───────────────────────────────────
    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    function getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay(); // 0=Sun
    }

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    function getWeeks(year, month) {
        const daysInMonth = getDaysInMonth(year, month);
        const weeks = [];
        let week = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dow = new Date(year, month, d).getDay(); // 0=Sun
            if (dow === 0 && week.length > 0) {
                weeks.push(week);
                week = [];
            }
            week.push({ day: d, dow });
        }
        if (week.length) weeks.push(week);
        return weeks;
    }

    function isToday(day) {
        const now = new Date();
        return now.getFullYear() === currentYear && now.getMonth() === currentMonth && now.getDate() === day;
    }

    // ─── Check key ──────────────────────────────────────────
    function checkKey(habitIdx, day) {
        return `${habitIdx}-${day}`;
    }

    function isChecked(habitIdx, day) {
        return !!checkData[checkKey(habitIdx, day)];
    }

    function toggleCheck(habitIdx, day) {
        const key = checkKey(habitIdx, day);
        if (checkData[key]) {
            delete checkData[key];
        } else {
            checkData[key] = true;
        }
        saveData();
    }

    // ─── Progress Calculations ──────────────────────────────
    function getDailyCompletion(day) {
        let done = 0;
        habits.forEach((_, idx) => {
            if (isChecked(idx, day)) done++;
        });
        return habits.length ? Math.round((done / habits.length) * 100) : 0;
    }

    function getHabitMonthlyProgress(habitIdx) {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        let done = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            if (isChecked(habitIdx, d)) done++;
        }
        return habits.length > 0 ? Math.round((done / daysInMonth) * 100) : 0;
    }

    function getOverallMonthlyProgress() {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const total = habits.length * daysInMonth;
        if (!total) return 0;
        let done = 0;
        habits.forEach((_, idx) => {
            for (let d = 1; d <= daysInMonth; d++) {
                if (isChecked(idx, d)) done++;
            }
        });
        return Math.round((done / total) * 100);
    }

    function getCompletedToday() {
        const now = new Date();
        if (now.getMonth() !== currentMonth || now.getFullYear() !== currentYear) return 0;
        const today = now.getDate();
        let done = 0;
        habits.forEach((_, idx) => {
            if (isChecked(idx, today)) done++;
        });
        return done;
    }

    // ─── DOM Refs ───────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ─── Render Month Title & Stats ─────────────────────────
    function renderMonthHeader() {
        $('#monthTitle').textContent = MONTH_NAMES[currentMonth];
        $('#monthYear').textContent = currentYear;
        $('#totalHabits').textContent = habits.length;
        $('#completedToday').textContent = getCompletedToday();

        const pct = getOverallMonthlyProgress();
        $('#monthProgress').textContent = pct + '%';

        // Mini progress ring
        const circle = $('.progress-ring-mini-circle');
        if (circle) {
            const circumference = 2 * Math.PI * 16; // r=16
            const offset = circumference - (pct / 100) * circumference;
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = offset;
        }
    }

    // ─── Render Monthly Tracker Table ───────────────────────
    function renderTrackerTable() {
        const table = $('#trackerTable');
        const weeks = getWeeks(currentYear, currentMonth);
        const totalDays = getDaysInMonth(currentYear, currentMonth);

        // Build flat day arrays per week
        // We want columns: Habit Name | (for each week: 7 day columns) | Progress
        // Each week block: Sa Su Mo Tu We Th Fr  (start from Saturday? No — standard: Su Mo Tu We Th Fr Sa)
        // Actually reference images show: Sa Su Mo Tu We Th Fr — let's use Su Mo Tu We Th Fr Sa per standard

        // Structure: one header section, then habit rows
        // Weeks are grouped in header

        // Build column structure
        // Columns: [habit name] [week1: up to 7 day cols] [week2: up to 7 cols] ... [progress]

        // Flatten: figure out which days belong to which week column
        // We'll use a 7-col per week approach: Sun..Sat

        // Build week data with proper slots
        const weekSlots = []; // array of arrays, each inner = 7 slots (null or day number)
        weeks.forEach(wk => {
            const slots = [null, null, null, null, null, null, null]; // Sun=0 through Sat=6
            wk.forEach(d => {
                slots[d.dow] = d.day;
            });
            weekSlots.push(slots);
        });

        let html = '';

        // ── THEAD: Week labels row ──
        html += '<thead>';
        html += '<tr>';
        html += '<th class="habit-name-cell" rowspan="2" style="text-align:left;min-width:160px;">Habit</th>';
        weekSlots.forEach((_, wi) => {
            html += `<th colspan="7" style="border-left:2px solid var(--border);">Week ${wi + 1}</th>`;
        });
        html += '<th rowspan="2" class="progress-cell">Progress</th>';
        html += '</tr>';

        // ── Day names sub-row ──
        html += '<tr>';
        weekSlots.forEach((_, wi) => {
            DAY_SHORT.forEach((dn, di) => {
                const borderLeft = di === 0 ? 'border-left:2px solid var(--border);' : '';
                html += `<th class="day-header" style="${borderLeft}">${dn}</th>`;
            });
        });
        html += '</tr>';

        // ── Date numbers sub-row ──
        html += '<tr>';
        html += '<td class="week-label-cell" style="background:var(--bg-table-header);font-size:0.7rem;color:var(--text-muted);">Dates →</td>';
        weekSlots.forEach((slots, wi) => {
            slots.forEach((day, di) => {
                const borderLeft = di === 0 ? 'border-left:2px solid var(--border);' : '';
                const todayClass = day && isToday(day) ? 'date-today' : '';
                html += `<td class="date-header ${todayClass}" style="${borderLeft}">${day || ''}</td>`;
            });
        });
        html += '<td class="date-header" style="color:var(--text-muted);font-size:0.65rem;">Monthly</td>';
        html += '</tr>';
        html += '</thead>';

        // ── TBODY: Habit rows ──
        html += '<tbody>';
        habits.forEach((habit, hIdx) => {
            html += '<tr>';
            html += `<td class="habit-name-cell">
                <div class="habit-name-inner">
                    <span class="habit-name-text" title="${habit}">${habit}</span>
                    <button class="habit-delete-btn" data-habit-idx="${hIdx}" title="Delete habit">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </td>`;

            weekSlots.forEach((slots, wi) => {
                slots.forEach((day, di) => {
                    const borderLeft = di === 0 ? 'border-left:2px solid var(--border);' : '';
                    if (day === null) {
                        html += `<td class="checkbox-cell empty" style="${borderLeft}"><div class="cb-inner"></div></td>`;
                    } else {
                        const checked = isChecked(hIdx, day);
                        html += `<td class="checkbox-cell ${checked ? 'checked' : ''}" data-habit="${hIdx}" data-day="${day}" style="${borderLeft}">
                            <div class="cb-inner">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                        </td>`;
                    }
                });
            });

            // Progress cell
            const pct = getHabitMonthlyProgress(hIdx);
            html += `<td class="progress-cell">
                <div class="progress-cell-bar">
                    <div class="progress-bar-mini"><div class="progress-bar-mini-fill" style="width:${pct}%"></div></div>
                    <span class="progress-pct">${pct}%</span>
                </div>
            </td>`;
            html += '</tr>';
        });

        // ── Daily Completion Row ──
        html += '<tr class="daily-completion-row">';
        html += '<td class="daily-completion-label">Daily %</td>';
        weekSlots.forEach((slots, wi) => {
            slots.forEach((day, di) => {
                const borderLeft = di === 0 ? 'border-left:2px solid var(--border);' : '';
                if (day === null) {
                    html += `<td style="${borderLeft}"></td>`;
                } else {
                    const pct = getDailyCompletion(day);
                    html += `<td style="${borderLeft}${pct === 100 ? 'color:var(--primary);font-weight:700;' : ''}">${pct}%</td>`;
                }
            });
        });
        // Overall
        const overall = getOverallMonthlyProgress();
        html += `<td style="font-weight:700;color:var(--primary);">${overall}%</td>`;
        html += '</tr>';

        html += '</tbody>';

        table.innerHTML = html;

        // Attach click handlers
        table.querySelectorAll('.checkbox-cell:not(.empty)').forEach(cell => {
            cell.addEventListener('click', function () {
                const hIdx = parseInt(this.dataset.habit);
                const day = parseInt(this.dataset.day);
                toggleCheck(hIdx, day);
                renderAll();
            });
        });

        // Delete buttons
        table.querySelectorAll('.habit-delete-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.habitIdx);
                deleteHabit(idx);
            });
        });
    }

    // ─── Weekly Progress Cards ──────────────────────────────
    function renderWeeklyCards() {
        const container = $('#weeklyCards');
        const now = new Date();
        const todayDay = (now.getFullYear() === currentYear && now.getMonth() === currentMonth) ? now.getDate() : null;

        // Find current week (the week containing today, or the last week)
        const weeks = getWeeks(currentYear, currentMonth);
        let targetWeekIdx = weeks.length - 1;
        if (todayDay) {
            weeks.forEach((wk, wi) => {
                if (wk.some(d => d.day === todayDay)) targetWeekIdx = wi;
            });
        }

        const targetWeek = weeks[targetWeekIdx];
        // Expand to full 7-day week
        const weekDays = [];
        // Find the Sunday of this week
        const firstDayInWeek = targetWeek[0];
        const firstDate = new Date(currentYear, currentMonth, firstDayInWeek.day);
        const sundayDate = new Date(firstDate);
        sundayDate.setDate(sundayDate.getDate() - sundayDate.getDay());

        for (let i = 0; i < 7; i++) {
            const d = new Date(sundayDate);
            d.setDate(d.getDate() + i);
            const inMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            weekDays.push({
                dateObj: d,
                day: d.getDate(),
                dow: d.getDay(),
                inMonth
            });
        }

        let html = '';
        weekDays.forEach(wd => {
            const dayName = DAY_FULL[wd.dow];
            const dateStr = wd.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            let pct = 0;
            let checklist = '';

            if (wd.inMonth) {
                pct = getDailyCompletion(wd.day);

                // Build mini checklist (first 5 habits)
                const showHabits = habits.slice(0, 5);
                showHabits.forEach((h, idx) => {
                    const done = isChecked(idx, wd.day);
                    checklist += `
                        <div class="weekly-checklist-item ${done ? 'done' : ''}">
                            <div class="weekly-checklist-dot"></div>
                            <span class="weekly-checklist-name">${h}</span>
                        </div>`;
                });
                if (habits.length > 5) {
                    checklist += `<div class="weekly-checklist-item" style="color:var(--text-muted);font-style:italic;">+${habits.length - 5} more</div>`;
                }
            }

            const circumference = 2 * Math.PI * 32;
            const offset = circumference - (pct / 100) * circumference;

            const isActive = todayDay && wd.day === todayDay && wd.inMonth;

            html += `
            <div class="weekly-card" style="${isActive ? 'border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-ring);' : ''}${!wd.inMonth ? 'opacity:0.4;' : ''}">
                <div class="weekly-card-header">
                    <div class="weekly-card-day">${dayName}</div>
                    <div class="weekly-card-date">${dateStr}</div>
                </div>
                <div class="progress-ring-wrap">
                    <svg class="progress-ring-svg" viewBox="0 0 80 80">
                        <circle class="progress-ring-bg" cx="40" cy="40" r="32"/>
                        <circle class="progress-ring-fill" cx="40" cy="40" r="32"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${offset}"/>
                    </svg>
                    <span class="progress-ring-text">${pct}%</span>
                </div>
                <div class="weekly-card-checklist">
                    ${checklist}
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }

    // ─── Consistency Chart ──────────────────────────────────
    function renderConsistencyChart() {
        const ctx = $('#consistencyChart').getContext('2d');
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const labels = [];
        const data = [];

        for (let d = 1; d <= daysInMonth; d++) {
            labels.push(d);
            data.push(getDailyCompletion(d));
        }

        const isDark = document.body.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#9ca3af' : '#6b7280';

        if (consistencyChart) {
            consistencyChart.destroy();
        }

        consistencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Completion %',
                    data,
                    borderColor: '#22c55e',
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx: c, chartArea } = chart;
                        if (!chartArea) return 'rgba(34,197,94,0.1)';
                        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(34,197,94,0.25)');
                        gradient.addColorStop(1, 'rgba(34,197,94,0.02)');
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2.5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1a1f1c' : '#fff',
                        titleColor: isDark ? '#f1f5f3' : '#1a1a1a',
                        bodyColor: isDark ? '#9ca3af' : '#6b7280',
                        borderColor: isDark ? '#2d3532' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            title: (items) => `Day ${items[0].label}`,
                            label: (item) => `Completion: ${item.raw}%`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor, drawBorder: false },
                        ticks: {
                            color: textColor,
                            font: { size: 11, family: "'Inter', sans-serif" },
                            maxTicksLimit: 15
                        },
                        title: {
                            display: true,
                            text: 'Day of Month',
                            color: textColor,
                            font: { size: 12, family: "'Inter', sans-serif", weight: 500 }
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: gridColor, drawBorder: false },
                        ticks: {
                            color: textColor,
                            font: { size: 11, family: "'Inter', sans-serif" },
                            callback: v => v + '%',
                            stepSize: 20
                        },
                        title: {
                            display: true,
                            text: 'Completion %',
                            color: textColor,
                            font: { size: 12, family: "'Inter', sans-serif", weight: 500 }
                        }
                    }
                }
            }
        });
    }

    // ─── Render All ─────────────────────────────────────────
    function renderAll() {
        renderMonthHeader();
        renderTrackerTable();
        renderWeeklyCards();
        renderConsistencyChart();
    }

    // ─── Add Habit ──────────────────────────────────────────
    function addHabit(name) {
        name = name.trim();
        if (!name) return;
        if (habits.includes(name)) return;
        habits.push(name);
        saveData();
        renderAll();
    }

    // ─── Delete Habit ───────────────────────────────────────
    function deleteHabit(idx) {
        if (idx < 0 || idx >= habits.length) return;

        // Remove check data for this habit and reindex
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const newCheckData = {};

        habits.forEach((_, hIdx) => {
            if (hIdx === idx) return; // skip deleted
            const newIdx = hIdx > idx ? hIdx - 1 : hIdx;
            for (let d = 1; d <= daysInMonth; d++) {
                if (isChecked(hIdx, d)) {
                    newCheckData[checkKey(newIdx, d)] = true;
                }
            }
        });

        habits.splice(idx, 1);
        checkData = newCheckData;
        saveData();
        renderAll();
    }

    // ─── Reset Month ────────────────────────────────────────
    function resetMonth() {
        checkData = {};
        saveData();
        renderAll();
    }

    // ─── Month Navigation ───────────────────────────────────
    function navigateMonth(delta) {
        currentMonth += delta;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        } else if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        loadData();
        renderAll();
    }

    // ─── Dark Mode ──────────────────────────────────────────
    function initDarkMode() {
        const saved = localStorage.getItem(globalKey('darkMode'));
        if (saved === 'true') {
            document.body.classList.add('dark');
            updateDarkModeIcons(true);
        }
    }

    function toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem(globalKey('darkMode'), isDark);
        updateDarkModeIcons(isDark);
        renderConsistencyChart(); // re-render chart with correct theme
    }

    function updateDarkModeIcons(isDark) {
        const sun = $('.icon-sun');
        const moon = $('.icon-moon');
        if (isDark) {
            sun.style.display = 'none';
            moon.style.display = 'block';
        } else {
            sun.style.display = 'block';
            moon.style.display = 'none';
        }
    }

    // ─── Sticky Header Scroll ───────────────────────────────
    function initStickyScroll() {
        const header = $('#stickyHeader');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // ─── Modal Helpers ──────────────────────────────────────
    function showModal(id) {
        const modal = $(`#${id}`);
        modal.classList.add('show');
        const input = modal.querySelector('input');
        if (input) {
            setTimeout(() => input.focus(), 200);
        }
    }

    function hideModal(id) {
        $(`#${id}`).classList.remove('show');
    }

    // ─── Event Bindings ─────────────────────────────────────
    function bindEvents() {
        // Add Habit
        $('#addHabitBtn').addEventListener('click', () => showModal('addHabitModal'));
        $('#closeModalBtn').addEventListener('click', () => hideModal('addHabitModal'));
        $('#cancelModalBtn').addEventListener('click', () => hideModal('addHabitModal'));
        $('#confirmAddHabit').addEventListener('click', () => {
            const input = $('#newHabitInput');
            addHabit(input.value);
            input.value = '';
            hideModal('addHabitModal');
        });
        $('#newHabitInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const input = $('#newHabitInput');
                addHabit(input.value);
                input.value = '';
                hideModal('addHabitModal');
            }
        });

        // Reset
        $('#resetMonthBtn').addEventListener('click', () => showModal('resetModal'));
        $$('.close-reset-modal').forEach(btn => {
            btn.addEventListener('click', () => hideModal('resetModal'));
        });
        $('#confirmReset').addEventListener('click', () => {
            resetMonth();
            hideModal('resetModal');
        });

        // Month nav
        $('#prevMonthBtn').addEventListener('click', () => navigateMonth(-1));
        $('#nextMonthBtn').addEventListener('click', () => navigateMonth(1));

        // Dark mode
        $('#darkModeToggle').addEventListener('click', toggleDarkMode);

        // Close modals on overlay click
        $$('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('show');
                }
            });
        });

        // ESC to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                $$('.modal-overlay.show').forEach(m => m.classList.remove('show'));
            }
        });
    }

    // ─── Init ───────────────────────────────────────────────
    function init() {
        initDarkMode();
        initStickyScroll();
        loadData();
        renderAll();
        bindEvents();
    }

    // Wait for DOM & Chart.js
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

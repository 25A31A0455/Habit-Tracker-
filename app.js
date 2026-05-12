// ============ STATE & STORAGE ============
let currentUser = JSON.parse(localStorage.getItem('svas_currentUser')) || null;
let users = JSON.parse(localStorage.getItem('svas_users')) || [];
let requests = JSON.parse(localStorage.getItem('svas_requests')) || [];
let selectedRole = 'user';
let regRole = 'user';
let preselectedRole = null; // tracks role chosen from homepage

function save() {
  localStorage.setItem('svas_currentUser', JSON.stringify(currentUser));
  localStorage.setItem('svas_users', JSON.stringify(users));
  localStorage.setItem('svas_requests', JSON.stringify(requests));
}

// ============ SEED DEMO DATA ============
function seedData() {
  if (localStorage.getItem('svas_seeded')) return;
  users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@demo.com', password: 'demo', role: 'user', location: 'Downtown' },
    { id: 2, name: 'Bob Smith', email: 'bob@demo.com', password: 'demo', role: 'volunteer', location: 'Downtown', skills: ['Food', 'Health', 'Emergency'] },
    { id: 3, name: 'Carol Lee', email: 'carol@demo.com', password: 'demo', role: 'volunteer', location: 'Westside', skills: ['Education', 'Shelter', 'Water'] },
  ];
  requests = [
    { id: 1, title: 'Food supplies needed for elderly', category: 'Food', priority: 'High', location: 'Downtown', people: 12, description: 'A group of elderly residents need food supply assistance.', status: 'Pending', userId: 1, volunteerId: null, createdAt: Date.now() - 86400000 },
    { id: 2, title: 'Medical camp volunteers required', category: 'Health', priority: 'Medium', location: 'Eastside', people: 50, description: 'Free medical camp needs volunteer doctors and nurses.', status: 'Pending', userId: 1, volunteerId: null, createdAt: Date.now() - 43200000 },
    { id: 3, title: 'Temporary shelter setup', category: 'Shelter', priority: 'High', location: 'Westside', people: 25, description: 'Families displaced due to flooding need temporary shelter.', status: 'In Progress', userId: 1, volunteerId: 3, createdAt: Date.now() - 172800000 },
    { id: 4, title: 'Clean water distribution', category: 'Water', priority: 'High', location: 'Southend', people: 100, description: 'Clean drinking water needed for affected neighborhood.', status: 'Pending', userId: 1, volunteerId: null, createdAt: Date.now() - 3600000 },
    { id: 5, title: 'Tutoring for displaced children', category: 'Education', priority: 'Low', location: 'Downtown', people: 15, description: 'Children need tutoring while schools are closed.', status: 'Completed', userId: 1, volunteerId: 2, createdAt: Date.now() - 604800000 },
    { id: 6, title: 'Emergency rescue coordination', category: 'Emergency', priority: 'High', location: 'Downtown', people: 30, description: 'Urgent coordination needed for flood rescue operations.', status: 'Pending', userId: 1, volunteerId: null, createdAt: Date.now() - 1800000 },
  ];
  localStorage.setItem('svas_seeded', 'true');
  save();
}
seedData();

// ============ NAVIGATION ============
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => a.classList.remove('active'));

  if (page === 'dashboard') {
    if (!currentUser) { navigate('login'); return; }
    page = currentUser.role === 'volunteer' ? 'volunteer-dashboard' : 'user-dashboard';
  }

  // When navigating to login/register, apply preselected role
  if (page === 'login' && preselectedRole) {
    setTimeout(() => selectRole(preselectedRole), 0);
  }
  if (page === 'register' && preselectedRole) {
    setTimeout(() => selectRegRole(preselectedRole), 0);
  }

  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); }

  const navA = document.querySelector(`.nav-links a[data-page="${page === 'user-dashboard' || page === 'volunteer-dashboard' ? 'dashboard' : page}"]`);
  if (navA) navA.classList.add('active');

  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'user-dashboard') renderUserDashboard();
  if (page === 'volunteer-dashboard') renderVolunteerDashboard();
}

// Role preselection from homepage buttons - no duplicate asking
function goLoginWithRole(role) {
  preselectedRole = role;
  selectedRole = role;
  regRole = role;
  navigate('login');
}

function updateNav() {
  const logged = !!currentUser;
  document.getElementById('navLogin').style.display = logged ? 'none' : '';
  document.getElementById('navDashboard').style.display = logged ? '' : 'none';
  document.getElementById('profileMenu').style.display = logged ? '' : 'none';

  if (logged) {
    document.getElementById('profileTrigger').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileRole').textContent = currentUser.role === 'volunteer' ? '🤝 Volunteer' : '🙋 Help Seeker';
  }
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ============ PROFILE DROPDOWN ============
function toggleProfileDropdown() {
  document.getElementById('profileDropdown').classList.toggle('open');
}
function closeProfileDropdown() {
  document.getElementById('profileDropdown').classList.remove('open');
}
// Close dropdown on outside click
document.addEventListener('click', function(e) {
  const menu = document.getElementById('profileMenu');
  if (menu && !menu.contains(e.target)) closeProfileDropdown();
});

// ============ SWITCH ROLE ============
function switchRole() {
  if (!currentUser) return;
  currentUser.role = currentUser.role === 'volunteer' ? 'user' : 'volunteer';
  if (currentUser.role === 'volunteer' && !currentUser.skills) {
    currentUser.skills = ['Food', 'Health'];
  }
  save(); updateNav(); closeProfileDropdown();
  showToast('Switched to ' + (currentUser.role === 'volunteer' ? 'Volunteer' : 'Help Seeker') + ' mode', 'success');
  navigate('dashboard');
}

// ============ THEME ============
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
  document.getElementById('themeToggle').textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('svas_theme', isDark ? 'light' : 'dark');
}
(function loadTheme() {
  const t = localStorage.getItem('svas_theme');
  if (t === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); document.getElementById('themeToggle').textContent = '☀️'; }
})();

// ============ NAVBAR SCROLL EFFECT ============
window.addEventListener('scroll', function() {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 30);
});

// ============ HERO PARTICLES ============
(function createParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span');
    const size = Math.random() * 60 + 10;
    s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:-${size}px;animation-duration:${Math.random()*8+6}s;animation-delay:${Math.random()*6}s;`;
    container.appendChild(s);
  }
})();

// ============ AUTH ============
function selectRole(role) {
  selectedRole = role;
  document.getElementById('role-user').classList.toggle('active', role === 'user');
  document.getElementById('role-volunteer').classList.toggle('active', role === 'volunteer');
  document.getElementById('skillsGroup').style.display = role === 'volunteer' ? '' : 'none';
  document.getElementById('locationGroup').style.display = role === 'volunteer' ? '' : 'none';
}

function selectRegRole(role) {
  regRole = role;
  document.getElementById('reg-role-user').classList.toggle('active', role === 'user');
  document.getElementById('reg-role-volunteer').classList.toggle('active', role === 'volunteer');
  document.getElementById('regSkillsGroup').style.display = role === 'volunteer' ? '' : 'none';
  document.getElementById('regLocationGroup').style.display = role === 'volunteer' ? '' : 'none';
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  let user = users.find(u => u.email === email && u.password === pass && u.role === selectedRole);
  if (!user) {
    const skills = selectedRole === 'volunteer' ? [...document.querySelectorAll('#skillsGroup input:checked')].map(c => c.value) : [];
    const loc = document.getElementById('volLocation').value.trim() || 'Downtown';
    user = { id: Date.now(), name: email.split('@')[0], email, password: pass, role: selectedRole, location: loc, skills };
    users.push(user);
  }
  currentUser = user;
  preselectedRole = null;
  save(); updateNav();
  showToast('Welcome back, ' + user.name + '!', 'success');
  navigate('dashboard');
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value;
  if (users.find(u => u.email === email)) { showToast('Email already registered', 'error'); return; }
  const skills = regRole === 'volunteer' ? [...document.querySelectorAll('.reg-skill:checked')].map(c => c.value) : [];
  const loc = document.getElementById('regLocation').value.trim() || 'Downtown';
  const user = { id: Date.now(), name, email, password: pass, role: regRole, location: loc, skills };
  users.push(user);
  currentUser = user;
  preselectedRole = null;
  save(); updateNav();
  showToast('Account created! Welcome, ' + name, 'success');
  navigate('dashboard');
}

function logout() {
  currentUser = null;
  closeProfileDropdown();
  save(); updateNav();
  showToast('Logged out successfully', 'info');
  navigate('home');
}

// ============ TOAST ============
function showToast(message, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + message;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ============ REPORT ISSUE ============
function openReportModal() { document.getElementById('reportModal').classList.add('active'); }
function closeReportModal() { document.getElementById('reportModal').classList.remove('active'); }

function handleReport(e) {
  e.preventDefault();
  const cat = document.getElementById('issueCategory').value;
  const req = {
    id: Date.now(),
    title: document.getElementById('issueTitle').value.trim(),
    category: cat,
    priority: cat === 'Emergency' ? 'High' : document.getElementById('issuePriority').value,
    location: document.getElementById('issueLocation').value.trim(),
    people: parseInt(document.getElementById('issuePeople').value),
    description: document.getElementById('issueDesc').value.trim(),
    status: 'Pending',
    userId: currentUser.id,
    volunteerId: null,
    createdAt: Date.now()
  };
  requests.push(req);
  save();
  closeReportModal();
  e.target.reset();
  showToast('Issue reported successfully!', 'success');
  renderUserDashboard();
}

function handleContact(e) {
  e.preventDefault();
  showToast('Message sent! We\'ll get back to you soon.', 'success');
  e.target.reset();
}

// ============ TABS ============
function switchTab(btn, tabId) {
  const container = btn.closest('.dashboard') || btn.closest('.page');
  container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  container.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// Click a tab by its ID programmatically (for clickable stat cards)
function activateTab(dashboardPageId, tabId) {
  const page = document.getElementById(dashboardPageId);
  if (!page) return;
  const tabBtn = page.querySelector(`.tab-btn[onclick*="${tabId}"]`);
  if (tabBtn) {
    switchTab(tabBtn, tabId);
    // Smooth scroll to tabs
    const tabs = page.querySelector('.tabs');
    if (tabs) tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============ CARD RENDERER ============
function priorityBadge(p) {
  const cls = p === 'High' ? 'badge-high' : p === 'Medium' ? 'badge-medium' : 'badge-low';
  return `<span class="badge ${cls}">${p}</span>`;
}
function statusBadge(s) {
  const cls = s === 'Pending' ? 'badge-pending' : s === 'In Progress' ? 'badge-progress' : 'badge-completed';
  return `<span class="badge ${cls}">${s}</span>`;
}
function categoryIcon(c) {
  const icons = { Food: '🍲', Health: '🏥', Education: '📚', Shelter: '🏠', Water: '💧', Emergency: '🚨' };
  return icons[c] || '📋';
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function renderRequestCard(req, actions = '') {
  const vol = req.volunteerId ? users.find(u => u.id === req.volunteerId) : null;
  const isEmergency = req.category === 'Emergency';
  const extraClass = isEmergency ? ' emergency-card' : '';
  const prioBadge = isEmergency ? '<span class="badge badge-emergency">🚨 EMERGENCY</span>' : priorityBadge(req.priority);
  return `<div class="request-card${extraClass}">
    <div class="card-header"><h3>${categoryIcon(req.category)} ${req.title}</h3>${prioBadge}</div>
    <div class="card-meta">
      <span>📂 ${req.category}</span><span>📍 ${req.location}</span>
      <span>👥 ${req.people} affected</span><span>🕐 ${timeAgo(req.createdAt)}</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center">${statusBadge(req.status)}</div>
    ${vol ? `<div class="assigned-vol">👤 Assigned: ${vol.name}</div>` : ''}
    ${req.description ? `<p style="margin-top:10px;font-size:0.85rem;color:var(--text-secondary);line-height:1.5">${req.description.substring(0, 120)}${req.description.length > 120 ? '...' : ''}</p>` : ''}
    ${actions ? `<div class="card-actions">${actions}</div>` : ''}
  </div>`;
}

function emptyState(icon, title, msg) {
  return `<div class="empty-state"><div class="icon">${icon}</div><h3>${title}</h3><p>${msg}</p></div>`;
}

// Sort emergency requests to top
function sortEmergencyFirst(list) {
  return list.sort((a, b) => {
    if (a.category === 'Emergency' && b.category !== 'Emergency') return -1;
    if (b.category === 'Emergency' && a.category !== 'Emergency') return 1;
    const pMap = { High: 0, Medium: 1, Low: 2 };
    return (pMap[a.priority] || 2) - (pMap[b.priority] || 2);
  });
}

// ============ USER DASHBOARD ============
function renderUserDashboard() {
  if (!currentUser) return;
  document.getElementById('userWelcome').textContent = 'Welcome, ' + currentUser.name + '!';
  const myReqs = requests.filter(r => r.userId === currentUser.id);
  const pending = sortEmergencyFirst(myReqs.filter(r => r.status === 'Pending'));
  const progress = myReqs.filter(r => r.status === 'In Progress');
  const completed = myReqs.filter(r => r.status === 'Completed');

  document.getElementById('userStats').innerHTML = `
    <div class="stat-card" data-tab="userAll" onclick="activateTab('page-user-dashboard','userAll')"><div class="stat-icon blue">📋</div><div class="stat-info"><h3>${myReqs.length}</h3><p>Total Requests</p></div></div>
    <div class="stat-card" data-tab="userPending" onclick="activateTab('page-user-dashboard','userPending')"><div class="stat-icon orange">⏳</div><div class="stat-info"><h3>${pending.length}</h3><p>Pending</p></div></div>
    <div class="stat-card" data-tab="userProgress" onclick="activateTab('page-user-dashboard','userProgress')"><div class="stat-icon blue">🔄</div><div class="stat-info"><h3>${progress.length}</h3><p>In Progress</p></div></div>
    <div class="stat-card" data-tab="userCompleted" onclick="activateTab('page-user-dashboard','userCompleted')"><div class="stat-icon green">✅</div><div class="stat-info"><h3>${completed.length}</h3><p>Completed</p></div></div>`;

  const renderCards = (list, containerId) => {
    const el = document.getElementById(containerId);
    el.innerHTML = list.length ? list.map(r => renderRequestCard(r)).join('') : emptyState('📭', 'No requests', 'No requests in this category yet.');
  };
  renderCards(sortEmergencyFirst([...myReqs]), 'userCardsAll');
  renderCards(pending, 'userCardsPending');
  renderCards(progress, 'userCardsProgress');
  renderCards(completed, 'userCardsCompleted');
}

// ============ VOLUNTEER DASHBOARD ============
function renderVolunteerDashboard() {
  if (!currentUser) return;
  document.getElementById('volWelcome').textContent = 'Welcome, ' + currentUser.name + '!';

  const myTasks = requests.filter(r => r.volunteerId === currentUser.id);
  const completedCount = myTasks.filter(r => r.status === 'Completed').length;
  const activeCount = myTasks.filter(r => r.status === 'In Progress').length;

  // Smart matching: filter by skills, sort by priority and location
  let available = requests.filter(r => r.status === 'Pending');
  if (currentUser.skills && currentUser.skills.length) {
    const matched = available.filter(r => currentUser.skills.includes(r.category));
    const unmatched = available.filter(r => !currentUser.skills.includes(r.category));
    available = [...matched, ...unmatched];
  }
  // Location preference + priority + emergency first
  available.sort((a, b) => {
    if (a.category === 'Emergency' && b.category !== 'Emergency') return -1;
    if (b.category === 'Emergency' && a.category !== 'Emergency') return 1;
    const aLoc = a.location === currentUser.location ? 0 : 1;
    const bLoc = b.location === currentUser.location ? 0 : 1;
    if (aLoc !== bLoc) return aLoc - bLoc;
    const pMap = { High: 0, Medium: 1, Low: 2 };
    return (pMap[a.priority] || 2) - (pMap[b.priority] || 2);
  });

  // Search & filter
  const search = (document.getElementById('volSearch')?.value || '').toLowerCase();
  const catFilter = document.getElementById('volCatFilter')?.value || '';
  if (search) available = available.filter(r => r.title.toLowerCase().includes(search) || r.category.toLowerCase().includes(search) || r.location.toLowerCase().includes(search));
  if (catFilter) available = available.filter(r => r.category === catFilter);

  document.getElementById('volStats').innerHTML = `
    <div class="stat-card" data-tab="volNearby" onclick="activateTab('page-volunteer-dashboard','volNearby')"><div class="stat-icon blue">📋</div><div class="stat-info"><h3>${available.length}</h3><p>Available Requests</p></div></div>
    <div class="stat-card" data-tab="volMyTasks" onclick="activateTab('page-volunteer-dashboard','volMyTasks')"><div class="stat-icon orange">🔄</div><div class="stat-info"><h3>${activeCount}</h3><p>Active Tasks</p></div></div>
    <div class="stat-card" data-tab="volMyTasks" onclick="activateTab('page-volunteer-dashboard','volMyTasks')"><div class="stat-icon green">✅</div><div class="stat-info"><h3>${completedCount}</h3><p>Completed</p></div></div>
    <div class="stat-card" data-tab="volProfile" onclick="activateTab('page-volunteer-dashboard','volProfile')"><div class="stat-icon red">⭐</div><div class="stat-info"><h3>${completedCount > 0 ? Math.min(5, (completedCount * 0.5 + 3.5)).toFixed(1) : '—'}</h3><p>Rating</p></div></div>`;

  // Nearby requests
  const nearbyEl = document.getElementById('volCardsNearby');
  nearbyEl.innerHTML = available.length
    ? available.map(r => renderRequestCard(r, `<button class="btn btn-success btn-sm" onclick="acceptTask(${r.id})">✋ Accept Task</button>`)).join('')
    : emptyState('🎉', 'All caught up!', 'No pending requests match your skills right now.');

  // My tasks
  const tasksEl = document.getElementById('volCardsMyTasks');
  tasksEl.innerHTML = myTasks.length
    ? myTasks.map(r => renderRequestCard(r, r.status === 'In Progress' ? `<button class="btn btn-success btn-sm" onclick="completeTask(${r.id})">✅ Mark Complete</button>` : '')).join('')
    : emptyState('📭', 'No tasks yet', 'Accept a request to get started.');

  // Profile
  document.getElementById('volProfileSection').innerHTML = `
    <div class="profile-section">
      <div class="profile-header">
        <div class="profile-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
        <div><h2>${currentUser.name}</h2><p style="color:var(--text-secondary)">${currentUser.email}</p><p style="color:var(--text-secondary);font-size:0.85rem">📍 ${currentUser.location || 'Not set'}</p></div>
      </div>
      <h3 style="margin-bottom:12px">Skills</h3>
      <div class="profile-skills">${(currentUser.skills || []).map(s => `<span class="skill-tag">${categoryIcon(s)} ${s}</span>`).join('') || '<span style="color:var(--text-secondary)">No skills selected</span>'}</div>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border)">
        <h3 style="margin-bottom:12px">Progress</h3>
        <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:8px">${completedCount} of ${myTasks.length || 1} tasks completed</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${myTasks.length ? (completedCount / myTasks.length * 100) : 0}%"></div></div>
      </div>
    </div>`;
}

function acceptTask(id) {
  const req = requests.find(r => r.id === id);
  if (!req || !currentUser) return;
  req.status = 'In Progress';
  req.volunteerId = currentUser.id;
  save();
  showToast('Task accepted! Thank you for volunteering.', 'success');
  renderVolunteerDashboard();
}

function completeTask(id) {
  const req = requests.find(r => r.id === id);
  if (!req) return;
  req.status = 'Completed';
  save();
  showToast('Task marked as completed! Great work! 🎉', 'success');
  renderVolunteerDashboard();
}

// ============ INIT ============
updateNav();
if (currentUser) navigate('dashboard');

// Close modal on overlay click
document.getElementById('reportModal').addEventListener('click', function(e) {
  if (e.target === this) closeReportModal();
});

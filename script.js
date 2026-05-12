/* ============================================================
   TaskFlow – All App Logic
   Storage: localStorage (no backend needed)
   ============================================================ */

// ── STATE ──
let currentUser  = null;
let tasks        = [];
let editingId    = null;
let activeCat    = 'all';
let selectedPri  = 'medium';
let selectedCat  = 'personal';
let dragSrcIndex = null;

const CAT_EMOJI = { work:'💼', personal:'🏠', study:'📚', health:'💪', other:'📌' };

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  const saved = localStorage.getItem('tf_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    updateStreak();
    showApp();
  }
});

// ── AUTH ──
let authMode = 'login';

function switchTab(mode) {
  authMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabSignup').classList.toggle('active', mode === 'signup');
  document.getElementById('nameGroup').style.display = mode === 'signup' ? 'flex' : 'none';
  document.getElementById('authSubmit').textContent  = mode === 'login' ? 'Sign In' : 'Create Account';
}

function handleAuth(e) {
  e.preventDefault();
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name     = document.getElementById('authName').value.trim();

  const users = JSON.parse(localStorage.getItem('tf_users') || '{}');

  if (authMode === 'signup') {
    if (!name) return toast('Name is required', 'error');
    if (users[email]) return toast('Email already registered', 'error');
    // Simple hash simulation (not cryptographic — for demo only)
    users[email] = { name, email, password: btoa(password), streak: 0, lastActive: '', totalDone: 0 };
    localStorage.setItem('tf_users', JSON.stringify(users));
    currentUser = { ...users[email] };
    toast('Account created! 🎉', 'success');
  } else {
    const u = users[email];
    if (!u || u.password !== btoa(password)) return toast('Invalid email or password', 'error');
    currentUser = { ...u };
  }

  updateStreak();
  localStorage.setItem('tf_user', JSON.stringify(currentUser));
  showApp();
  toast(`Welcome${authMode === 'login' ? ' back' : ''}, ${currentUser.name.split(' ')[0]}! 👋`, 'success');
}

function logout() {
  localStorage.removeItem('tf_user');
  currentUser = null;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  switchTab('login');
}

function updateStreak() {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (currentUser.lastActive === yesterday) currentUser.streak = (currentUser.streak || 0) + 1;
  else if (currentUser.lastActive !== today) currentUser.streak = 1;
  currentUser.lastActive = today;
  saveUser();
}

function saveUser() {
  localStorage.setItem('tf_user', JSON.stringify(currentUser));
  const users = JSON.parse(localStorage.getItem('tf_users') || '{}');
  if (users[currentUser.email]) {
    users[currentUser.email] = { ...users[currentUser.email], streak: currentUser.streak, lastActive: currentUser.lastActive, totalDone: currentUser.totalDone };
    localStorage.setItem('tf_users', JSON.stringify(users));
  }
}

// ── SHOW APP ──
function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display  = 'block';

  // Set user info in navbar
  document.getElementById('userName').textContent   = currentUser.name;
  document.getElementById('userAvatar').textContent = currentUser.name[0].toUpperCase();

  // Streak
  const sb = document.getElementById('streakBadge');
  if (currentUser.streak > 0) {
    sb.style.display = 'flex';
    document.getElementById('streakCount').textContent = currentUser.streak;
  }

  // Load tasks
  tasks = JSON.parse(localStorage.getItem(`tf_tasks_${currentUser.email}`) || '[]');
  renderAll();
}

// ── SAVE TASKS ──
function saveTasks() {
  localStorage.setItem(`tf_tasks_${currentUser.email}`, JSON.stringify(tasks));
}

// ── TASK MODAL ──
function openModal(id = null) {
  editingId = id;
  const modal = document.getElementById('taskModal');

  if (id) {
    const t = tasks.find(t => t.id === id);
    document.getElementById('modalTitle').textContent    = 'Edit Task';
    document.getElementById('modalSaveBtn').textContent  = 'Save Changes';
    document.getElementById('taskTitle').value           = t.title;
    document.getElementById('taskDesc').value            = t.description || '';
    document.getElementById('taskDue').value             = t.dueDate || '';
    selectedPri = t.priority;
    selectedCat = t.category;
  } else {
    document.getElementById('modalTitle').textContent    = 'New Task';
    document.getElementById('modalSaveBtn').textContent  = 'Add Task';
    document.getElementById('taskTitle').value           = '';
    document.getElementById('taskDesc').value            = '';
    document.getElementById('taskDue').value             = '';
    selectedPri = 'medium';
    selectedCat = 'personal';
  }

  // Sync priority buttons
  document.querySelectorAll('.pri-btn').forEach(b => {
    b.className = 'pri-btn' + (b.dataset.p === selectedPri ? ` active-${selectedPri}` : '');
  });
  // Sync category buttons
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.c === selectedCat);
  });

  modal.classList.add('open');
  setTimeout(() => document.getElementById('taskTitle').focus(), 50);
}

function closeModal() {
  document.getElementById('taskModal').classList.remove('open');
  editingId = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('taskModal')) closeModal();
}

function setPri(btn) {
  selectedPri = btn.dataset.p;
  document.querySelectorAll('.pri-btn').forEach(b => {
    b.className = 'pri-btn' + (b.dataset.p === selectedPri ? ` active-${selectedPri}` : '');
  });
}

function setCatBtn(btn) {
  selectedCat = btn.dataset.c;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b === btn));
}

// ── SAVE TASK ──
function saveTask(e) {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) return;

  if (editingId) {
    const idx = tasks.findIndex(t => t.id === editingId);
    tasks[idx] = { ...tasks[idx], title, description: document.getElementById('taskDesc').value.trim(),
      priority: selectedPri, category: selectedCat, dueDate: document.getElementById('taskDue').value };
    toast('Task updated ✏️', 'info');
  } else {
    tasks.unshift({
      id: Date.now().toString(),
      title,
      description: document.getElementById('taskDesc').value.trim(),
      priority: selectedPri,
      category: selectedCat,
      dueDate: document.getElementById('taskDue').value,
      completed: false,
      createdAt: new Date().toISOString(),
      order: tasks.length
    });
    toast('Task added! 🎉', 'success');
  }

  saveTasks();
  renderAll();
  closeModal();
}

// ── TOGGLE COMPLETE ──
function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  t.completed = !t.completed;
  t.completedAt = t.completed ? new Date().toISOString() : null;

  if (t.completed) {
    currentUser.totalDone = (currentUser.totalDone || 0) + 1;
    saveUser();
    toast('Task completed! ✅', 'success');
  }

  saveTasks();
  renderAll();
}

// ── DELETE TASK ──
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderAll();
  toast('Task deleted', 'info');
}

// ── FILTER HELPERS ──
function setCat(btn) {
  activeCat = btn.dataset.cat;
  document.querySelectorAll('.fpill').forEach(b => b.classList.toggle('active', b === btn));
  renderTasks();
}

function getFiltered() {
  const search   = document.getElementById('searchInput').value.toLowerCase();
  const priority = document.getElementById('filterPriority').value;
  const status   = document.getElementById('filterStatus').value;
  const sort     = document.getElementById('filterSort').value;

  let list = tasks.filter(t => {
    if (activeCat !== 'all' && t.category !== activeCat) return false;
    if (priority  !== 'all' && t.priority  !== priority)  return false;
    if (status === 'pending' && t.completed)  return false;
    if (status === 'done'    && !t.completed) return false;
    if (search && !t.title.toLowerCase().includes(search) &&
        !(t.description || '').toLowerCase().includes(search)) return false;
    return true;
  });

  const priOrder = { high: 0, medium: 1, low: 2 };
  if (sort === 'priority') list.sort((a,b) => priOrder[a.priority] - priOrder[b.priority]);
  else if (sort === 'dueDate') list.sort((a,b) => {
    if (!a.dueDate) return 1; if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  else list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  return list;
}

// ── RENDER ALL ──
function renderAll() {
  renderStats();
  renderTasks();
}

// ── RENDER STATS ──
function renderStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;
  const today   = new Date(); today.setHours(0,0,0,0);
  const overdue = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statOverdue').textContent = overdue;
  document.getElementById('pctNum').textContent      = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent    = `${greet}, ${currentUser.name.split(' ')[0]} 👋`;
  document.getElementById('greetingSub').textContent = pending > 0
    ? `You have ${pending} task${pending > 1 ? 's' : ''} to complete`
    : total === 0 ? 'Add your first task below!' : 'All caught up! Great work 🎉';
}

// ── RENDER TASKS ──
function renderTasks() {
  const list    = getFiltered();
  const pending = list.filter(t => !t.completed);
  const done    = list.filter(t =>  t.completed);
  const el      = document.getElementById('taskList');

  if (list.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No tasks found</p>
        <span>Add a task or adjust your filters</span>
      </div>`;
    return;
  }

  let html = '';
  if (pending.length) {
    html += `<div class="section-label">Pending · ${pending.length}</div>`;
    html += pending.map((t,i) => taskCardHTML(t, i)).join('');
  }
  if (done.length) {
    html += `<div class="section-label">Completed · ${done.length}</div>`;
    html += done.map((t,i) => taskCardHTML(t, pending.length + i)).join('');
  }

  el.innerHTML = html;
  attachDragEvents();
}

// ── TASK CARD HTML ──
function taskCardHTML(t, idx) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const due       = t.dueDate ? new Date(t.dueDate) : null;
  const isOverdue = due && !t.completed && due < today;
  const isToday   = due && due.getTime() === today.getTime() && !t.completed;

  let dueBadge = '';
  if (due) {
    const label = isOverdue ? `Overdue · ${fmtDate(due)}` : isToday ? `Today · ${fmtDate(due)}` : `📅 ${fmtDate(due)}`;
    const cls   = isOverdue ? 'badge-overdue' : isToday ? 'badge-today' : 'badge-due';
    dueBadge = `<span class="badge ${cls}">${label}</span>`;
  }

  return `
    <div class="task-card ${t.completed ? 'done' : ''}" data-id="${t.id}" data-idx="${idx}" draggable="true">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <button class="check-btn ${t.completed ? 'checked' : ''}" onclick="toggleTask('${t.id}')" title="Toggle complete">
        ${t.completed ? '✓' : ''}
      </button>
      <div class="task-content">
        <div class="task-title">${escHtml(t.title)}</div>
        ${t.description ? `<div class="task-desc">${escHtml(t.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge badge-${t.priority}">${t.priority}</span>
          <span class="badge badge-cat">${CAT_EMOJI[t.category]} ${t.category}</span>
          ${dueBadge}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="openModal('${t.id}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="deleteTask('${t.id}')" title="Delete" style="color:var(--red)">🗑️</button>
      </div>
    </div>`;
}

// ── DRAG & DROP ──
function attachDragEvents() {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragSrcIndex = +card.dataset.idx;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    card.addEventListener('drop', e => {
      e.preventDefault();
      const destIndex = +card.dataset.idx;
      if (dragSrcIndex === null || dragSrcIndex === destIndex) return;

      const filtered = getFiltered();
      const srcTask  = filtered[dragSrcIndex];
      const destTask = filtered[destIndex];

      // Swap in main tasks array
      const si = tasks.findIndex(t => t.id === srcTask.id);
      const di = tasks.findIndex(t => t.id === destTask.id);
      [tasks[si], tasks[di]] = [tasks[di], tasks[si]];

      dragSrcIndex = null;
      saveTasks();
      renderTasks();
    });
  });
}

// ── THEME ──
function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('tf_theme', isDark ? 'light' : 'dark');
}

function applyTheme() {
  const saved = localStorage.getItem('tf_theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
}

// ── TOAST ──
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ── UTILS ──
function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

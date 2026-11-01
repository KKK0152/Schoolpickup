// ===== TEACHER DASHBOARD =====
const user = requireAuth('teacher');
if (!user) throw new Error('Not auth');

let statusEditingId = null;
let statusSelected = null;
let editingStudentId = null;

document.getElementById('sidebar-name').textContent = user.name;
updateTopbarDate();

function updateTopbarDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('topbar-date').textContent = now.toLocaleDateString('th-TH', opts);
}

// Init record form
document.getElementById('record-date').value = todayStr();
document.getElementById('record-time').value = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
initStudentSelect();

function initStudentSelect() {
  const students = getStudents();
  const sel = document.getElementById('record-student');
  sel.innerHTML = '<option value="">-- เลือกนักเรียน --</option>' +
    students.map(s => `<option value="${s.id}">${s.name} (${s.class})</option>`).join('');
}

// ===== NAVIGATION =====
const sections = ['dashboard', 'today', 'record', 'students', 'accounts', 'history', 'report'];
const sectionTitles = {
  dashboard: ['ภาพรวม', `สวัสดี, ${user.name}`],
  today: ['รายการรับ–ส่งวันนี้', 'รายชื่อที่ผู้ปกครองแจ้งไว้สำหรับวันนี้'],
  record: ['บันทึกการรับ–ส่ง', 'บันทึกข้อมูลการรับ–ส่งนักเรียน'],
  students: ['ข้อมูลนักเรียน', 'จัดการข้อมูลนักเรียนและผู้ปกครอง'],
  accounts: ['บัญชีผู้ปกครอง', 'เพิ่ม/ลบบัญชีเข้าสู่ระบบสำหรับผู้ปกครอง'],
  history: ['ค้นหาประวัติ', 'ค้นหาและตรวจสอบข้อมูลย้อนหลัง'],
  report: ['รายงานสรุป', 'สถิติและรายงานการรับ–ส่งนักเรียน'],
};

function showSection(name) {
  sections.forEach(s => {
    document.getElementById('section-' + s).style.display = (s === name) ? '' : 'none';
    const nav = document.getElementById('nav-' + s);
    if (nav) nav.classList.toggle('active', s === name);
  });
  const [title, sub] = sectionTitles[name] || [name, ''];
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-sub').textContent = sub;

  if (name === 'dashboard') renderDashboard();
  if (name === 'today') renderToday();
  if (name === 'students') renderStudents();
  if (name === 'accounts') renderAccounts();
  if (name === 'history') { renderTeacherHistory(); }
  if (name === 'report') renderReport();
  document.getElementById('sidebar').classList.remove('open');
}

// ===== HELPERS =====
function getStudentById(id) {
  return getStudents().find(s => s.id === id);
}

function getTodayPickups() {
  return getPickups()
    .filter(p => p.date === todayStr() && p.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
}

function getPendingPickups() {
  return getPickups().filter(p => p.status === 'pending');
}

// ===== DASHBOARD =====
function renderDashboard() {
  const students = getStudents();
  const allPickups = getPickups();
  const todayPickups = getTodayPickups();
  const pending = getPendingPickups();
  const doneTodayCount = todayPickups.filter(p => p.status === 'done').length;

  document.getElementById('card-total-students').textContent = students.length;
  document.getElementById('card-pending').textContent = pending.length;
  document.getElementById('card-today-all').textContent = todayPickups.length;
  document.getElementById('card-done-today').textContent = doneTodayCount;

  const badge = document.getElementById('badge-pending');
  badge.textContent = pending.length;
  badge.style.display = pending.length > 0 ? '' : 'none';

  const notifDot = document.getElementById('notif-dot');
  if (notifDot) notifDot.style.display = pending.length > 0 ? '' : 'none';

  const tbody = document.getElementById('pending-tbody');
  if (pending.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">ไม่มีรายการรอยืนยัน</div><div class="empty-desc">ทุกรายการได้รับการยืนยันแล้ว</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = pending.map(p => {
    const st = getStudentById(p.studentId);
    return `<tr>
      <td><div class="student-cell"><div class="student-avatar">${st ? st.photo : '👤'}</div><div><div class="student-name">${st ? st.name : p.studentId}</div><div class="student-class">${st ? st.class : ''}</div></div></div></td>
      <td>${formatDate(p.date)}</td>
      <td>${p.time} น.</td>
      <td>${p.pickup_by}</td>
      <td>${typeLabel(p.type)}</td>
      <td style="max-width:150px;font-size:13px;color:var(--text-muted);">${p.note || '–'}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn-sm btn-sm-primary" onclick="openStatusModal('${p.id}')">🔄 สถานะ</button>
      </td>
    </tr>`;
  }).join('');
}

function confirmAll() {
  if (!confirm(`ยืนยันรายการรอทั้งหมด ${getPendingPickups().length} รายการ?`)) return;
  const pickups = getPickups();
  let count = 0;
  pickups.forEach(p => {
    if (p.status === 'pending') { p.status = 'confirmed'; count++; }
  });
  savePickups(pickups);
  showToast(`ยืนยัน ${count} รายการสำเร็จ!`);
  renderDashboard();
}

// ===== TODAY =====
function renderToday() {
  const todayPickups = getTodayPickups();
  const search = document.getElementById('today-search')?.value.toLowerCase() || '';
  let filtered = todayPickups;
  if (search) {
    filtered = filtered.filter(p => {
      const st = getStudentById(p.studentId);
      return (st && st.name.toLowerCase().includes(search)) || p.pickup_by.toLowerCase().includes(search);
    });
  }
  const tbody = document.getElementById('today-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">ไม่มีรายการวันนี้</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(p => {
    const st = getStudentById(p.studentId);
    const s = statusLabel(p.status);
    return `<tr>
      <td><div class="student-cell"><div class="student-avatar">${st ? st.photo : '👤'}</div><div><div class="student-name">${st ? st.name : p.studentId}</div></div></div></td>
      <td>${st ? st.class : '–'}</td>
      <td>${p.time} น.</td>
      <td>${p.pickup_by}</td>
      <td>${typeLabel(p.type)}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td><button class="btn-sm btn-sm-primary" onclick="openStatusModal('${p.id}')">🔄 สถานะ</button></td>
    </tr>`;
  }).join('');
}

// ===== STATUS MODAL =====
function openStatusModal(id) {
  statusEditingId = id;
  statusSelected = null;
  const statuses = [
    { value: 'confirmed', label: '✅ ยืนยันแล้ว', desc: 'รับทราบการแจ้ง' },
    { value: 'done', label: '🎒 รับนักเรียนแล้ว', desc: 'ดำเนินการเสร็จสิ้น' },
    { value: 'cancelled', label: '❌ ยกเลิก', desc: 'ยกเลิกรายการนี้' },
  ];
  document.getElementById('status-options').innerHTML = statuses.map(s => `
    <div onclick="selectStatus('${s.value}', this)" id="status-opt-${s.value}"
      style="padding:14px 16px;border-radius:var(--radius-md);border:2px solid var(--border);cursor:pointer;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:600;font-size:14px;">${s.label}</div>
        <div style="font-size:12px;color:var(--text-muted);">${s.desc}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('status-note').value = '';
  document.getElementById('status-modal').classList.add('open');
}

function selectStatus(val, el) {
  statusSelected = val;
  document.querySelectorAll('#status-options > div').forEach(d => {
    d.style.borderColor = 'var(--border)';
    d.style.background = '';
  });
  el.style.borderColor = 'var(--primary)';
  el.style.background = 'rgba(37,99,235,0.05)';
}

function saveStatus() {
  if (!statusSelected) { showToast('กรุณาเลือกสถานะ', 'warning'); return; }
  const pickups = getPickups();
  const idx = pickups.findIndex(p => p.id === statusEditingId);
  if (idx !== -1) {
    pickups[idx].status = statusSelected;
    if (document.getElementById('status-note').value.trim()) {
      pickups[idx].note = (pickups[idx].note ? pickups[idx].note + ' | ' : '') + document.getElementById('status-note').value.trim();
    }
    savePickups(pickups);
    showToast('อัปเดตสถานะสำเร็จ!');
    closeModal('status-modal');
    renderDashboard();
    renderToday();
  }
}

// ===== RECORD =====
function submitRecord(e) {
  e.preventDefault();
  const pickups = getPickups();
  const newRecord = {
    id: generateId('R'),
    studentId: document.getElementById('record-student').value,
    date: document.getElementById('record-date').value,
    time: document.getElementById('record-time').value,
    pickup_by: document.getElementById('record-pickup-by').value.trim(),
    type: document.getElementById('record-type').value,
    status: document.getElementById('record-status').value,
    note: document.getElementById('record-note').value.trim(),
    created_at: new Date().toLocaleString('th-TH'),
    recorded_by: user.name,
  };
  pickups.push(newRecord);
  savePickups(pickups);
  showToast('บันทึกการรับ–ส่งสำเร็จ!');
  document.getElementById('recordForm').reset();
  document.getElementById('record-date').value = todayStr();
  renderDashboard();
}

// ===== STUDENTS =====
function renderStudents() {
  const students = getStudents();
  const search = document.getElementById('students-search')?.value.toLowerCase() || '';
  const filtered = search ? students.filter(s =>
    s.name.toLowerCase().includes(search) || s.class.toLowerCase().includes(search) || s.parentName.toLowerCase().includes(search)
  ) : students;
  const tbody = document.getElementById('students-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">ไม่พบข้อมูล</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(s => `<tr>
    <td><div class="student-cell"><div class="student-avatar">${s.photo}</div><div><div class="student-name">${s.name}</div><div class="student-class">รหัส: ${s.id}</div></div></div></td>
    <td>${s.class}</td>
    <td>${s.parentName}</td>
    <td>${s.phone}</td>
    <td style="display:flex;gap:6px;">
      <button class="btn-sm" onclick="openEditStudent('${s.id}')">✏️ แก้ไข</button>
      <button class="btn-sm" style="color:#ef4444;border-color:#fca5a5;" onclick="deleteStudent('${s.id}')">🗑️ ลบ</button>
    </td>
  </tr>`).join('');
}

function openAddStudent() {
  editingStudentId = null;
  document.getElementById('student-modal-title').textContent = '➕ เพิ่มนักเรียน';
  ['st-name','st-class','st-parent','st-phone'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('student-modal').classList.add('open');
}

function openEditStudent(id) {
  editingStudentId = id;
  const s = getStudents().find(x => x.id === id);
  if (!s) return;
  document.getElementById('student-modal-title').textContent = '✏️ แก้ไขข้อมูลนักเรียน';
  document.getElementById('st-name').value = s.name;
  document.getElementById('st-class').value = s.class;
  document.getElementById('st-parent').value = s.parentName;
  document.getElementById('st-phone').value = s.phone;
  document.getElementById('student-modal').classList.add('open');
}

function saveStudent() {
  const name = document.getElementById('st-name').value.trim();
  const cls = document.getElementById('st-class').value.trim();
  const parent = document.getElementById('st-parent').value.trim();
  const phone = document.getElementById('st-phone').value.trim();
  if (!name || !cls || !parent) { showToast('กรุณากรอกข้อมูลที่จำเป็น', 'warning'); return; }

  const students = getStudents();
  if (editingStudentId) {
    const idx = students.findIndex(s => s.id === editingStudentId);
    if (idx !== -1) {
      students[idx] = { ...students[idx], name, class: cls, parentName: parent, phone };
    }
    showToast('แก้ไขข้อมูลนักเรียนสำเร็จ!');
  } else {
    students.push({
      id: generateId('S'),
      name, class: cls, parentName: parent, phone,
      parentId: '',
      photo: name.includes('ด.ช.') ? '👦' : '👧',
    });
    showToast('เพิ่มนักเรียนสำเร็จ!');
  }
  saveStudents(students);
  closeModal('student-modal');
  renderStudents();
  initStudentSelect();
}

function deleteStudent(id) {
  if (!confirm('ยืนยันการลบนักเรียนรายนี้?')) return;
  const students = getStudents().filter(s => s.id !== id);
  saveStudents(students);
  showToast('ลบนักเรียนแล้ว', 'warning');
  renderStudents();
}

// ===== HISTORY =====
function renderTeacherHistory() {
  const search = document.getElementById('hist-search')?.value.toLowerCase() || '';
  const dateFrom = document.getElementById('hist-date-from')?.value || '';
  const dateTo = document.getElementById('hist-date-to')?.value || '';

  let pickups = getPickups().filter(p => p.status !== 'cancelled');
  if (dateFrom) pickups = pickups.filter(p => p.date >= dateFrom);
  if (dateTo) pickups = pickups.filter(p => p.date <= dateTo);
  if (search) pickups = pickups.filter(p => {
    const st = getStudentById(p.studentId);
    return (st && st.name.toLowerCase().includes(search)) || p.pickup_by.toLowerCase().includes(search);
  });
  pickups = pickups.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const tbody = document.getElementById('hist-tbody');
  if (pickups.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">ไม่พบข้อมูล</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = pickups.map(p => {
    const st = getStudentById(p.studentId);
    const s = statusLabel(p.status);
    return `<tr>
      <td><div class="student-cell"><div class="student-avatar">${st ? st.photo : '👤'}</div><div class="student-name">${st ? st.name : p.studentId}</div></div></td>
      <td>${st ? st.class : '–'}</td>
      <td>${formatDate(p.date)}</td>
      <td>${p.time} น.</td>
      <td>${p.pickup_by}</td>
      <td>${typeLabel(p.type)}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td style="font-size:13px;color:var(--text-muted);">${p.note || '–'}</td>
    </tr>`;
  }).join('');
}

// ===== REPORT =====
function renderReport() {
  const pickups = getPickups();
  document.getElementById('rpt-total').textContent = pickups.length;
  document.getElementById('rpt-done').textContent = pickups.filter(p => p.status === 'done').length;
  document.getElementById('rpt-pending').textContent = pickups.filter(p => ['pending','confirmed'].includes(p.status)).length;
  document.getElementById('rpt-cancelled').textContent = pickups.filter(p => p.status === 'cancelled').length;

  // Daily last 7 days
  const daily = document.getElementById('daily-report');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = pickups.filter(p => p.date === dateStr).length;
    days.push({ dateStr, count, label: d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }) });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  daily.innerHTML = days.map(d => `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
      <div style="width:100px;font-size:13px;color:var(--text-secondary);flex-shrink:0;">${d.label}</div>
      <div style="flex:1;background:var(--bg-primary);border-radius:var(--radius-full);height:28px;overflow:hidden;">
        <div style="width:${(d.count / maxCount) * 100}%;height:100%;background:var(--gradient-primary);border-radius:var(--radius-full);transition:width 0.8s ease;display:flex;align-items:center;padding-left:10px;">
          ${d.count > 0 ? `<span style="font-size:12px;font-weight:700;color:white;">${d.count}</span>` : ''}
        </div>
      </div>
      <div style="width:30px;font-size:14px;font-weight:700;color:var(--text-primary);text-align:right;">${d.count}</div>
    </div>
  `).join('');

  // Type breakdown
  const types = { pickup: 0, bus: 0, walk: 0 };
  pickups.forEach(p => { if (types[p.type] !== undefined) types[p.type]++; });
  const typeNames = { pickup: '🚗 ผู้ปกครองมารับ', bus: '🚌 รถรับส่ง', walk: '🚶 เดินกลับบ้าน' };
  const typeColors = { pickup: '#2563eb', bus: '#10b981', walk: '#f59e0b' };
  const total = Object.values(types).reduce((a, b) => a + b, 0) || 1;
  document.getElementById('type-report').innerHTML = Object.entries(types).map(([k, v]) => `
    <div style="flex:1;min-width:180px;background:var(--bg-primary);padding:24px;border-radius:var(--radius-lg);text-align:center;border:2px solid ${typeColors[k]}20;">
      <div style="font-size:36px;font-weight:800;color:${typeColors[k]};margin-bottom:6px;">${v}</div>
      <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${typeNames[k]}</div>
      <div style="font-size:13px;color:var(--text-muted);">${Math.round((v / total) * 100)}%</div>
    </div>
  `).join('');
}

// ===== MODAL =====
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'status-modal') { statusEditingId = null; statusSelected = null; }
  if (id === 'student-modal') { editingStudentId = null; }
  if (id === 'account-modal') { document.getElementById('acc-error').style.display = 'none'; }
}

// ===== ACCOUNTS =====
function getAccounts() {
  const saved = localStorage.getItem('parentAccounts');
  if (saved) return JSON.parse(saved);
  // Load from DEMO_ACCOUNTS on first time
  const demo = [];
  for (const [username, acc] of Object.entries(DEMO_ACCOUNTS)) {
    if (acc.role === 'parent') {
      demo.push({ username, password: acc.password, name: acc.name, studentId: acc.studentId });
    }
  }
  localStorage.setItem('parentAccounts', JSON.stringify(demo));
  return demo;
}

function saveAccountsData(data) {
  localStorage.setItem('parentAccounts', JSON.stringify(data));
  // Sync back to DEMO_ACCOUNTS in memory
  for (const key of Object.keys(DEMO_ACCOUNTS)) {
    if (DEMO_ACCOUNTS[key].role === 'parent') delete DEMO_ACCOUNTS[key];
  }
  data.forEach(acc => {
    DEMO_ACCOUNTS[acc.username] = { password: acc.password, role: 'parent', name: acc.name, studentId: acc.studentId };
  });
}

function renderAccounts() {
  const accounts = getAccounts();
  const students = getStudents();
  const search = document.getElementById('accounts-search')?.value.toLowerCase() || '';
  const filtered = search ? accounts.filter(a =>
    a.username.toLowerCase().includes(search) || a.name.toLowerCase().includes(search)
  ) : accounts;

  // Summary bar
  const linked = accounts.filter(a => students.find(s => s.id === a.studentId)).length;
  const tbody = document.getElementById('accounts-tbody');

  // Stat bar
  const statBar = document.getElementById('accounts-stat-bar');
  if (statBar) {
    statBar.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:140px;background:var(--bg-primary);border-radius:var(--radius-md);padding:16px 20px;border:1px solid var(--border);">
          <div style="font-size:28px;font-weight:800;color:var(--primary);">${accounts.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">🔐 บัญชีทั้งหมด</div>
        </div>
        <div style="flex:1;min-width:140px;background:var(--bg-primary);border-radius:var(--radius-md);padding:16px 20px;border:1px solid var(--border);">
          <div style="font-size:28px;font-weight:800;color:#10b981;">${linked}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">✅ ผูกนักเรียนแล้ว</div>
        </div>
        <div style="flex:1;min-width:140px;background:var(--bg-primary);border-radius:var(--radius-md);padding:16px 20px;border:1px solid var(--border);">
          <div style="font-size:28px;font-weight:800;color:#f59e0b;">${accounts.length - linked}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">⚠️ ยังไม่ผูกนักเรียน</div>
        </div>
        <div style="flex:1;min-width:140px;background:var(--bg-primary);border-radius:var(--radius-md);padding:16px 20px;border:1px solid var(--border);">
          <div style="font-size:28px;font-weight:800;color:#8b5cf6;">${students.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">🎒 นักเรียนทั้งหมด</div>
        </div>
      </div>`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔐</div><div class="empty-title">ยังไม่มีบัญชีนักเรียน</div><div class="empty-desc">กด &quot;+ เพิ่มบัญชีใหม่&quot; เพื่อสร้างบัญชี</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map((acc, idx) => {
    const st = students.find(s => s.id === acc.studentId);
    return `<tr>
      <td style="color:var(--text-muted);font-size:13px;">${idx + 1}</td>
      <td><strong style="font-family:monospace;font-size:15px;color:var(--primary);">${acc.username}</strong></td>
      <td>${acc.name}</td>
      <td>${st ? `<div class="student-cell"><div class="student-avatar">${st.photo}</div><div><div class="student-name">${st.name}</div><div class="student-class">${st.class}</div></div></div>` : '<span style="color:var(--text-muted)">– ยังไม่ผูก</span>'}</td>
      <td>${st ? `<span style="background:rgba(16,185,129,0.1);color:#059669;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">✅ ผูกแล้ว</span>` : `<span style="background:rgba(245,158,11,0.1);color:#b45309;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">⚠️ ยังไม่ผูก</span>`}</td>
      <td><code style="background:var(--bg-primary);padding:2px 8px;border-radius:6px;font-size:13px;">${acc.password}</code></td>
      <td style="display:flex;gap:6px;">
        <button class="btn-sm" style="color:#ef4444;border-color:#fca5a5;" onclick="deleteAccount('${acc.username}')">🗑️ ลบ</button>
      </td>
    </tr>`;
  }).join('');
}

function openAddAccount() {
  const students = getStudents();
  ['acc-username','acc-password','acc-name'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('acc-error').style.display = 'none';
  const sel = document.getElementById('acc-student');
  sel.innerHTML = '<option value="">–– เลือกนักเรียน ––</option>' +
    students.map(s => `<option value="${s.id}">${s.name} (${s.class})</option>`).join('');
  document.getElementById('account-modal').classList.add('open');
}

function saveAccount() {
  const username = document.getElementById('acc-username').value.trim();
  const password = document.getElementById('acc-password').value.trim();
  const name = document.getElementById('acc-name').value.trim();
  const studentId = document.getElementById('acc-student').value;
  const errEl = document.getElementById('acc-error');

  if (!username || !password || !name || !studentId) {
    errEl.textContent = '⚠️ กรุณากรอกข้อมูลให้ครบทุกช่อง';
    errEl.style.display = 'block';
    return;
  }
  const accounts = getAccounts();
  if (accounts.find(a => a.username === username)) {
    errEl.textContent = '⚠️ ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น';
    errEl.style.display = 'block';
    return;
  }
  accounts.push({ username, password, name, studentId });
  saveAccountsData(accounts);
  // Update student's parentId
  const students = getStudents();
  const stIdx = students.findIndex(s => s.id === studentId);
  if (stIdx !== -1) { students[stIdx].parentId = username; students[stIdx].parentName = name; saveStudents(students); }

  showToast(`เพิ่มบัญชี ${username} สำเร็จ!`);
  closeModal('account-modal');
  renderAccounts();
}

function deleteAccount(username) {
  if (!confirm(`ยืนยันลบบัญชี "${username}" หรือไม่?`)) return;
  const accounts = getAccounts().filter(a => a.username !== username);
  saveAccountsData(accounts);
  showToast('ลบบัญชีแล้ว', 'warning');
  renderAccounts();
}

['status-modal', 'student-modal', 'account-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) closeModal(id);
  });
});

// Mobile
if (window.innerWidth <= 768) document.getElementById('hamburger-dash').style.display = 'block';
window.addEventListener('resize', () => {
  document.getElementById('hamburger-dash').style.display = window.innerWidth <= 768 ? 'block' : 'none';
});

// Init
renderDashboard();

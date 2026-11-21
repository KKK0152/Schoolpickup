// ===== TEACHER DASHBOARD =====
const user = requireAuth('teacher');
if (!user) throw new Error('Not auth');

// ===== INIT GUARD: บังคับโหลด 10 บัญชีนักเรียนถ้ายังไม่มี =====
(function initAccountsGuard() {
  try {
    const raw = localStorage.getItem('parentAccounts');
    const existing = raw ? JSON.parse(raw) : [];
    if (!existing || existing.length === 0) {
      // โหลด DEMO_PARENT_ACCOUNTS จาก data.js (global)
      localStorage.setItem('parentAccounts', JSON.stringify(DEMO_PARENT_ACCOUNTS));
      console.log('[initAccountsGuard] โหลด 10 บัญชีนักเรียนสำเร็จ');
    }
  } catch(e) {
    // ถ้า parse ผิดพลาด ให้ reset
    localStorage.setItem('parentAccounts', JSON.stringify(DEMO_PARENT_ACCOUNTS));
  }
})();

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

const sections = ['dashboard', 'today', 'record', 'students', 'accounts', 'today-status', 'history', 'report', 'notifications'];
const sectionTitles = {
  dashboard: ['ภาพรวม', `สวัสดี, ${user.name}`],
  today: ['รายการรับ–ส่งวันนี้', 'รายชื่อที่ผู้ปกครองแจ้ไว้สำหรับวันนี้'],
  record: ['บันทึกการรับ–ส่ง', 'บันทึกข้อมูลการรับ–ส่งนักเรียน'],
  students: ['ข้อมูลนักเรียน', 'จัดการข้อมูลนักเรียนและผู้ปกครอง'],
  accounts: ['บัญชีนักเรียน', 'ฟรหัสเข้าระบบสำหรับนักเรียนทุกคน'],
  'today-status': ['สถานะนักเรียนวันนี้', 'สถานะการรับ–ส่งของนักเรียนทุกคนสำหรับวันนี้'],
  history: ['ค้นหาประวัติ', 'ค้นหาและตรวจสอบข้อมูลย้อนหลัง'],
  report: ['รายงานสรุป', 'สถิติและรายงานการรับ–ส่งนักเรียน'],
  notifications: ['การแจ้งเตือน', 'แจ้งเตือนจากผู้ปกครองและระบบ'],
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
  if (name === 'today-status') renderTodayStatus();
  if (name === 'history') { renderTeacherHistory(); }
  if (name === 'report') renderReport();
  if (name === 'notifications') renderNotifications();
  document.getElementById('sidebar').classList.remove('open');
}

// ===== TODAY STATUS (all students) =====
function renderTodayStatus() {
  const students = getStudents();
  const pickups = getPickups();
  const today = todayStr();

  const statusConf = {
    done: { label: 'ถึงบ้านแล้ว', emoji: '🏠', bg: 'linear-gradient(135deg,#059669,#10b981)', count: 0 },
    confirmed: { label: 'ยืนยันแล้ว', emoji: '🚗', bg: 'linear-gradient(135deg,#1d4ed8,#2563eb)', count: 0 },
    pending: { label: 'รอยืนยัน', emoji: '⏳', bg: 'linear-gradient(135deg,#b45309,#f59e0b)', count: 0 },
    none: { label: 'ยังไม่แจ้', emoji: '📋', bg: 'linear-gradient(135deg,#475569,#64748b)', count: 0 },
  };

  const cards = students.map(st => {
    const todayRecs = pickups.filter(p => p.studentId === st.id && p.date === today && p.status !== 'cancelled');
    const latest = todayRecs.sort((a, b) => b.time.localeCompare(a.time))[0] || null;
    const key = latest ? latest.status : 'none';
    if (statusConf[key]) statusConf[key].count++;
    const conf = statusConf[key] || statusConf.none;
    return `
      <div style="background:${conf.bg};color:#fff;border-radius:16px;padding:20px 22px;box-shadow:0 4px 16px rgba(0,0,0,.12);">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
          <div style="font-size:40px;line-height:1;">${st.photo}</div>
          <div>
            <div style="font-size:15px;font-weight:800;">${st.name}</div>
            <div style="font-size:12px;opacity:.8;">📚 ชั้น ${st.class} &nbsp;·  ${st.id}</div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,.18);border-radius:10px;padding:10px 14px;">
          <div style="font-size:22px;font-weight:800;margin-bottom:2px;">${conf.emoji} ${conf.label}</div>
          ${latest ? `<div style="font-size:12px;opacity:.85;">รับโดย: ${latest.pickup_by} · ${latest.time} น.</div>` : '<div style="font-size:12px;opacity:.75;">ยังไม่มีการแจ้วันนี้</div>'}
        </div>
      </div>`;
  }).join('');

  document.getElementById('today-status-grid').innerHTML = cards || '<div style="color:var(--text-muted)">ไม่พบนักเรียน</div>';

  const chips = Object.entries(statusConf).map(([k, v]) =>
    `<span style="background:var(--bg-primary);border:1px solid var(--border);border-radius:20px;padding:6px 14px;font-size:13px;font-weight:600;">${v.emoji} ${v.label}: <strong>${v.count}</strong></span>`
  ).join('');
  document.getElementById('status-summary-chips').innerHTML = chips;
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
  updateNotifBadge();

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
  if (count > 0) {
    addTeacherNotification({
      type: 'status_confirmed',
      title: '✅ ยืนยันทั้งหมด',
      message: 'ยืนยันรายการรอทั้งหมด ' + count + ' รายการสำเร็จ',
      studentId: '',
      pickupId: '',
    });
  }
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
    // ===== แจ้งเตือนเมื่อสถานะเปลี่ยน =====
    if (statusSelected === 'done') {
      const student = getStudentById(pickups[idx].studentId);
      addTeacherNotification({
        type: 'status_done',
        title: '🏠 นักเรียนถึงบ้านแล้ว',
        message: (student ? student.name : pickups[idx].studentId) + ' (' + (student ? student.class : '') + ') — รับโดย ' + pickups[idx].pickup_by + ' · ' + typeLabel(pickups[idx].type),
        studentId: pickups[idx].studentId,
        pickupId: pickups[idx].id,
        detail: {
          date: pickups[idx].date,
          time: pickups[idx].time,
          type: pickups[idx].type,
          pickup_by: pickups[idx].pickup_by,
          status: 'done',
          note: pickups[idx].note,
        }
      });
    } else if (statusSelected === 'confirmed') {
      const student = getStudentById(pickups[idx].studentId);
      addTeacherNotification({
        type: 'status_confirmed',
        title: '✅ ยืนยันการรับ–ส่ง',
        message: (student ? student.name : pickups[idx].studentId) + ' (' + (student ? student.class : '') + ') — ยืนยันรับโดย ' + pickups[idx].pickup_by,
        studentId: pickups[idx].studentId,
        pickupId: pickups[idx].id,
        detail: {
          date: pickups[idx].date,
          time: pickups[idx].time,
          type: pickups[idx].type,
          pickup_by: pickups[idx].pickup_by,
        }
      });
    }
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
  ['st-name', 'st-class', 'st-parent', 'st-phone'].forEach(id => document.getElementById(id).value = '');
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
  document.getElementById('rpt-pending').textContent = pickups.filter(p => ['pending', 'confirmed'].includes(p.status)).length;
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
  if (id === 'edit-account-modal') { editingAccountUsername = null; const e = document.getElementById('edit-acc-error'); if (e) e.style.display = 'none'; }
}

// ===== ACCOUNTS =====
function getAccounts() {
  const saved = localStorage.getItem('parentAccounts');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.length > 0) return parsed;
  }
  // Fallback: ใช้ DEMO_PARENT_ACCOUNTS จาก data.js (ไม่ใช้ DEMO_ACCOUNTS จาก auth.js)
  localStorage.setItem('parentAccounts', JSON.stringify(DEMO_PARENT_ACCOUNTS));
  return [...DEMO_PARENT_ACCOUNTS];
}

function saveAccountsData(data) {
  localStorage.setItem('parentAccounts', JSON.stringify(data));
  // ไม่ sync กับ DEMO_ACCOUNTS แล้ว — auth.js อ่านตรงจาก localStorage แทน
}

function renderAccounts() {
  // Ultimate fallback: ถ้า accounts ว่าง โหลดจาก DEMO_PARENT_ACCOUNTS ก่อนเสมอ
  let accounts = getAccounts();
  if (!accounts || accounts.length === 0) {
    localStorage.setItem('parentAccounts', JSON.stringify(DEMO_PARENT_ACCOUNTS));
    accounts = [...DEMO_PARENT_ACCOUNTS];
  }
  const students = getStudents();
  const search = document.getElementById('accounts-search')?.value.toLowerCase() || '';
  const filtered = search ? accounts.filter(a =>
    a.username.toLowerCase().includes(search) ||
    a.name.toLowerCase().includes(search) ||
    (students.find(s => s.id === a.studentId)?.name || '').toLowerCase().includes(search)
  ) : accounts;

  // Summary bar
  const linked = accounts.filter(a => students.find(s => s.id === a.studentId)).length;
  const statBar = document.getElementById('accounts-stat-bar');
  if (statBar) {
    statBar.innerHTML = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:120px;background:var(--bg-primary);border-radius:var(--radius-md);padding:14px 18px;border:1px solid var(--border);">
          <div style="font-size:26px;font-weight:800;color:var(--primary);">${accounts.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">🔐 บัญชีทั้งหมด</div>
        </div>
        <div style="flex:1;min-width:120px;background:var(--bg-primary);border-radius:var(--radius-md);padding:14px 18px;border:1px solid var(--border);">
          <div style="font-size:26px;font-weight:800;color:#10b981;">${linked}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">✅ ผูกนักเรียนแล้ว</div>
        </div>
        <div style="flex:1;min-width:120px;background:var(--bg-primary);border-radius:var(--radius-md);padding:14px 18px;border:1px solid var(--border);">
          <div style="font-size:26px;font-weight:800;color:#f59e0b;">${accounts.length - linked}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">⚠️ ยังไม่ผูก</div>
        </div>
        <div style="flex:1;min-width:120px;background:var(--bg-primary);border-radius:var(--radius-md);padding:14px 18px;border:1px solid var(--border);">
          <div style="font-size:26px;font-weight:800;color:#8b5cf6;">${students.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">🎒 นักเรียนทั้งหมด</div>
        </div>
      </div>`;
  }

  // Switch to card grid layout
  const container = document.getElementById('accounts-card-grid');
  if (!container) return;

  // ===== ตารางรหัสสรุป (แสดงก่อนการ์ด) =====
  const tableSummary = document.getElementById('accounts-table-summary');
  if (tableSummary) {
    tableSummary.innerHTML = `
      <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);border-radius:16px;overflow:hidden;margin-bottom:4px;">
        <div style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
          <div style="color:#fff;font-size:15px;font-weight:800;">📋 ตารางรหัสเข้าสู่ระบบนักเรียน/ผู้ปกครองทั้งหมด ${accounts.length} บัญชี</div>
          <div style="display:flex;gap:8px;">
            <button onclick="printAllPasswords()" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">🖨️ พิมพ์</button>
            <button onclick="resetAccountsToDemo()" style="background:rgba(245,158,11,.2);color:#fcd34d;border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">🔄 รีเซ็ตข้อมูล</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:rgba(0,0,0,.2);">
                <th style="color:rgba(255,255,255,.8);padding:10px 16px;text-align:left;font-weight:700;white-space:nowrap;">#</th>
                <th style="color:rgba(255,255,255,.8);padding:10px 16px;text-align:left;font-weight:700;white-space:nowrap;">👤 ชื่อนักเรียน</th>
                <th style="color:rgba(255,255,255,.8);padding:10px 16px;text-align:left;font-weight:700;white-space:nowrap;">📚 ชั้น</th>
                <th style="color:rgba(255,255,255,.8);padding:10px 16px;text-align:left;font-weight:700;white-space:nowrap;">🔑 ชื่อผู้ใช้</th>
                <th style="color:rgba(255,255,255,.8);padding:10px 16px;text-align:left;font-weight:700;white-space:nowrap;">🔒 รหัสผ่าน</th>
                <th style="color:rgba(255,255,255,.8);padding:10px 16px;text-align:left;font-weight:700;white-space:nowrap;">👨‍👩‍👧 ผู้ปกครอง</th>
              </tr>
            </thead>
            <tbody>
              ${accounts.map((acc, i) => {
                const st = students.find(s => s.id === acc.studentId);
                return `<tr style="border-top:1px solid rgba(255,255,255,.08);${i % 2 === 0 ? '' : 'background:rgba(255,255,255,.04);'}">
                  <td style="color:rgba(255,255,255,.6);padding:10px 16px;">${i + 1}</td>
                  <td style="color:#fff;padding:10px 16px;font-weight:600;">${st ? st.photo + ' ' + st.name : '—'}</td>
                  <td style="color:rgba(255,255,255,.85);padding:10px 16px;">${st ? st.class : '—'}</td>
                  <td style="padding:10px 16px;"><code style="background:rgba(255,255,255,.15);color:#93c5fd;padding:3px 10px;border-radius:6px;font-weight:800;font-size:14px;">${acc.username}</code></td>
                  <td style="padding:10px 16px;"><code style="background:rgba(16,185,129,.25);color:#6ee7b7;padding:3px 10px;border-radius:6px;font-weight:800;font-size:14px;">${acc.password}</code></td>
                  <td style="color:rgba(255,255,255,.85);padding:10px 16px;">${acc.name}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔐</div><div class="empty-title">ไม่พบบัญชี</div><div class="empty-desc">ลองเปลี่ยนคำค้นหา</div></div>';
    return;
  }

  container.innerHTML = filtered.map((acc, idx) => {
    const st = students.find(s => s.id === acc.studentId);
    const isLinked = !!st;
    return `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
        <!-- Header: student info -->
        <div style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:18px 20px;display:flex;align-items:center;gap:14px;">
          <div style="font-size:48px;line-height:1;">${st ? st.photo : '👤'}</div>
          <div style="color:#fff;">
            <div style="font-size:16px;font-weight:800;margin-bottom:2px;">${st ? st.name : '– ยังไม่ผูกนักเรียน'}</div>
            <div style="font-size:12px;opacity:.85;">${st ? `📚 ชั้น ${st.class} &nbsp;·&nbsp; ${st.id}` : acc.name}</div>
          </div>
        </div>
        <!-- Credentials box -->
        <div style="padding:16px 20px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">ข้อมูลเข้าสู่ระบบ</div>
          <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:12px;color:var(--text-muted);">🎒 รหัสนักเรียน</span>
              <span style="font-family:monospace;font-size:20px;font-weight:800;color:var(--primary);letter-spacing:.08em;">${acc.username}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;color:var(--text-muted);">🔑 รหัสผ่าน</span>
              <code style="font-size:16px;font-weight:700;color:#059669;background:rgba(16,185,129,.1);padding:3px 12px;border-radius:8px;">${acc.password}</code>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:12px;color:var(--text-muted);">👨‍👩‍👧 ผู้ปกครอง</div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${acc.name}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              ${isLinked
        ? '<span style="background:rgba(16,185,129,.1);color:#059669;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">✅ ผูกแล้ว</span>'
        : '<span style="background:rgba(245,158,11,.1);color:#b45309;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">⚠️ ยังไม่ผูก</span>'
      }
              <button class="btn-sm" style="color:#2563eb;border-color:#93c5fd;" onclick="openEditAccount('${acc.username}')">✏️</button>
              <button class="btn-sm" style="color:#ef4444;border-color:#fca5a5;" onclick="deleteAccount('${acc.username}')">🗑️</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function openAddAccount() {
  const students = getStudents();
  ['acc-username', 'acc-password', 'acc-name'].forEach(id => document.getElementById(id).value = '');
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

['status-modal', 'student-modal', 'account-modal', 'edit-account-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) closeModal(id);
  });
});

// Mobile
if (window.innerWidth <= 768) document.getElementById('hamburger-dash').style.display = 'block';
window.addEventListener('resize', () => {
  document.getElementById('hamburger-dash').style.display = window.innerWidth <= 768 ? 'block' : 'none';
});

// ===== PRINT & RESET ACCOUNTS =====
function printAllPasswords() {
  const accounts = getAccounts();
  const students = getStudents();
  const rows = accounts.map((acc, i) => {
    const st = students.find(s => s.id === acc.studentId);
    return `<tr>
      <td>${i + 1}</td>
      <td>${st ? st.photo + ' ' + st.name : '—'}</td>
      <td>${st ? st.class : '—'}</td>
      <td><strong>${acc.username}</strong></td>
      <td><strong>${acc.password}</strong></td>
      <td>${acc.name}</td>
    </tr>`;
  }).join('');

  const printWin = window.open('', '_blank', 'width=800,height=600');
  printWin.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>รหัสเข้าสู่ระบบนักเรียน</title>
    <style>
      body { font-family: 'Noto Sans Thai', sans-serif; padding: 32px; color: #111; }
      h2 { color: #1d4ed8; margin-bottom: 8px; }
      p { color: #64748b; margin-bottom: 20px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      th { background: #1d4ed8; color: #fff; padding: 10px 14px; text-align: left; }
      td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      .pw { background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 6px; font-weight: 800; font-family: monospace; font-size: 15px; }
      .usr { background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 6px; font-weight: 800; font-family: monospace; font-size: 15px; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h2>🔑 รหัสเข้าสู่ระบบนักเรียน/ผู้ปกครอง</h2>
    <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')} · รวม ${accounts.length} บัญชี</p>
    <table>
      <thead><tr><th>#</th><th>ชื่อนักเรียน</th><th>ชั้น</th><th>ชื่อผู้ใช้</th><th>รหัสผ่าน</th><th>ผู้ปกครอง</th></tr></thead>
      <tbody>${rows.replace(/font-weight:800;font-size:14px/g, '').replace(/<code[^>]*>/g, '<span class="usr">').replace(/<\/code>/g, '</span>').replace(/<code[^>]*color:#6ee7b7[^>]*>/g, '<span class="pw">').replace(/<\/code>/g, '</span>')}</tbody>
    </table>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
  printWin.document.close();
}

function resetAccountsToDemo() {
  if (!confirm('รีเซ็ตข้อมูลบัญชีทั้งหมดกลับเป็นค่าเริ่มต้น?\n\nรหัสผ่านที่แก้ไขทั้งหมดจะหายไป')) return;
  const demoAccounts = [
    { username: '691231', password: '1234', name: 'นาง สมหญิง รักลูก',   studentId: 'S001' },
    { username: '691232', password: '1234', name: 'นาย สมชาย ใจดี',       studentId: 'S002' },
    { username: '691233', password: '1234', name: 'นาง วิภา ศรีสวัสดิ์',  studentId: 'S003' },
    { username: '691234', password: '1234', name: 'นาย สุริยา สุขใจ',     studentId: 'S004' },
    { username: '691235', password: '1234', name: 'นาง พิมพ์ เจริญ',      studentId: 'S005' },
    { username: '691236', password: '1234', name: 'นาย ธีรพล แสงทอง',    studentId: 'S006' },
    { username: '691237', password: '1234', name: 'นาง รัตนา มั่นคง',     studentId: 'S007' },
    { username: '691238', password: '1234', name: 'นาย ประสิทธิ์ ดีงาม', studentId: 'S008' },
    { username: '691239', password: '1234', name: 'นาง จิราภา โชคดี',    studentId: 'S009' },
    { username: '691240', password: '1234', name: 'นาย วิชัย สวัสดี',     studentId: 'S010' },
  ];
  saveAccountsData(demoAccounts);
  showToast('รีเซ็ตบัญชีทั้งหมดกลับค่าเริ่มต้นแล้ว');
  renderAccounts();
}

// ===== NOTIFICATIONS =====
function renderNotifications() {  const notifs = getNotifications();
  const unread = notifs.filter(n => !n.read).length;

  const badge = document.getElementById('badge-notif');
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? '' : 'none'; }

  const container = document.getElementById('notif-list');
  if (!container) return;

  if (notifs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">ไม่มีการแจ้งเตือน</div><div class="empty-desc">เมื่อผู้ปกครองแจ้งข้อมูลหรือสถานะเปลี่ยน จะปรากฏที่นี่</div></div>';
    return;
  }

  const typeColors = {
    new_request: { bg: '#eff6ff', border: '#93c5fd', icon: '📝' },
    quick_request: { bg: '#ecfdf5', border: '#86efac', icon: '🚀' },
    status_done: { bg: '#f0fdf4', border: '#86efac', icon: '🏠' },
    status_confirmed: { bg: '#eff6ff', border: '#93c5fd', icon: '✅' },
    cancelled: { bg: '#fef2f2', border: '#fca5a5', icon: '❌' },
  };

  container.innerHTML = notifs.map(n => {
    const isUnread = !n.read;
    const tc = typeColors[n.type] || { bg: '#f8fafc', border: '#e2e8f0', icon: '🔔' };
    return `<div style="background:${isUnread ? tc.bg : 'var(--bg-card)'};border:1.5px solid ${isUnread ? tc.border : 'var(--border)'};border-radius:14px;padding:18px 20px;cursor:pointer;transition:all 0.2s;${isUnread ? 'box-shadow:0 2px 12px rgba(37,99,235,0.1);' : ''}" onclick="markNotificationRead('${n.id}'); renderNotifications();">
      <div style="display:flex;align-items:flex-start;gap:14px;">
        <div style="font-size:28px;line-height:1;flex-shrink:0;">${tc.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
            <div style="font-size:14px;font-weight:${isUnread ? '800' : '600'};color:var(--text-primary);">${n.title}${isUnread ? ' <span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;margin-left:4px;">ใหม่</span>' : ''}</div>
            <div style="font-size:11px;color:var(--text-muted);flex-shrink:0;white-space:nowrap;">${n.created_at}</div>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${n.message}</div>
          ${n.detail ? `<div style="margin-top:8px;background:rgba(0,0,0,0.04);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--text-muted);">
            📅 ${n.detail.date ? formatDate(n.detail.date) : ''}${n.detail.time ? ' · ' + n.detail.time + ' น.' : ''}${n.detail.pickup_by ? ' · รับโดย ' + n.detail.pickup_by : ''}${n.detail.note ? ' · ' + n.detail.note : ''}
          </div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function clearAllNotifications() {
  if (!confirm('ยืนยันล้างการแจ้งเตือนทั้งหมด?')) return;
  saveNotifications([]);
  showToast('ล้างการแจ้งเตือนทั้งหมดแล้ว');
  renderNotifications();
}

function updateNotifBadge() {
  const unread = getUnreadNotifCount();
  const badge = document.getElementById('badge-notif');
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? '' : 'none'; }
  const notifDot = document.getElementById('notif-dot');
  if (notifDot) notifDot.style.display = (unread > 0 || getPendingPickups().length > 0) ? '' : 'none';
}

// ===== EDIT ACCOUNT =====
let editingAccountUsername = null;

function openEditAccount(username) {
  editingAccountUsername = username;
  const accounts = getAccounts();
  const acc = accounts.find(a => a.username === username);
  if (!acc) return;
  const students = getStudents();
  document.getElementById('edit-acc-display-name').textContent = acc.name;
  document.getElementById('edit-acc-display-username').textContent = 'ชื่อผู้ใช้: ' + acc.username;
  document.getElementById('edit-acc-username').value = acc.username;
  document.getElementById('edit-acc-password').value = acc.password;
  document.getElementById('edit-acc-name').value = acc.name;
  const sel = document.getElementById('edit-acc-student');
  sel.innerHTML = '<option value="">–– เลือกนักเรียน ––</option>' +
    students.map(s => `<option value="${s.id}"${s.id === acc.studentId ? ' selected' : ''}>${s.name} (${s.class})</option>`).join('');
  document.getElementById('edit-acc-error').style.display = 'none';
  document.getElementById('edit-account-modal').classList.add('open');
}

function saveEditAccount() {
  const password = document.getElementById('edit-acc-password').value.trim();
  const name = document.getElementById('edit-acc-name').value.trim();
  const studentId = document.getElementById('edit-acc-student').value;
  const errEl = document.getElementById('edit-acc-error');
  if (!password) { errEl.textContent = '⚠️ กรุณากรอกรหัสผ่าน'; errEl.style.display = 'block'; return; }
  if (!name) { errEl.textContent = '⚠️ กรุณากรอกชื่อผู้ปกครอง'; errEl.style.display = 'block'; return; }
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.username === editingAccountUsername);
  if (idx === -1) { errEl.textContent = '⚠️ ไม่พบบัญชีนี้'; errEl.style.display = 'block'; return; }
  const oldStudentId = accounts[idx].studentId;
  accounts[idx].password = password;
  accounts[idx].name = name;
  accounts[idx].studentId = studentId;
  saveAccountsData(accounts);
  // Update student links
  const students = getStudents();
  if (oldStudentId && oldStudentId !== studentId) {
    const oldStIdx = students.findIndex(s => s.id === oldStudentId);
    if (oldStIdx !== -1 && students[oldStIdx].parentId === editingAccountUsername) students[oldStIdx].parentId = '';
  }
  if (studentId) {
    const stIdx = students.findIndex(s => s.id === studentId);
    if (stIdx !== -1) { students[stIdx].parentId = editingAccountUsername; students[stIdx].parentName = name; }
  }
  saveStudents(students);
  showToast('แก้ไขบัญชี ' + editingAccountUsername + ' สำเร็จ!');
  closeModal('edit-account-modal');
  renderAccounts();
}

// Init
renderDashboard();

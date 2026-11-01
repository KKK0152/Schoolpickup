// ===== PARENT DASHBOARD =====
const user = requireAuth('parent');
if (!user) throw new Error('Not auth');

let editingId = null;

// Init UI
document.getElementById('sidebar-name').textContent = user.name;
updateTopbarDate();

function updateTopbarDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('topbar-date').textContent = now.toLocaleDateString('th-TH', opts);
}

// Set default date for notify form
document.getElementById('notify-date').value = todayStr();

// ===== NAVIGATION =====
const sections = ['dashboard', 'notify', 'history', 'student-info'];
const sectionTitles = {
  dashboard: ['ภาพรวม', `สวัสดี, ${user.name}`],
  notify: ['แจ้งรับ–ส่งนักเรียน', 'กรอกข้อมูลการรับ–ส่งนักเรียนของบุตรหลาน'],
  history: ['ประวัติการรับ–ส่ง', 'ข้อมูลย้อนหลังการรับ–ส่งนักเรียน'],
  'student-info': ['ข้อมูลนักเรียน', 'รายละเอียดข้อมูลนักเรียนและผู้ปกครอง'],
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
  if (name === 'notify') renderNotifyList();
  if (name === 'history') {
    if (!document.getElementById('history-month').value) {
      document.getElementById('history-month').value = todayStr().slice(0, 7);
    }
    renderHistory();
  }
  if (name === 'student-info') renderStudentInfo();

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

// ===== GET MY PICKUPS =====
function getMyPickups() {
  const all = getPickups();
  const student = getStudents().find(s => s.parentId === user.username);
  if (!student) return [];
  return all.filter(p => p.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

function getMyStudent() {
  return getStudents().find(s => s.parentId === user.username) || null;
}

// ===== DASHBOARD =====
function renderDashboard() {
  const pickups = getMyPickups();
  const today = todayStr();
  const todayPickups = pickups.filter(p => p.date === today);
  const pending = pickups.filter(p => p.status === 'pending');
  const confirmed = pickups.filter(p => p.status === 'confirmed');
  const done = pickups.filter(p => p.status === 'done');

  document.getElementById('card-today').textContent = todayPickups.length;
  document.getElementById('card-pending').textContent = pending.length;
  document.getElementById('card-confirmed').textContent = confirmed.length;
  document.getElementById('card-done').textContent = done.length;

  const tbody = document.getElementById('recent-tbody');
  const recent = pickups.slice(0, 8);
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">ยังไม่มีรายการ</div><div class="empty-desc">กดปุ่ม "แจ้งรับ–ส่งใหม่" เพื่อเริ่มต้น</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(p => {
    const s = statusLabel(p.status);
    return `<tr>
      <td>${formatDate(p.date)}</td>
      <td>${p.time} น.</td>
      <td>${p.pickup_by}</td>
      <td>${typeLabel(p.type)}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td>
        ${p.status === 'pending' ? `<button class="btn-sm" onclick="openEdit('${p.id}')">✏️ แก้ไข</button>` : '<span style="color:var(--text-muted);font-size:12px">–</span>'}
      </td>
    </tr>`;
  }).join('');
}

// ===== NOTIFY FORM =====
function submitNotify(e) {
  e.preventDefault();
  const student = getMyStudent();
  if (!student) { showToast('ไม่พบข้อมูลนักเรียน', 'error'); return; }

  const btn = document.getElementById('notify-submit-btn');
  btn.textContent = '⏳ กำลังบันทึก...';
  btn.disabled = true;

  setTimeout(() => {
    const pickups = getPickups();
    const newPickup = {
      id: generateId('P'),
      studentId: student.id,
      date: document.getElementById('notify-date').value,
      time: document.getElementById('notify-time').value,
      pickup_by: document.getElementById('notify-pickup-by').value.trim(),
      type: document.getElementById('notify-type').value,
      status: 'pending',
      note: document.getElementById('notify-note').value.trim(),
      created_at: new Date().toLocaleString('th-TH'),
    };
    pickups.push(newPickup);
    savePickups(pickups);
    showToast('แจ้งข้อมูลการรับ–ส่งสำเร็จ!');
    resetNotifyForm();
    renderNotifyList();
    btn.textContent = '📝 บันทึกการแจ้ง';
    btn.disabled = false;
  }, 800);
}

function resetNotifyForm() {
  document.getElementById('notifyForm').reset();
  document.getElementById('notify-date').value = todayStr();
  document.getElementById('notify-time').value = '15:30';
}

function renderNotifyList() {
  const pickups = getMyPickups();
  const tbody = document.getElementById('notify-tbody');
  if (pickups.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">ยังไม่มีรายการ</div><div class="empty-desc">กรอกข้อมูลด้านบนเพื่อแจ้งรับ–ส่งนักเรียน</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = pickups.map(p => {
    const s = statusLabel(p.status);
    return `<tr>
      <td>${formatDate(p.date)}</td>
      <td>${p.time} น.</td>
      <td>${p.pickup_by}</td>
      <td>${typeLabel(p.type)}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        ${p.status === 'pending' ? `<button class="btn-sm" onclick="openEdit('${p.id}')">✏️ แก้ไข</button>` : ''}
        ${p.status === 'pending' ? `<button class="btn-sm" style="color:#ef4444;border-color:#fca5a5;" onclick="cancelPickup('${p.id}')">❌ ยกเลิก</button>` : ''}
        ${!['pending'].includes(p.status) ? '<span style="color:var(--text-muted);font-size:12px">–</span>' : ''}
      </td>
    </tr>`;
  }).join('');
}

function cancelPickup(id) {
  if (!confirm('ยืนยันการยกเลิกรายการนี้?')) return;
  const pickups = getPickups();
  const idx = pickups.findIndex(p => p.id === id);
  if (idx !== -1) {
    pickups[idx].status = 'cancelled';
    savePickups(pickups);
    showToast('ยกเลิกรายการแล้ว', 'warning');
    renderNotifyList();
    renderDashboard();
  }
}

// ===== EDIT MODAL =====
function openEdit(id) {
  editingId = id;
  const pickups = getPickups();
  const p = pickups.find(x => x.id === id);
  if (!p) return;
  document.getElementById('edit-date').value = p.date;
  document.getElementById('edit-time').value = p.time;
  document.getElementById('edit-pickup-by').value = p.pickup_by;
  document.getElementById('edit-note').value = p.note;
  document.getElementById('edit-modal').classList.add('open');
}

function saveEdit() {
  if (!editingId) return;
  const pickups = getPickups();
  const idx = pickups.findIndex(p => p.id === editingId);
  if (idx !== -1) {
    pickups[idx].date = document.getElementById('edit-date').value;
    pickups[idx].time = document.getElementById('edit-time').value;
    pickups[idx].pickup_by = document.getElementById('edit-pickup-by').value.trim();
    pickups[idx].note = document.getElementById('edit-note').value.trim();
    savePickups(pickups);
    showToast('แก้ไขข้อมูลสำเร็จ!');
    closeModal('edit-modal');
    renderDashboard();
    renderNotifyList();
  }
}

// ===== HISTORY =====
function renderHistory() {
  const pickups = getMyPickups();
  const search = document.getElementById('history-search').value.toLowerCase();
  const month = document.getElementById('history-month').value;

  let filtered = pickups;
  if (month) filtered = filtered.filter(p => p.date.startsWith(month));
  if (search) filtered = filtered.filter(p =>
    p.pickup_by.toLowerCase().includes(search) ||
    formatDate(p.date).includes(search) ||
    p.note.toLowerCase().includes(search)
  );

  const tbody = document.getElementById('history-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📂</div><div class="empty-title">ไม่พบข้อมูล</div><div class="empty-desc">ลองเปลี่ยนเงื่อนไขการค้นหา</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(p => {
    const s = statusLabel(p.status);
    return `<tr>
      <td>${formatDate(p.date)}</td>
      <td>${p.time} น.</td>
      <td>${p.pickup_by}</td>
      <td>${typeLabel(p.type)}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td style="max-width:200px;color:var(--text-muted);font-size:13px;">${p.note || '–'}</td>
    </tr>`;
  }).join('');
}

// ===== STUDENT INFO =====
function renderStudentInfo() {
  const student = getMyStudent();
  const el = document.getElementById('student-info-content');
  if (!student) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🎒</div><div class="empty-title">ไม่พบข้อมูลนักเรียน</div></div>';
    return;
  }
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;padding:24px;background:var(--bg-primary);border-radius:var(--radius-lg);margin-bottom:24px;">
      <div style="font-size:80px;">${student.photo}</div>
      <div>
        <div style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:6px;">${student.name}</div>
        <div style="font-size:15px;color:var(--text-secondary);margin-bottom:4px;">📚 ชั้น ${student.class}</div>
        <div style="font-size:13px;color:var(--text-muted);">รหัสนักเรียน: ${student.id}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="padding:20px;background:var(--bg-primary);border-radius:var(--radius-md);">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">ผู้ปกครอง</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-primary);">${student.parentName}</div>
      </div>
      <div style="padding:20px;background:var(--bg-primary);border-radius:var(--radius-md);">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">เบอร์โทรศัพท์</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-primary);">${student.phone}</div>
      </div>
    </div>
  `;
}

// ===== MODAL =====
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  editingId = null;
}

// Close modal on overlay click
document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal('edit-modal');
});

// Mobile hamburger
if (window.innerWidth <= 768) {
  document.getElementById('hamburger-dash').style.display = 'block';
}
window.addEventListener('resize', () => {
  document.getElementById('hamburger-dash').style.display = window.innerWidth <= 768 ? 'block' : 'none';
});

// Init
renderDashboard();

// ===== DEMO DATA =====
const DEMO_STUDENTS = [
  { id: 'S001', name: 'ด.ช.เก่งกาจ รักลูก', class: 'ป.3/1', parentId: '691231', parentName: 'นาง สมหญิง รักลูก', phone: '081-xxx-1111', photo: '👦' },
  { id: 'S002', name: 'ด.ญ.สวยงาม ใจดี', class: 'ป.5/2', parentId: '691232', parentName: 'นาย สมชาย ใจดี', phone: '082-xxx-2222', photo: '👧' },
  { id: 'S003', name: 'ด.ช.ฉลาดเฉลียว ศรีสวัสดิ์', class: 'ป.1/3', parentId: '691233', parentName: 'นาง วิภา ศรีสวัสดิ์', phone: '083-xxx-3333', photo: '👦' },
  { id: 'S004', name: 'ด.ญ.มาลี สุขใจ', class: 'ป.4/1', parentId: 'parent04', parentName: 'นาย สุริยา สุขใจ', phone: '084-xxx-4444', photo: '👧' },
  { id: 'S005', name: 'ด.ช.วิทยา เจริญ', class: 'ป.6/2', parentId: 'parent05', parentName: 'นาง พิมพ์ เจริญ', phone: '085-xxx-5555', photo: '👦' },
];

const DEMO_PICKUPS = [
  { id: 'P001', studentId: 'S001', date: '2026-11-01', time: '15:30', pickup_by: 'นาง สมหญิง รักลูก', type: 'pickup', status: 'confirmed', note: '', created_at: '2026-10-31 20:00' },
  { id: 'P002', studentId: 'S002', date: '2026-11-01', time: '16:00', pickup_by: 'นาย สมชาย ใจดี', type: 'pickup', status: 'pending', note: 'จะมารับเองไม่มีคนขับรถ', created_at: '2026-11-01 07:30' },
  { id: 'P003', studentId: 'S003', date: '2026-11-01', time: '15:45', pickup_by: 'นาง วิภา ศรีสวัสดิ์', type: 'pickup', status: 'done', note: '', created_at: '2026-11-01 08:00' },
  { id: 'P004', studentId: 'S004', date: '2026-11-01', time: '16:30', pickup_by: 'นาย สุริยา สุขใจ', type: 'pickup', status: 'pending', note: 'อาจสายเล็กน้อย', created_at: '2026-11-01 09:00' },
  { id: 'P005', studentId: 'S001', date: '2026-10-31', time: '15:30', pickup_by: 'นาง สมหญิง รักลูก', type: 'pickup', status: 'done', note: '', created_at: '2026-10-30 21:00' },
  { id: 'P006', studentId: 'S002', date: '2026-10-31', time: '16:00', pickup_by: 'รถรับส่ง', type: 'bus', status: 'done', note: '', created_at: '2026-10-30 19:00' },
  { id: 'P007', studentId: 'S005', date: '2026-11-01', time: '07:30', pickup_by: 'รถรับส่ง', type: 'bus', status: 'confirmed', note: '', created_at: '2026-10-31 18:00' },
];

// Init data to localStorage
function initData() {
  if (!localStorage.getItem('students')) localStorage.setItem('students', JSON.stringify(DEMO_STUDENTS));
  if (!localStorage.getItem('pickups')) localStorage.setItem('pickups', JSON.stringify(DEMO_PICKUPS));
}

function getStudents() { return JSON.parse(localStorage.getItem('students') || '[]'); }
function getPickups() { return JSON.parse(localStorage.getItem('pickups') || '[]'); }
function savePickups(data) { localStorage.setItem('pickups', JSON.stringify(data)); }
function saveStudents(data) { localStorage.setItem('students', JSON.stringify(data)); }

function getUser() {
  const u = sessionStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function requireAuth(role) {
  const user = getUser();
  if (!user) { window.location.href = 'login.html'; return null; }
  if (role && user.role !== role) { window.location.href = 'login.html'; return null; }
  return user;
}

function logout() {
  sessionStorage.removeItem('user');
  window.location.href = 'login.html';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return formatDate(dateStr) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status) {
  const map = {
    pending: { label: '⏳ รอยืนยัน', cls: 'status-pending' },
    confirmed: { label: '✅ ยืนยันแล้ว', cls: 'status-confirmed' },
    done: { label: '🎒 รับนักเรียนแล้ว', cls: 'status-done' },
    cancelled: { label: '❌ ยกเลิก', cls: 'status-cancelled' },
  };
  return map[status] || { label: status, cls: '' };
}

function typeLabel(type) {
  return type === 'bus' ? '🚌 รถรับส่ง' : '🚗 ผู้ปกครองมารับ';
}

function generateId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase();
}

// Toast notification
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  toast.innerHTML = `<span class="toast-icon">${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

initData();

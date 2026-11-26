const API_KEY_STORAGE = 'dosemind_gemini_api_key';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const appState = {
  user: null,
  activePage: 'dashboard', // 'dashboard' | 'profile'
  medicines: [],
  logs: [],
  doctors: [],
  profile: {
    dob: '',
    bloodType: '',
    allergies: '',
    medicalConditions: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
  },
  settings: {
    defaultSnoozeMinutes: 10,
    soundEnabled: true,
    notificationsEnabled: true,
    model: 'gemini-3.8-flash',
    caregiverName: '',
    caregiverContact: '',
    darkMode: false,
    largeText: false,
  },
  hasServerApiKey: false,
  formTimes: ['08:00'],
  attachedImage: null,
  parsedMedicines: [],
  activeDueDose: null,
  notifiedKeys: new Set(),
};

const els = {
  authView: document.getElementById('authView'),
  appView: document.getElementById('appView'),
  showLoginTab: document.getElementById('showLoginTab'),
  showRegisterTab: document.getElementById('showRegisterTab'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginSubmitBtn: document.getElementById('loginSubmitBtn'),
  registerForm: document.getElementById('registerForm'),
  regName: document.getElementById('regName'),
  regEmail: document.getElementById('regEmail'),
  regPassword: document.getElementById('regPassword'),
  importLegacyWrap: document.getElementById('importLegacyWrap'),
  importLegacyInput: document.getElementById('importLegacyInput'),
  registerSubmitBtn: document.getElementById('registerSubmitBtn'),
  authError: document.getElementById('authError'),
  navDashboardBtn: document.getElementById('navDashboardBtn'),
  navProfileBtn: document.getElementById('navProfileBtn'),
  dashboardPage: document.getElementById('dashboardPage'),
  profilePage: document.getElementById('profilePage'),
  userBadge: document.getElementById('userBadge'),
  logoutBtn: document.getElementById('logoutBtn'),
  liveClock: document.getElementById('liveClock'),
  largeTextBtn: document.getElementById('largeTextBtn'),
  darkModeBtn: document.getElementById('darkModeBtn'),
  exportReportBtn: document.getElementById('exportReportBtn'),
  testAlarmBtn: document.getElementById('testAlarmBtn'),
  apiKeyStatusBtn: document.getElementById('apiKeyStatusBtn'),
  apiKeyDot: document.getElementById('apiKeyDot'),
  apiKeyBtnLabel: document.getElementById('apiKeyBtnLabel'),
  dueAlertBanner: document.getElementById('dueAlertBanner'),
  dueAlertTitle: document.getElementById('dueAlertTitle'),
  dueAlertSubtitle: document.getElementById('dueAlertSubtitle'),
  alertTakeBtn: document.getElementById('alertTakeBtn'),
  alertSnoozeBtn: document.getElementById('alertSnoozeBtn'),
  alertSkipBtn: document.getElementById('alertSkipBtn'),
  todayProgressValue: document.getElementById('todayProgressValue'),
  todayProgressPct: document.getElementById('todayProgressPct'),
  todayProgressBar: document.getElementById('todayProgressBar'),
  nextDoseName: document.getElementById('nextDoseName'),
  nextDoseCountdown: document.getElementById('nextDoseCountdown'),
  adherenceValue: document.getElementById('adherenceValue'),
  takenTotalCount: document.getElementById('takenTotalCount'),
  caregiverSummaryMeta: document.getElementById('caregiverSummaryMeta'),
  refillStatusValue: document.getElementById('refillStatusValue'),
  refillStatusMeta: document.getElementById('refillStatusMeta'),
  todayDateLabel: document.getElementById('todayDateLabel'),
  timelineContainer: document.getElementById('timelineContainer'),
  cabinetContainer: document.getElementById('cabinetContainer'),
  cabinetCount: document.getElementById('cabinetCount'),
  archiveContainer: document.getElementById('archiveContainer'),
  archiveCount: document.getElementById('archiveCount'),
  archiveSearchInput: document.getElementById('archiveSearchInput'),
  historyContainer: document.getElementById('historyContainer'),
  historyCount: document.getElementById('historyCount'),
  historySearchInput: document.getElementById('historySearchInput'),
  checkInteractionsBtn: document.getElementById('checkInteractionsBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  openAddMedBtn: document.getElementById('openAddMedBtn'),
  geminiParseForm: document.getElementById('geminiParseForm'),
  parseInputText: document.getElementById('parseInputText'),
  parseImageInput: document.getElementById('parseImageInput'),
  parseImageName: document.getElementById('parseImageName'),
  clearImageBtn: document.getElementById('clearImageBtn'),
  imagePreviewWrap: document.getElementById('imagePreviewWrap'),
  parseImagePreview: document.getElementById('parseImagePreview'),
  parseSubmitBtn: document.getElementById('parseSubmitBtn'),
  parsedResultsWrap: document.getElementById('parsedResultsWrap'),
  parsedSummary: document.getElementById('parsedSummary'),
  parsedList: document.getElementById('parsedList'),
  addAllParsedBtn: document.getElementById('addAllParsedBtn'),
  chatMessages: document.getElementById('chatMessages'),
  geminiChatForm: document.getElementById('geminiChatForm'),
  chatInput: document.getElementById('chatInput'),
  chatSubmitBtn: document.getElementById('chatSubmitBtn'),
  // Profile & Doctors
  profileOverviewName: document.getElementById('profileOverviewName'),
  profileOverviewMeta: document.getElementById('profileOverviewMeta'),
  profileSummaryGrid: document.getElementById('profileSummaryGrid'),
  profileForm: document.getElementById('profileForm'),
  profName: document.getElementById('profName'),
  profDob: document.getElementById('profDob'),
  profBloodType: document.getElementById('profBloodType'),
  profAllergies: document.getElementById('profAllergies'),
  profConditions: document.getElementById('profConditions'),
  profEmergencyName: document.getElementById('profEmergencyName'),
  profEmergencyRelation: document.getElementById('profEmergencyRelation'),
  profEmergencyPhone: document.getElementById('profEmergencyPhone'),
  emergencyQuickDialBtn: document.getElementById('emergencyQuickDialBtn'),
  doctorsListContainer: document.getElementById('doctorsListContainer'),
  openAddDoctorBtn: document.getElementById('openAddDoctorBtn'),
  doctorModal: document.getElementById('doctorModal'),
  doctorModalTitle: document.getElementById('doctorModalTitle'),
  doctorForm: document.getElementById('doctorForm'),
  docId: document.getElementById('docId'),
  docName: document.getElementById('docName'),
  docSpecialty: document.getElementById('docSpecialty'),
  docPhone: document.getElementById('docPhone'),
  docClinic: document.getElementById('docClinic'),
  docEmail: document.getElementById('docEmail'),
  docNotes: document.getElementById('docNotes'),
  docPrimary: document.getElementById('docPrimary'),
  openDeleteAccountBtn: document.getElementById('openDeleteAccountBtn'),
  deleteAccountModal: document.getElementById('deleteAccountModal'),
  deleteAccountForm: document.getElementById('deleteAccountForm'),
  deleteConfirmPassword: document.getElementById('deleteConfirmPassword'),
  // Medicine Modal
  medicineModal: document.getElementById('medicineModal'),
  medicineModalTitle: document.getElementById('medicineModalTitle'),
  medicineForm: document.getElementById('medicineForm'),
  medId: document.getElementById('medId'),
  medName: document.getElementById('medName'),
  medDosage: document.getElementById('medDosage'),
  medCondition: document.getElementById('medCondition'),
  medScheduleType: document.getElementById('medScheduleType'),
  medMeal: document.getElementById('medMeal'),
  medStartDate: document.getElementById('medStartDate'),
  medEndDate: document.getElementById('medEndDate'),
  medColor: document.getElementById('medColor'),
  medStock: document.getElementById('medStock'),
  medThreshold: document.getElementById('medThreshold'),
  daysOfWeekField: document.getElementById('daysOfWeekField'),
  daysOfWeekGroup: document.getElementById('daysOfWeekGroup'),
  reminderTimesField: document.getElementById('reminderTimesField'),
  newTimeInput: document.getElementById('newTimeInput'),
  addTimeBtn: document.getElementById('addTimeBtn'),
  timesChipList: document.getElementById('timesChipList'),
  medNotes: document.getElementById('medNotes'),
  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  serverKeyNotice: document.getElementById('serverKeyNotice'),
  geminiApiKeyInput: document.getElementById('geminiApiKeyInput'),
  toggleKeyVisibility: document.getElementById('toggleKeyVisibility'),
  verifyKeyBtn: document.getElementById('verifyKeyBtn'),
  verifyKeyResult: document.getElementById('verifyKeyResult'),
  geminiModelSelect: document.getElementById('geminiModelSelect'),
  customModelInput: document.getElementById('customModelInput'),
  caregiverNameInput: document.getElementById('caregiverNameInput'),
  caregiverContactInput: document.getElementById('caregiverContactInput'),
  snoozeMinutesInput: document.getElementById('snoozeMinutesInput'),
  soundEnabledInput: document.getElementById('soundEnabledInput'),
  notificationsEnabledInput: document.getElementById('notificationsEnabledInput'),
  requestNotifBtn: document.getElementById('requestNotifBtn'),
  notifPermStatus: document.getElementById('notifPermStatus'),
  toastContainer: document.getElementById('toastContainer'),
};

function todayDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function sanitizeTelHref(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : '#';
}

function getLocalApiKey() {
  return (localStorage.getItem(API_KEY_STORAGE) || '').trim();
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, isError = false) {
  const el = document.createElement('div');
  el.className = `toast ${isError ? 'error' : ''}`;
  el.textContent = message;
  els.toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const localKey = getLocalApiKey();
  if (localKey) {
    headers['x-gemini-api-key'] = localKey;
  }
  const res = await fetch(url, { credentials: 'same-origin', ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.startsWith('/api/auth/')) {
    showAuthView();
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function showAuthView() {
  appState.user = null;
  els.authView.classList.remove('hidden');
  els.appView.classList.add('hidden');
  document.title = 'DoseMind AI — Sign In';
}

function showAppView(user) {
  appState.user = user;
  els.userBadge.textContent = `👤 ${user.name}`;
  els.authView.classList.add('hidden');
  els.appView.classList.remove('hidden');
  switchAppPage(appState.activePage || 'dashboard');
}

function switchAppPage(page) {
  appState.activePage = page;
  const isDashboard = page === 'dashboard';
  els.dashboardPage.classList.toggle('hidden', !isDashboard);
  els.profilePage.classList.toggle('hidden', isDashboard);
  els.navDashboardBtn.classList.toggle('active', isDashboard);
  els.navProfileBtn.classList.toggle('active', !isDashboard);
  if (!isDashboard) {
    renderProfilePage();
  }
}

function switchAuthTab(mode) {
  const isLogin = mode === 'login';
  els.showLoginTab.classList.toggle('active', isLogin);
  els.showRegisterTab.classList.toggle('active', !isLogin);
  els.loginForm.classList.toggle('hidden', !isLogin);
  els.registerForm.classList.toggle('hidden', isLogin);
  els.authError.classList.add('hidden');
}

function playChime() {
  if (!appState.settings.soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  } catch {
    // Ignore
  }
}

function sendDesktopNotification(title, body) {
  if (!appState.settings.notificationsEnabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    // Ignore
  }
}

function isMedicineActiveToday(med, date = new Date()) {
  if (!med.active || med.courseStatus === 'cured') return false;
  const today = todayDateStr(date);
  if (med.startDate && today < med.startDate) return false;
  if (med.endDate && today > med.endDate) return false;
  if (med.scheduleType === 'prn') return false;
  if (med.scheduleType === 'days') {
    const dayIdx = date.getDay();
    const allowed = Array.isArray(med.daysOfWeek) ? med.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    if (!allowed.includes(dayIdx)) return false;
  }
  return true;
}

function getTodaySchedule() {
  const now = new Date();
  const today = todayDateStr(now);
  const nowMins = minutesSinceMidnight(now);
  const items = [];

  for (const med of appState.medicines) {
    if (!isMedicineActiveToday(med, now)) continue;
    for (const time of med.times || []) {
      const log = appState.logs.find(
        (l) => !l.isPrn && l.medicineId === med.id && l.scheduledTime === time && l.date === today
      );
      const schedMins = parseTimeMinutes(time);
      let status = 'upcoming';
      let snoozeLabel = '';

      if (log) {
        status = log.status;
        if (log.status === 'snoozed' && log.snoozeUntil) {
          const snoozeDate = new Date(log.snoozeUntil);
          if (Date.now() >= snoozeDate.getTime()) {
            status = 'due';
          } else {
            snoozeLabel = `${String(snoozeDate.getHours()).padStart(2, '0')}:${String(
              snoozeDate.getMinutes()
            ).padStart(2, '0')}`;
          }
        }
      } else if (nowMins >= schedMins && nowMins <= schedMins + 30) {
        status = 'due';
      } else if (nowMins > schedMins + 30) {
        status = 'missed';
      }

      items.push({
        medicine: med,
        time,
        schedMins,
        status,
        snoozeLabel,
        log,
      });
    }
  }

  return items.sort((a, b) => a.schedMins - b.schedMins);
}

function applyThemeAndAccessibility() {
  document.body.classList.toggle('dark-mode', Boolean(appState.settings.darkMode));
  document.body.classList.toggle('large-text', Boolean(appState.settings.largeText));
  els.darkModeBtn.textContent = appState.settings.darkMode ? '☀️' : '🌙';
}

function updateApiKeyBadge() {
  const hasKey = Boolean(getLocalApiKey() || appState.hasServerApiKey);
  els.apiKeyDot.classList.toggle('ready', hasKey);
  els.apiKeyBtnLabel.textContent = hasKey ? 'Gemini Key Ready' : 'Set Gemini Key';
}

function renderStats(schedule) {
  const total = schedule.length;
  const taken = schedule.filter((item) => item.status === 'taken').length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  els.todayProgressValue.textContent = `${taken} / ${total}`;
  els.todayProgressPct.textContent = `${pct}%`;
  els.todayProgressBar.style.width = `${pct}%`;

  const nowMins = minutesSinceMidnight();
  const nextItem = schedule.find((item) => item.status === 'due' || item.status === 'upcoming');
  if (nextItem) {
    els.nextDoseName.textContent = `${nextItem.medicine.name} (${nextItem.time})`;
    if (nextItem.status === 'due') {
      els.nextDoseCountdown.textContent = 'Due right now!';
    } else {
      const diff = nextItem.schedMins - nowMins;
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      els.nextDoseCountdown.textContent =
        hrs > 0 ? `In ${hrs}h ${mins}m` : `In ${Math.max(1, mins)} min`;
    }
  } else {
    els.nextDoseName.textContent = total > 0 ? 'All done for today' : 'No doses scheduled';
    els.nextDoseCountdown.textContent =
      total > 0 ? 'Great job keeping up!' : 'Add a medicine or load demo data';
  }

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentLogs = appState.logs.filter((l) => new Date(l.loggedAt).getTime() >= cutoff);
  const recentTaken = recentLogs.filter((l) => l.status === 'taken').length;
  const recentDecided = recentLogs.filter((l) => l.status === 'taken' || l.status === 'skipped').length;
  els.adherenceValue.textContent =
    recentDecided > 0 ? `${Math.round((recentTaken / recentDecided) * 100)}%` : '--%';
  els.takenTotalCount.textContent = `${recentTaken} taken`;

  if (appState.settings.caregiverName) {
    els.caregiverSummaryMeta.textContent = `Caregiver: ${appState.settings.caregiverName}`;
  } else {
    els.caregiverSummaryMeta.textContent = 'Logged doses over the past 7 days';
  }

  const lowMeds = appState.medicines.filter(
    (m) => m.active && typeof m.stockCount === 'number' && m.stockCount <= (m.lowStockThreshold ?? 5)
  );
  const curedCount = appState.medicines.filter((m) => m.courseStatus === 'cured').length;
  els.refillStatusValue.textContent = lowMeds.length > 0 ? `${lowMeds.length} low stock` : 'All stocked';
  els.refillStatusMeta.textContent =
    lowMeds.length > 0
      ? `${lowMeds.map((m) => `${m.name} (${m.stockCount})`).join(', ')} · ${curedCount} cured`
      : `${curedCount} cured course(s) archived`;
}

function renderTimeline(schedule) {
  if (schedule.length === 0) {
    els.timelineContainer.innerHTML = `
      <div class="empty-state">
        No fixed-time doses scheduled for today.<br />
        Click <strong>+ Add Medicine</strong>, try <strong>Load Demo</strong>, or paste instructions in the <strong>Gemini Smart Parser</strong>.
      </div>
    `;
    return;
  }

  els.timelineContainer.innerHTML = schedule
    .map((item) => {
      const { medicine: med, time, status, snoozeLabel } = item;
      const statusText =
        status === 'snoozed' && snoozeLabel ? `Snoozed until ${snoozeLabel}` : status.toUpperCase();

      return `
        <div class="dose-card ${status}" style="border-left-color: ${escapeHtml(med.color)}">
          <div class="dose-main">
            <div class="dose-time">${escapeHtml(time)}</div>
            <div>
              <div class="dose-title">${escapeHtml(med.name)}</div>
              <div class="dose-sub">
                ${med.dosage ? `<span>${escapeHtml(med.dosage)}</span>` : ''}
                ${med.condition ? `<span>· ${escapeHtml(med.condition)}</span>` : ''}
                <span class="pill-tag">${escapeHtml(med.mealInstruction)}</span>
                <span class="pill-tag ${status}">${escapeHtml(statusText)}</span>
              </div>
            </div>
          </div>
          <div class="dose-actions">
            ${
              status !== 'taken'
                ? `<button class="btn btn-success btn-sm" data-action="take" data-id="${escapeHtml(
                    med.id
                  )}" data-time="${escapeHtml(time)}">✓ Taken</button>`
                : ''
            }
            ${
              status !== 'taken' && status !== 'snoozed'
                ? `<button class="btn btn-outline btn-sm" data-action="snooze" data-id="${escapeHtml(
                    med.id
                  )}" data-time="${escapeHtml(time)}">Snooze</button>`
                : ''
            }
            ${
              status !== 'taken' && status !== 'skipped'
                ? `<button class="btn btn-ghost btn-sm" data-action="skip" data-id="${escapeHtml(
                    med.id
                  )}" data-time="${escapeHtml(time)}">Skip</button>`
                : ''
            }
          </div>
        </div>
      `;
    })
    .join('');
}

function renderCabinet() {
  const currentMeds = appState.medicines.filter((m) => m.courseStatus !== 'cured');
  const activeCount = currentMeds.filter((m) => m.active).length;
  els.cabinetCount.textContent = `${activeCount} active`;

  if (currentMeds.length === 0) {
    els.cabinetContainer.innerHTML = `
      <div class="empty-state">No active or paused medicines right now.</div>
    `;
    return;
  }

  els.cabinetContainer.innerHTML = currentMeds
    .map((med) => {
      const lowStock =
        typeof med.stockCount === 'number' && med.stockCount <= (med.lowStockThreshold ?? 5);
      const schedBadge =
        med.scheduleType === 'prn'
          ? '<span class="pill-tag">As Needed (PRN)</span>'
          : med.scheduleType === 'days'
          ? `<span class="pill-tag">${(med.daysOfWeek || []).map((d) => DAY_NAMES[d]).join(', ')}</span>`
          : '';
      const dateRange =
        med.startDate || med.endDate
          ? `<p class="med-notes">Course: ${escapeHtml(med.startDate || 'Start')} → ${escapeHtml(
              med.endDate || 'Ongoing'
            )}</p>`
          : '';

      return `
        <article class="med-card ${med.active ? '' : 'paused'}" style="border-top-color: ${escapeHtml(
          med.color
        )}">
          <div>
            <div class="med-card-top">
              <div>
                <h3>${escapeHtml(med.name)}</h3>
                <div class="med-dosage">${escapeHtml(med.dosage || 'Dosage not specified')} · ${escapeHtml(
        med.mealInstruction
      )}</div>
                ${med.condition ? `<div class="med-dosage">For: ${escapeHtml(med.condition)}</div>` : ''}
              </div>
              ${
                typeof med.stockCount === 'number'
                  ? `<span class="pill-tag ${lowStock ? 'low' : ''}">${med.stockCount} left</span>`
                  : ''
              }
            </div>
            <div class="med-times-row">
              ${schedBadge}
              ${(med.times || []).map((t) => `<span class="pill-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
            ${dateRange}
            ${med.notes ? `<p class="med-notes">${escapeHtml(med.notes)}</p>` : ''}
          </div>
          <div class="med-card-footer">
            <div>
              ${
                med.scheduleType === 'prn' && med.active
                  ? `<button class="btn btn-success btn-sm" data-med-action="take-prn" data-id="${escapeHtml(
                      med.id
                    )}">Take Dose</button>`
                  : ''
              }
              <button class="btn btn-outline btn-sm" data-med-action="cure" data-id="${escapeHtml(
                med.id
              )}">✓ Mark Cured</button>
              <button class="btn btn-outline btn-sm" data-med-action="refill" data-id="${escapeHtml(
                med.id
              )}">+ Refill</button>
              <button class="btn btn-ghost btn-sm" data-med-action="toggle" data-id="${escapeHtml(med.id)}">
                ${med.active ? 'Pause' : 'Resume'}
              </button>
            </div>
            <div>
              <button class="btn btn-outline btn-sm" data-med-action="edit" data-id="${escapeHtml(
                med.id
              )}">Edit</button>
              <button class="btn btn-danger-ghost btn-sm" data-med-action="delete" data-id="${escapeHtml(
                med.id
              )}">Delete</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderArchive() {
  const curedMeds = appState.medicines.filter((m) => m.courseStatus === 'cured');
  els.archiveCount.textContent = `${curedMeds.length} cured`;

  const q = (els.archiveSearchInput.value || '').trim().toLowerCase();
  const filtered = curedMeds.filter((m) => {
    if (!q) return true;
    return [m.name, m.dosage, m.condition, m.recoveryNotes, m.notes]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q));
  });

  if (filtered.length === 0) {
    els.archiveContainer.innerHTML = `<div class="empty-state">${
      curedMeds.length === 0
        ? 'No cured courses archived yet. Use "✓ Mark Cured" on any medication once treatment finishes.'
        : 'No archived courses match your search.'
    }</div>`;
    return;
  }

  els.archiveContainer.innerHTML = filtered
    .map((med) => {
      const takenForMed = appState.logs.filter(
        (l) => l.medicineId === med.id && l.status === 'taken'
      ).length;
      const curedDate = med.curedAt ? med.curedAt.slice(0, 10) : 'Recorded';

      return `
        <article class="med-card cured-card">
          <div>
            <div class="med-card-top">
              <div>
                <h3>${escapeHtml(med.name)}</h3>
                <div class="med-dosage">${escapeHtml(med.dosage || 'Dosage not specified')} · ${escapeHtml(
        med.mealInstruction
      )}</div>
                ${med.condition ? `<div class="med-dosage">Treated: ${escapeHtml(med.condition)}</div>` : ''}
              </div>
              <span class="pill-tag cured">CURED · ${escapeHtml(curedDate)}</span>
            </div>
            <p class="med-notes">
              Course: ${escapeHtml(med.startDate || med.createdAt?.slice(0, 10) || 'Start')} → ${escapeHtml(
        med.endDate || curedDate
      )} · ${takenForMed} dose(s) taken
            </p>
            ${med.recoveryNotes ? `<p class="med-notes"><strong>Recovery:</strong> ${escapeHtml(med.recoveryNotes)}</p>` : ''}
            ${med.notes ? `<p class="med-notes">${escapeHtml(med.notes)}</p>` : ''}
          </div>
          <div class="med-card-footer">
            <button class="btn btn-outline btn-sm" data-archive-action="restart" data-id="${escapeHtml(
              med.id
            )}">↺ Restart Course</button>
            <button class="btn btn-danger-ghost btn-sm" data-archive-action="delete" data-id="${escapeHtml(
              med.id
            )}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderHistory() {
  const q = (els.historySearchInput.value || '').trim().toLowerCase();
  const filtered = [...appState.logs]
    .reverse()
    .filter((log) => {
      if (!q) return true;
      return [log.medicineName, log.condition, log.date, log.status]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });

  els.historyCount.textContent = `${appState.logs.length} total`;

  if (filtered.length === 0) {
    els.historyContainer.innerHTML = `<div class="empty-state">${
      appState.logs.length === 0 ? 'No doses logged yet.' : 'No dose logs match your filter.'
    }</div>`;
    return;
  }

  els.historyContainer.innerHTML = filtered
    .slice(0, 50)
    .map((log) => {
      const when = `${log.date} ${log.scheduledTime}${log.isPrn ? ' (PRN)' : ''}`;
      return `
        <div class="history-row">
          <div>
            <strong>${escapeHtml(log.medicineName)}</strong>
            ${log.dosage ? `<span class="hint">(${escapeHtml(log.dosage)})</span>` : ''}
            ${log.condition ? `<span class="hint">· ${escapeHtml(log.condition)}</span>` : ''}
            <div class="hint">${escapeHtml(when)} · logged ${new Date(log.loggedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}</div>
          </div>
          <div class="dose-actions">
            <span class="pill-tag ${escapeHtml(log.status)}">${escapeHtml(log.status.toUpperCase())}</span>
            <button class="btn btn-ghost btn-sm" data-undo-log="${escapeHtml(log.id)}">Undo</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function updateEmergencyQuickDial() {
  const phone = (els.profEmergencyPhone.value || '').trim();
  if (phone) {
    els.emergencyQuickDialBtn.href = sanitizeTelHref(phone);
    els.emergencyQuickDialBtn.classList.remove('hidden');
  } else {
    els.emergencyQuickDialBtn.classList.add('hidden');
  }
}

function renderDoctorsList() {
  if (!appState.doctors || appState.doctors.length === 0) {
    els.doctorsListContainer.innerHTML = `
      <div class="empty-state">
        No doctors added yet.<br />Click <strong>+ Add Doctor</strong> to store physician numbers with Quick Dial.
      </div>
    `;
    return;
  }

  const sorted = [...appState.doctors].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  els.doctorsListContainer.innerHTML = sorted
    .map((doc) => {
      const telHref = sanitizeTelHref(doc.phone);
      return `
        <article class="doctor-card">
          <div class="doctor-card-top">
            <div>
              <h3>${escapeHtml(doc.name)}</h3>
              <div class="med-dosage">
                ${escapeHtml(doc.specialty || 'Physician')}${doc.clinic ? ` · ${escapeHtml(doc.clinic)}` : ''}
              </div>
            </div>
            ${doc.isPrimary ? '<span class="pill-tag due">PRIMARY</span>' : ''}
          </div>
          <div class="med-dosage">📞 <strong>${escapeHtml(doc.phone)}</strong>${doc.email ? ` · ✉️ ${escapeHtml(doc.email)}` : ''}</div>
          ${doc.notes ? `<p class="med-notes">${escapeHtml(doc.notes)}</p>` : ''}
          <div class="doctor-actions">
            <a class="btn btn-success btn-sm" href="${escapeHtml(telHref)}">📞 Quick Dial</a>
            <button type="button" class="btn btn-outline btn-sm" data-doc-action="copy" data-phone="${escapeHtml(
              doc.phone
            )}">Copy #</button>
            <button type="button" class="btn btn-outline btn-sm" data-doc-action="edit" data-id="${escapeHtml(
              doc.id
            )}">Edit</button>
            <button type="button" class="btn btn-danger-ghost btn-sm" data-doc-action="delete" data-id="${escapeHtml(
              doc.id
            )}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderProfilePage() {
  const user = appState.user || { name: 'Patient', email: '' };
  const p = appState.profile || {};
  const activeCount = appState.medicines.filter((m) => m.active && m.courseStatus !== 'cured').length;
  const curedCount = appState.medicines.filter((m) => m.courseStatus === 'cured').length;
  const takenTotal = appState.logs.filter((l) => l.status === 'taken').length;

  els.profileOverviewName.textContent = user.name;
  els.profileOverviewMeta.textContent = `${user.email}${
    user.createdAt ? ` · Member since ${user.createdAt.slice(0, 10)}` : ''
  }`;

  els.profileSummaryGrid.innerHTML = `
    <div class="profile-metric">
      <span>Active Medications</span>
      <strong>${activeCount}</strong>
    </div>
    <div class="profile-metric">
      <span>Cured Courses Archived</span>
      <strong>${curedCount}</strong>
    </div>
    <div class="profile-metric">
      <span>Lifetime Doses Taken</span>
      <strong>${takenTotal}</strong>
    </div>
    <div class="profile-metric">
      <span>Blood Type / Allergies</span>
      <strong>${escapeHtml(p.bloodType || 'Not set')}${p.allergies ? ` · ${escapeHtml(p.allergies)}` : ''}</strong>
    </div>
  `;

  els.profName.value = user.name || '';
  els.profDob.value = p.dob || '';
  els.profBloodType.value = p.bloodType || '';
  els.profAllergies.value = p.allergies || '';
  els.profConditions.value = p.medicalConditions || '';
  els.profEmergencyName.value = p.emergencyContactName || '';
  els.profEmergencyRelation.value = p.emergencyContactRelation || '';
  els.profEmergencyPhone.value = p.emergencyContactPhone || '';
  updateEmergencyQuickDial();
  renderDoctorsList();
}

function evaluateDueAlerts(schedule) {
  const dueItems = schedule.filter((item) => item.status === 'due');
  const dueItem = dueItems[0] || null;
  appState.activeDueDose = dueItem;

  if (appState.user) {
    document.title =
      dueItems.length > 0
        ? `(${dueItems.length}) Dose Due — DoseMind AI`
        : 'DoseMind AI — Smart Medicine Reminder';
  }

  if (!dueItem) {
    els.dueAlertBanner.classList.add('hidden');
    return;
  }

  els.dueAlertBanner.classList.remove('hidden');
  els.dueAlertTitle.textContent = `Dose Due: ${dueItem.medicine.name} (${dueItem.time})`;
  els.dueAlertSubtitle.textContent = `${dueItem.medicine.dosage || 'Scheduled dose'} · ${
    dueItem.medicine.mealInstruction
  }`;

  const notifKey = `${todayDateStr()}_${dueItem.medicine.id}_${dueItem.time}`;
  if (!appState.notifiedKeys.has(notifKey)) {
    appState.notifiedKeys.add(notifKey);
    playChime();
    sendDesktopNotification(
      `Time for ${dueItem.medicine.name}`,
      `${dueItem.medicine.dosage || 'Scheduled dose'} (${dueItem.medicine.mealInstruction}) at ${
        dueItem.time
      }`
    );
  }
}

function renderAll() {
  els.todayDateLabel.textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  applyThemeAndAccessibility();
  const schedule = getTodaySchedule();
  renderStats(schedule);
  renderTimeline(schedule);
  renderCabinet();
  renderArchive();
  renderHistory();
  if (appState.activePage === 'profile') {
    renderProfilePage();
  }
  evaluateDueAlerts(schedule);
  updateApiKeyBadge();
}

async function logDose(medicineId, scheduledTime, status, isPrn = false) {
  const snoozeMinutes = appState.settings.defaultSnoozeMinutes || 10;
  const snoozeUntil =
    status === 'snoozed' ? new Date(Date.now() + snoozeMinutes * 60000).toISOString() : null;

  const data = await apiFetch('/api/doses/log', {
    method: 'POST',
    body: JSON.stringify({
      medicineId,
      scheduledTime,
      date: todayDateStr(),
      status,
      snoozeUntil,
      isPrn,
    }),
  });
  applyServerState(data.state);
  renderAll();
  showToast(
    status === 'taken'
      ? 'Dose marked as taken!'
      : status === 'snoozed'
      ? `Snoozed for ${snoozeMinutes} minutes.`
      : 'Dose skipped.'
  );
}

function applyServerState(state) {
  appState.medicines = state.medicines || [];
  appState.logs = state.logs || [];
  appState.doctors = state.doctors || [];
  appState.profile = { ...appState.profile, ...(state.profile || {}) };
  appState.settings = { ...appState.settings, ...(state.settings || {}) };
}

function updateScheduleTypeFields() {
  const type = els.medScheduleType.value;
  els.daysOfWeekField.classList.toggle('hidden', type !== 'days');
  els.reminderTimesField.classList.toggle('hidden', type === 'prn');
}

function renderFormTimes() {
  els.timesChipList.innerHTML = appState.formTimes
    .map(
      (t) => `
      <span class="time-chip">
        ${escapeHtml(t)}
        <button type="button" data-remove-time="${escapeHtml(t)}" aria-label="Remove ${escapeHtml(
        t
      )}">×</button>
      </span>
    `
    )
    .join('');
}

function openMedicineModal(med = null) {
  if (med) {
    els.medicineModalTitle.textContent = 'Edit Medicine';
    els.medId.value = med.id;
    els.medName.value = med.name;
    els.medDosage.value = med.dosage || '';
    els.medCondition.value = med.condition || '';
    els.medScheduleType.value = med.scheduleType || 'daily';
    els.medMeal.value = med.mealInstruction || 'Any time';
    els.medStartDate.value = med.startDate || '';
    els.medEndDate.value = med.endDate || '';
    els.medColor.value = med.color || '#0ea5e9';
    els.medStock.value = typeof med.stockCount === 'number' ? med.stockCount : '';
    els.medThreshold.value = med.lowStockThreshold ?? 5;
    els.medNotes.value = med.notes || '';
    appState.formTimes = med.times?.length ? [...med.times] : ['08:00'];
    const days = new Set(med.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]);
    els.daysOfWeekGroup.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = days.has(Number(cb.value));
    });
  } else {
    els.medicineModalTitle.textContent = 'Add Medicine';
    els.medicineForm.reset();
    els.medId.value = '';
    els.medScheduleType.value = 'daily';
    els.medThreshold.value = 5;
    appState.formTimes = ['08:00'];
    els.daysOfWeekGroup.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = true;
    });
  }
  updateScheduleTypeFields();
  renderFormTimes();
  els.medicineModal.showModal();
}

function openDoctorModal(doc = null) {
  if (doc) {
    els.doctorModalTitle.textContent = 'Edit Doctor / Physician';
    els.docId.value = doc.id;
    els.docName.value = doc.name;
    els.docSpecialty.value = doc.specialty || '';
    els.docPhone.value = doc.phone || '';
    els.docClinic.value = doc.clinic || '';
    els.docEmail.value = doc.email || '';
    els.docNotes.value = doc.notes || '';
    els.docPrimary.checked = Boolean(doc.isPrimary);
  } else {
    els.doctorModalTitle.textContent = 'Add Doctor / Physician';
    els.doctorForm.reset();
    els.docId.value = '';
    els.docPrimary.checked = appState.doctors.length === 0;
  }
  els.doctorModal.showModal();
}

function syncModelSelectionUI(modelId) {
  const known = [...els.geminiModelSelect.options].some(
    (opt) => opt.value !== 'custom' && opt.value === modelId
  );
  if (known) {
    els.geminiModelSelect.value = modelId;
    els.customModelInput.value = '';
  } else {
    els.geminiModelSelect.value = 'custom';
    els.customModelInput.value = modelId;
  }
}

function openSettingsModal() {
  els.geminiApiKeyInput.value = getLocalApiKey();
  syncModelSelectionUI(appState.settings.model || 'gemini-3.8-flash');
  els.caregiverNameInput.value = appState.settings.caregiverName || '';
  els.caregiverContactInput.value = appState.settings.caregiverContact || '';
  els.snoozeMinutesInput.value = appState.settings.defaultSnoozeMinutes || 10;
  els.soundEnabledInput.checked = Boolean(appState.settings.soundEnabled);
  els.notificationsEnabledInput.checked = Boolean(appState.settings.notificationsEnabled);
  els.verifyKeyResult.className = 'hint';
  els.verifyKeyResult.textContent =
    'Google AI Studio uses AQ... Authorization Keys or AIza... keys restricted to the Generative Language API.';

  if (appState.hasServerApiKey) {
    els.serverKeyNotice.textContent =
      'A server-side GEMINI_API_KEY was detected in .env. Requests use the x-goog-api-key header.';
  } else {
    els.serverKeyNotice.textContent =
      'Enter your Gemini API key below (saved in localStorage and sent via x-goog-api-key header) or set GEMINI_API_KEY in .env.';
  }

  updateNotificationStatusText();
  els.settingsModal.showModal();
}

function updateNotificationStatusText() {
  if (!('Notification' in window)) {
    els.notifPermStatus.textContent = 'Notifications API not supported in this browser.';
    return;
  }
  els.notifPermStatus.textContent = `Browser permission: ${Notification.permission}`;
}

function appendChatMessage(role, text) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  els.chatMessages.appendChild(div);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function exportAdherenceReport() {
  const p = appState.profile || {};
  const lines = [
    ['DoseMind AI Lifelong Medication & Patient Report'],
    ['Patient Name', appState.user ? `${appState.user.name} (${appState.user.email})` : ''],
    ['DOB', p.dob || 'Not set'],
    ['Blood Type', p.bloodType || 'Not set'],
    ['Allergies', p.allergies || 'None recorded'],
    ['Conditions', p.medicalConditions || 'None recorded'],
    ['Generated At', new Date().toISOString()],
    ['Caregiver', appState.settings.caregiverName || 'Not set'],
    ['Caregiver Contact', appState.settings.caregiverContact || 'Not set'],
    [],
    ['DOCTORS & PHYSICIANS'],
    ['Name', 'Specialty', 'Clinic', 'Phone', 'Email', 'Primary'],
  ];

  for (const doc of appState.doctors) {
    lines.push([doc.name, doc.specialty || '', doc.clinic || '', doc.phone, doc.email || '', doc.isPrimary ? 'Yes' : 'No']);
  }

  lines.push([]);
  lines.push(['MEDICATION COURSES (ACTIVE & CURED ARCHIVE)']);
  lines.push(['Name', 'Dosage', 'Purpose/Condition', 'Status', 'Start Date', 'End/Cured Date', 'Recovery Notes']);

  for (const med of appState.medicines) {
    lines.push([
      med.name,
      med.dosage || '',
      med.condition || '',
      med.courseStatus || (med.active ? 'active' : 'paused'),
      med.startDate || '',
      med.curedAt ? med.curedAt.slice(0, 10) : med.endDate || '',
      med.recoveryNotes || med.notes || '',
    ]);
  }

  lines.push([]);
  lines.push(['DOSE HISTORY LOG']);
  lines.push(['Date', 'Time', 'Medicine', 'Dosage', 'Condition', 'Status', 'PRN', 'Logged At']);

  for (const log of appState.logs) {
    lines.push([
      log.date,
      log.scheduledTime,
      log.medicineName,
      log.dosage || '',
      log.condition || '',
      log.status,
      log.isPrn ? 'Yes' : 'No',
      log.loggedAt,
    ]);
  }

  const csv = lines
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dosemind-medical-history-${todayDateStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Full patient & medication CSV report downloaded.');
}

// Navigation Events
els.navDashboardBtn.addEventListener('click', () => switchAppPage('dashboard'));
els.navProfileBtn.addEventListener('click', () => switchAppPage('profile'));
els.userBadge.addEventListener('click', () => switchAppPage('profile'));

// Auth Event Listeners
els.showLoginTab.addEventListener('click', () => switchAuthTab('login'));
els.showRegisterTab.addEventListener('click', () => switchAuthTab('register'));

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.authError.classList.add('hidden');
  els.loginSubmitBtn.disabled = true;
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: els.loginEmail.value.trim(),
        password: els.loginPassword.value,
      }),
    });
    applyServerState(data.state);
    appState.activePage = 'dashboard';
    showAppView(data.user);
    renderAll();
    showToast(`Welcome back, ${data.user.name}!`);
  } catch (err) {
    els.authError.textContent = err.message;
    els.authError.classList.remove('hidden');
  } finally {
    els.loginSubmitBtn.disabled = false;
  }
});

els.registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.authError.classList.add('hidden');
  els.registerSubmitBtn.disabled = true;
  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: els.regName.value.trim(),
        email: els.regEmail.value.trim(),
        password: els.regPassword.value,
        importLegacy: Boolean(els.importLegacyInput.checked),
      }),
    });
    applyServerState(data.state);
    appState.activePage = 'dashboard';
    showAppView(data.user);
    renderAll();
    showToast(`Account created for ${data.user.name}!`);
  } catch (err) {
    els.authError.textContent = err.message;
    els.authError.classList.remove('hidden');
  } finally {
    els.registerSubmitBtn.disabled = false;
  }
});

els.logoutBtn.addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' });
  } catch {
    // Ignore
  }
  showAuthView();
  els.loginForm.reset();
  els.registerForm.reset();
});

// Profile & Doctors Events
els.profEmergencyPhone.addEventListener('input', updateEmergencyQuickDial);

els.profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await apiFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: els.profName.value.trim(),
        dob: els.profDob.value,
        bloodType: els.profBloodType.value,
        allergies: els.profAllergies.value.trim(),
        medicalConditions: els.profConditions.value.trim(),
        emergencyContactName: els.profEmergencyName.value.trim(),
        emergencyContactRelation: els.profEmergencyRelation.value.trim(),
        emergencyContactPhone: els.profEmergencyPhone.value.trim(),
      }),
    });
    if (data.user) {
      appState.user = data.user;
      els.userBadge.textContent = `👤 ${data.user.name}`;
    }
    applyServerState(data.state);
    renderProfilePage();
    showToast('Patient profile saved.');
  } catch (err) {
    showToast(err.message, true);
  }
});

els.openAddDoctorBtn.addEventListener('click', () => openDoctorModal());

els.doctorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = els.docId.value;
  const payload = {
    name: els.docName.value.trim(),
    specialty: els.docSpecialty.value.trim(),
    phone: els.docPhone.value.trim(),
    clinic: els.docClinic.value.trim(),
    email: els.docEmail.value.trim(),
    notes: els.docNotes.value.trim(),
    isPrimary: els.docPrimary.checked,
  };

  try {
    const data = id
      ? await apiFetch(`/api/doctors/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await apiFetch('/api/doctors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
    applyServerState(data.state);
    els.doctorModal.close();
    renderDoctorsList();
    showToast(id ? 'Doctor updated.' : 'Doctor added to directory.');
  } catch (err) {
    showToast(err.message, true);
  }
});

els.doctorsListContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-doc-action]');
  if (!btn) return;
  const { docAction, id, phone } = btn.dataset;

  if (docAction === 'copy') {
    try {
      await navigator.clipboard.writeText(phone);
      showToast(`Copied ${phone}`);
    } catch {
      showToast(`Phone: ${phone}`);
    }
    return;
  }

  const doc = appState.doctors.find((d) => d.id === id);
  if (!doc) return;

  try {
    if (docAction === 'edit') {
      openDoctorModal(doc);
    } else if (docAction === 'delete') {
      const data = await apiFetch(`/api/doctors/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      applyServerState(data.state);
      renderDoctorsList();
      showToast(`Removed ${doc.name}.`);
    }
  } catch (err) {
    showToast(err.message, true);
  }
});

els.openDeleteAccountBtn.addEventListener('click', () => {
  els.deleteAccountForm.reset();
  els.deleteAccountModal.showModal();
});

els.deleteAccountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await apiFetch('/api/auth/delete-account', {
      method: 'POST',
      body: JSON.stringify({ password: els.deleteConfirmPassword.value }),
    });
    els.deleteAccountModal.close();
    appState.medicines = [];
    appState.logs = [];
    appState.doctors = [];
    showAuthView();
    switchAuthTab('register');
    showToast('Your account and all associated medical records were permanently deleted.');
  } catch (err) {
    showToast(err.message, true);
  }
});

// Dashboard & Medicine Event Listeners
els.timelineContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id, time } = btn.dataset;
  try {
    const status = action === 'take' ? 'taken' : action === 'snooze' ? 'snoozed' : 'skipped';
    await logDose(id, time, status);
  } catch (err) {
    showToast(err.message, true);
  }
});

els.cabinetContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-med-action]');
  if (!btn) return;
  const { medAction, id } = btn.dataset;
  const med = appState.medicines.find((m) => m.id === id);
  if (!med) return;

  try {
    if (medAction === 'edit') {
      openMedicineModal(med);
    } else if (medAction === 'take-prn') {
      const nowTime = new Date().toTimeString().slice(0, 5);
      await logDose(id, nowTime, 'taken', true);
    } else if (medAction === 'cure') {
      const recoveryNotes = prompt(
        `Mark "${med.name}" as cured / completed?\nOptional recovery note for your permanent archive:`,
        'Course completed; symptoms resolved.'
      );
      if (recoveryNotes === null) return;
      const data = await apiFetch(`/api/medicines/${encodeURIComponent(id)}/cure`, {
        method: 'POST',
        body: JSON.stringify({ recoveryNotes }),
      });
      applyServerState(data.state);
      renderAll();
      showToast(`${med.name} archived in your Cured & Completed History.`);
    } else if (medAction === 'refill') {
      const raw = prompt(`Add pills to ${med.name} stock:`, '30');
      if (raw === null) return;
      const amount = Math.floor(Number(raw));
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Enter a positive refill number.', true);
        return;
      }
      const data = await apiFetch(`/api/medicines/${encodeURIComponent(id)}/refill`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      applyServerState(data.state);
      renderAll();
      showToast(`Added ${amount} pills to ${med.name}.`);
    } else if (medAction === 'toggle') {
      const data = await apiFetch(`/api/medicines/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ courseStatus: med.active ? 'paused' : 'active', active: !med.active }),
      });
      applyServerState(data.state);
      renderAll();
      showToast(med.active ? `${med.name} paused.` : `${med.name} resumed.`);
    } else if (medAction === 'delete') {
      const data = await apiFetch(`/api/medicines/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      applyServerState(data.state);
      renderAll();
      showToast(`Deleted ${med.name}.`);
    }
  } catch (err) {
    showToast(err.message, true);
  }
});

els.archiveContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-archive-action]');
  if (!btn) return;
  const { archiveAction, id } = btn.dataset;
  const med = appState.medicines.find((m) => m.id === id);
  if (!med) return;

  try {
    if (archiveAction === 'restart') {
      const data = await apiFetch(`/api/medicines/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          courseStatus: 'active',
          active: true,
          startDate: todayDateStr(),
          endDate: '',
        }),
      });
      applyServerState(data.state);
      renderAll();
      showToast(`Restarted ${med.name} in your active schedule.`);
    } else if (archiveAction === 'delete') {
      const data = await apiFetch(`/api/medicines/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      applyServerState(data.state);
      renderAll();
      showToast(`Removed ${med.name} from archive.`);
    }
  } catch (err) {
    showToast(err.message, true);
  }
});

els.archiveSearchInput.addEventListener('input', renderArchive);
els.historySearchInput.addEventListener('input', renderHistory);

els.historyContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-undo-log]');
  if (!btn) return;
  try {
    const data = await apiFetch(`/api/doses/log/${encodeURIComponent(btn.dataset.undoLog)}`, {
      method: 'DELETE',
    });
    applyServerState(data.state);
    renderAll();
    showToast('Log removed and pill stock adjusted.');
  } catch (err) {
    showToast(err.message, true);
  }
});

els.alertTakeBtn.addEventListener('click', () => {
  if (appState.activeDueDose) {
    logDose(appState.activeDueDose.medicine.id, appState.activeDueDose.time, 'taken').catch((e) =>
      showToast(e.message, true)
    );
  }
});

els.alertSnoozeBtn.addEventListener('click', () => {
  if (appState.activeDueDose) {
    logDose(appState.activeDueDose.medicine.id, appState.activeDueDose.time, 'snoozed').catch((e) =>
      showToast(e.message, true)
    );
  }
});

els.alertSkipBtn.addEventListener('click', () => {
  if (appState.activeDueDose) {
    logDose(appState.activeDueDose.medicine.id, appState.activeDueDose.time, 'skipped').catch((e) =>
      showToast(e.message, true)
    );
  }
});

els.openAddMedBtn.addEventListener('click', () => openMedicineModal());
els.apiKeyStatusBtn.addEventListener('click', () => openSettingsModal());
els.exportReportBtn.addEventListener('click', exportAdherenceReport);
els.medScheduleType.addEventListener('change', updateScheduleTypeFields);

els.darkModeBtn.addEventListener('click', async () => {
  try {
    const data = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ darkMode: !appState.settings.darkMode }),
    });
    applyServerState(data.state);
    applyThemeAndAccessibility();
  } catch (err) {
    showToast(err.message, true);
  }
});

els.largeTextBtn.addEventListener('click', async () => {
  try {
    const data = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ largeText: !appState.settings.largeText }),
    });
    applyServerState(data.state);
    applyThemeAndAccessibility();
  } catch (err) {
    showToast(err.message, true);
  }
});

els.testAlarmBtn.addEventListener('click', async () => {
  playChime();
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  sendDesktopNotification('DoseMind AI Test Alert', 'Audio chime & desktop reminders are working!');
  showToast('Test chime triggered!');
});

els.loadSampleBtn.addEventListener('click', async () => {
  try {
    const data = await apiFetch('/api/sample-data', { method: 'POST', body: '{}' });
    applyServerState(data.state);
    renderAll();
    showToast(`Added ${data.added} demo medicines (plus sample doctor in Profile).`);
  } catch (err) {
    showToast(err.message, true);
  }
});

els.addTimeBtn.addEventListener('click', () => {
  const val = els.newTimeInput.value;
  if (!val) return;
  if (!appState.formTimes.includes(val)) {
    appState.formTimes = [...appState.formTimes, val].sort();
    renderFormTimes();
  }
});

els.timesChipList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-remove-time]');
  if (!btn) return;
  if (appState.formTimes.length <= 1) {
    showToast('At least one reminder time is required.', true);
    return;
  }
  appState.formTimes = appState.formTimes.filter((t) => t !== btn.dataset.removeTime);
  renderFormTimes();
});

els.medicineForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = els.medId.value;
  const scheduleType = els.medScheduleType.value;
  const daysOfWeek = [...els.daysOfWeekGroup.querySelectorAll('input:checked')].map((cb) =>
    Number(cb.value)
  );

  const payload = {
    name: els.medName.value.trim(),
    dosage: els.medDosage.value.trim(),
    condition: els.medCondition.value.trim(),
    scheduleType,
    daysOfWeek,
    startDate: els.medStartDate.value,
    endDate: els.medEndDate.value,
    mealInstruction: els.medMeal.value,
    color: els.medColor.value,
    stockCount: els.medStock.value === '' ? null : Number(els.medStock.value),
    lowStockThreshold: Number(els.medThreshold.value || 5),
    times: scheduleType === 'prn' ? [] : appState.formTimes,
    notes: els.medNotes.value.trim(),
  };

  try {
    const data = id
      ? await apiFetch(`/api/medicines/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await apiFetch('/api/medicines', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
    applyServerState(data.state);
    els.medicineModal.close();
    renderAll();
    showToast(id ? 'Medicine updated.' : 'Medicine added to schedule.');
  } catch (err) {
    showToast(err.message, true);
  }
});

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.closeModal).close();
  });
});

els.toggleKeyVisibility.addEventListener('click', () => {
  const isPwd = els.geminiApiKeyInput.type === 'password';
  els.geminiApiKeyInput.type = isPwd ? 'text' : 'password';
  els.toggleKeyVisibility.textContent = isPwd ? 'Hide' : 'Show';
});

els.verifyKeyBtn.addEventListener('click', async () => {
  const enteredKey = els.geminiApiKeyInput.value.trim();
  els.verifyKeyBtn.disabled = true;
  els.verifyKeyBtn.textContent = 'Checking...';
  els.verifyKeyResult.className = 'hint';
  els.verifyKeyResult.textContent = 'Testing key against Gemini API...';

  try {
    const data = await apiFetch('/api/gemini/verify', {
      method: 'POST',
      body: JSON.stringify({ apiKey: enteredKey }),
    });
    const models = data.models || [];
    if (models.length > 0) {
      const currentVal =
        els.geminiModelSelect.value === 'custom'
          ? els.customModelInput.value.trim()
          : els.geminiModelSelect.value;
      els.geminiModelSelect.innerHTML = '';
      models.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.id}`;
        els.geminiModelSelect.appendChild(opt);
      });
      const customOpt = document.createElement('option');
      customOpt.value = 'custom';
      customOpt.textContent = 'Custom Model ID...';
      els.geminiModelSelect.appendChild(customOpt);
      syncModelSelectionUI(currentVal || models[0].id);
    }
    els.verifyKeyResult.className = 'hint success';
    els.verifyKeyResult.textContent = `✓ Verified (${data.keyFormat}) — ${models.length} Gemini model(s) available.`;
  } catch (err) {
    els.verifyKeyResult.className = 'hint error';
    els.verifyKeyResult.textContent = `✕ ${err.message}`;
  } finally {
    els.verifyKeyBtn.disabled = false;
    els.verifyKeyBtn.textContent = 'Verify Key';
  }
});

els.requestNotifBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported here.', true);
    return;
  }
  await Notification.requestPermission();
  updateNotificationStatusText();
});

els.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const enteredKey = els.geminiApiKeyInput.value.trim();
  if (enteredKey) {
    localStorage.setItem(API_KEY_STORAGE, enteredKey);
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }

  const chosenModel =
    els.geminiModelSelect.value === 'custom'
      ? els.customModelInput.value.trim() || 'gemini-3.8-flash'
      : els.geminiModelSelect.value;

  try {
    const data = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        model: chosenModel,
        caregiverName: els.caregiverNameInput.value.trim(),
        caregiverContact: els.caregiverContactInput.value.trim(),
        defaultSnoozeMinutes: Number(els.snoozeMinutesInput.value) || 10,
        soundEnabled: els.soundEnabledInput.checked,
        notificationsEnabled: els.notificationsEnabledInput.checked,
      }),
    });
    applyServerState(data.state);
    els.settingsModal.close();
    renderAll();
    showToast('Settings saved.');
  } catch (err) {
    showToast(err.message, true);
  }
});

els.checkInteractionsBtn.addEventListener('click', async () => {
  els.checkInteractionsBtn.disabled = true;
  els.checkInteractionsBtn.textContent = 'Checking...';
  appendChatMessage('user', 'Run drug & timing interaction check on my active medications.');

  try {
    const data = await apiFetch('/api/gemini/interactions', {
      method: 'POST',
      body: JSON.stringify({ model: appState.settings.model }),
    });
    appendChatMessage('assistant', data.report);
  } catch (err) {
    appendChatMessage('assistant', `Error: ${err.message}`);
    if (/API key/i.test(err.message)) openSettingsModal();
  } finally {
    els.checkInteractionsBtn.disabled = false;
    els.checkInteractionsBtn.textContent = '🛡️ Check Interactions';
  }
});

els.parseImageInput.addEventListener('change', () => {
  const file = els.parseImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    const commaIdx = dataUrl.indexOf(',');
    appState.attachedImage = {
      base64: dataUrl.slice(commaIdx + 1),
      mimeType: file.type || 'image/jpeg',
      name: file.name,
    };
    els.parseImageName.textContent = file.name;
    els.parseImagePreview.src = dataUrl;
    els.imagePreviewWrap.classList.remove('hidden');
    els.clearImageBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

els.clearImageBtn.addEventListener('click', () => {
  appState.attachedImage = null;
  els.parseImageInput.value = '';
  els.parseImageName.textContent = 'No image attached';
  els.imagePreviewWrap.classList.add('hidden');
  els.clearImageBtn.classList.add('hidden');
});

els.geminiParseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = els.parseInputText.value.trim();
  if (!text && !appState.attachedImage) {
    showToast('Enter prescription text or attach an image first.', true);
    return;
  }

  els.parseSubmitBtn.disabled = true;
  els.parseSubmitBtn.textContent = 'Analyzing with Gemini...';

  try {
    const data = await apiFetch('/api/gemini/parse', {
      method: 'POST',
      body: JSON.stringify({
        text,
        imageBase64: appState.attachedImage?.base64 || '',
        imageMimeType: appState.attachedImage?.mimeType || '',
        model: appState.settings.model,
      }),
    });

    appState.parsedMedicines = data.medicines || [];
    els.parsedSummary.textContent = data.summary || `Found ${appState.parsedMedicines.length} item(s)`;
    els.parsedList.innerHTML = appState.parsedMedicines.length
      ? appState.parsedMedicines
          .map(
            (m, i) => `
          <div class="parsed-item">
            <div>
              <strong>${escapeHtml(m.name)}</strong> ${escapeHtml(m.dosage)}<br />
              <span class="hint">${
                m.scheduleType === 'prn' ? 'As Needed (PRN)' : escapeHtml(m.times.join(', '))
              } · ${escapeHtml(m.mealInstruction)}</span>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-add-parsed="${i}">Add</button>
          </div>
        `
          )
          .join('')
      : '<p class="hint">No medicines could be identified. Try adding clearer details.</p>';

    els.parsedResultsWrap.classList.remove('hidden');
  } catch (err) {
    showToast(err.message, true);
    if (/API key/i.test(err.message)) openSettingsModal();
  } finally {
    els.parseSubmitBtn.disabled = false;
    els.parseSubmitBtn.textContent = 'Extract Schedule with Gemini';
  }
});

els.parsedList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-add-parsed]');
  if (!btn) return;
  const idx = Number(btn.dataset.addParsed);
  const item = appState.parsedMedicines[idx];
  if (!item) return;

  try {
    const data = await apiFetch('/api/medicines', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    applyServerState(data.state);
    renderAll();
    btn.disabled = true;
    btn.textContent = 'Added ✓';
    showToast(`Added ${item.name}.`);
  } catch (err) {
    showToast(err.message, true);
  }
});

els.addAllParsedBtn.addEventListener('click', async () => {
  if (!appState.parsedMedicines.length) return;
  const palette = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  try {
    let latestState = null;
    for (let i = 0; i < appState.parsedMedicines.length; i++) {
      const item = { ...appState.parsedMedicines[i], color: palette[i % palette.length] };
      const data = await apiFetch('/api/medicines', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      latestState = data.state;
    }
    if (latestState) applyServerState(latestState);
    els.parsedResultsWrap.classList.add('hidden');
    els.parseInputText.value = '';
    renderAll();
    showToast(`Added ${appState.parsedMedicines.length} medicine(s) to your schedule!`);
    appState.parsedMedicines = [];
  } catch (err) {
    showToast(err.message, true);
  }
});

document.querySelectorAll('.chip[data-question]').forEach((chip) => {
  chip.addEventListener('click', () => {
    els.chatInput.value = chip.dataset.question;
    els.geminiChatForm.requestSubmit();
  });
});

els.geminiChatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = els.chatInput.value.trim();
  if (!question) return;

  appendChatMessage('user', question);
  els.chatInput.value = '';
  els.chatSubmitBtn.disabled = true;

  try {
    const data = await apiFetch('/api/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({
        question,
        model: appState.settings.model,
      }),
    });
    appendChatMessage('assistant', data.answer);
  } catch (err) {
    appendChatMessage('assistant', `Error: ${err.message}`);
    if (/API key/i.test(err.message)) openSettingsModal();
  } finally {
    els.chatSubmitBtn.disabled = false;
  }
});

function updateClock() {
  els.liveClock.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function init() {
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(() => {
    if (!appState.user) return;
    const schedule = getTodaySchedule();
    renderStats(schedule);
    evaluateDueAlerts(schedule);
  }, 15000);

  try {
    const [health, auth] = await Promise.all([apiFetch('/api/health'), apiFetch('/api/auth/me')]);
    appState.hasServerApiKey = Boolean(health.hasServerApiKey);
    els.importLegacyWrap.classList.toggle('hidden', !auth.hasLegacyData);
    if (!health.hasUsers) {
      switchAuthTab('register');
    }

    if (auth.authenticated && auth.user) {
      const state = await apiFetch('/api/state');
      applyServerState(state);
      showAppView(auth.user);
      renderAll();
    } else {
      showAuthView();
    }
  } catch (err) {
    showToast(`Failed to initialize: ${err.message}`, true);
  }
}

init();

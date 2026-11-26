const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_MODEL = 'gemini-3.8-flash';
const SESSION_COOKIE = 'dosemind_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

function defaultProfile() {
  return {
    dob: '',
    bloodType: '',
    allergies: '',
    medicalConditions: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
  };
}

function defaultStore() {
  return {
    medicines: [],
    logs: [],
    doctors: [],
    profile: defaultProfile(),
    settings: {
      defaultSnoozeMinutes: 10,
      soundEnabled: true,
      notificationsEnabled: true,
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      caregiverName: '',
      caregiverContact: '',
      darkMode: false,
      largeText: false,
    },
  };
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function createAuthStore(dataDir) {
  const usersFile = path.join(dataDir, 'users.json');
  const sessionsFile = path.join(dataDir, 'sessions.json');
  const userStoresDir = path.join(dataDir, 'users');
  const legacyStoreFile = path.join(dataDir, 'store.json');

  if (!fs.existsSync(userStoresDir)) {
    fs.mkdirSync(userStoresDir, { recursive: true });
  }

  function readUsers() {
    const parsed = readJsonSafe(usersFile, { users: [] });
    return Array.isArray(parsed.users) ? parsed.users : [];
  }

  function writeUsers(users) {
    writeJsonAtomic(usersFile, { users });
  }

  function readSessions() {
    const parsed = readJsonSafe(sessionsFile, { sessions: {} });
    return parsed && typeof parsed.sessions === 'object' && parsed.sessions ? parsed.sessions : {};
  }

  function writeSessions(sessions) {
    writeJsonAtomic(sessionsFile, { sessions });
  }

  function hasLegacyData() {
    if (!fs.existsSync(legacyStoreFile)) return false;
    const legacy = readJsonSafe(legacyStoreFile, null);
    return Boolean(
      legacy &&
        ((Array.isArray(legacy.medicines) && legacy.medicines.length > 0) ||
          (Array.isArray(legacy.logs) && legacy.logs.length > 0))
    );
  }

  function userStorePath(userId) {
    const safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(userStoresDir, `${safeId}.json`);
  }

  function readUserState(userId) {
    const filePath = userStorePath(userId);
    const parsed = readJsonSafe(filePath, defaultStore());
    return {
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      doctors: Array.isArray(parsed.doctors) ? parsed.doctors : [],
      profile: { ...defaultProfile(), ...(parsed.profile || {}) },
      settings: { ...defaultStore().settings, ...(parsed.settings || {}) },
    };
  }

  function writeUserState(userId, state) {
    writeJsonAtomic(userStorePath(userId), state);
  }

  function sanitizeUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  function registerUser({ name, email, password, importLegacy = false }) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanName) return { error: 'Full name is required.' };
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { error: 'A valid email address is required.' };
    }
    if (typeof password !== 'string' || password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    const users = readUsers();
    if (users.some((u) => u.email === cleanEmail)) {
      return { error: 'An account with this email already exists.' };
    }

    const { salt, hash } = hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeUsers(users);

    let initialState = defaultStore();
    if (importLegacy && hasLegacyData()) {
      const legacy = readJsonSafe(legacyStoreFile, defaultStore());
      initialState = {
        ...defaultStore(),
        medicines: Array.isArray(legacy.medicines) ? legacy.medicines : [],
        logs: Array.isArray(legacy.logs) ? legacy.logs : [],
        doctors: Array.isArray(legacy.doctors) ? legacy.doctors : [],
        profile: { ...defaultProfile(), ...(legacy.profile || {}) },
        settings: { ...defaultStore().settings, ...(legacy.settings || {}) },
      };
      try {
        fs.renameSync(legacyStoreFile, `${legacyStoreFile}.imported-${Date.now()}`);
      } catch {
        // Keep going if rename fails
      }
    }
    writeUserState(user.id, initialState);

    return { user: sanitizeUser(user) };
  }

  function authenticateUser({ email, password }) {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail || typeof password !== 'string') {
      return { error: 'Email and password are required.' };
    }
    const users = readUsers();
    const user = users.find((u) => u.email === cleanEmail);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return { error: 'Invalid email or password.' };
    }
    return { user: sanitizeUser(user) };
  }

  function updateUserName(userId, name) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName) return null;
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    users[idx].name = cleanName;
    writeUsers(users);
    return sanitizeUser(users[idx]);
  }

  function deleteUserAccount(userId, password) {
    if (typeof password !== 'string' || !password) {
      return { error: 'Current password is required to delete your account.' };
    }
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      return { error: 'Account not found.' };
    }
    const user = users[idx];
    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return { error: 'Incorrect password. Account was not deleted.' };
    }

    users.splice(idx, 1);
    writeUsers(users);

    const sessions = readSessions();
    for (const [token, sess] of Object.entries(sessions)) {
      if (sess && sess.userId === userId) {
        delete sessions[token];
      }
    }
    writeSessions(sessions);

    const storeFile = userStorePath(userId);
    if (fs.existsSync(storeFile)) {
      fs.rmSync(storeFile, { force: true });
    }

    return { ok: true };
  }

  function createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const sessions = readSessions();
    const now = Date.now();
    for (const [k, s] of Object.entries(sessions)) {
      if (!s || s.expiresAt <= now) delete sessions[k];
    }
    sessions[token] = {
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + SESSION_TTL_MS,
    };
    writeSessions(sessions);
    return token;
  }

  function getSessionUser(req) {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;
    const sessions = readSessions();
    const session = sessions[token];
    if (!session || session.expiresAt <= Date.now()) {
      if (session) {
        delete sessions[token];
        writeSessions(sessions);
      }
      return null;
    }
    const users = readUsers();
    const user = users.find((u) => u.id === session.userId);
    return user ? { user: sanitizeUser(user), token } : null;
  }

  function destroySession(token) {
    if (!token) return;
    const sessions = readSessions();
    if (sessions[token]) {
      delete sessions[token];
      writeSessions(sessions);
    }
  }

  return {
    registerUser,
    authenticateUser,
    updateUserName,
    deleteUserAccount,
    createSession,
    getSessionUser,
    destroySession,
    readUserState,
    writeUserState,
    hasLegacyData,
    userCount: () => readUsers().length,
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function sessionCookieHeader(token, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000)) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

function readJsonBody(req, maxBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(text));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeTimes(times) {
  if (!Array.isArray(times)) return [];
  const valid = [];
  for (const t of times) {
    if (typeof t !== 'string') continue;
    const match = t.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) continue;
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      valid.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
  }
  return [...new Set(valid)].sort();
}

function normalizeDaysOfWeek(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const clean = [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  return clean.length > 0 ? clean.sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
}

function normalizeDateStr(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
}

function validateMedicineInput(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return { error: 'Medicine name is required.' };
  }

  const scheduleType = ['daily', 'days', 'prn'].includes(body.scheduleType)
    ? body.scheduleType
    : 'daily';
  const times = normalizeTimes(body.times);

  if (scheduleType !== 'prn' && times.length === 0) {
    return { error: 'At least one valid reminder time (HH:MM) is required.' };
  }

  const daysOfWeek =
    scheduleType === 'days' ? normalizeDaysOfWeek(body.daysOfWeek) : [0, 1, 2, 3, 4, 5, 6];
  const startDate = normalizeDateStr(body.startDate);
  const endDate = normalizeDateStr(body.endDate);

  if (startDate && endDate && endDate < startDate) {
    return { error: 'End date cannot be earlier than start date.' };
  }

  const stockCount =
    body.stockCount === '' || body.stockCount === null || body.stockCount === undefined
      ? null
      : Math.max(0, Math.floor(Number(body.stockCount) || 0));

  const lowStockThreshold =
    body.lowStockThreshold === '' || body.lowStockThreshold === null || body.lowStockThreshold === undefined
      ? 5
      : Math.max(0, Math.floor(Number(body.lowStockThreshold) || 0));

  const courseStatus = ['active', 'paused', 'cured'].includes(body.courseStatus)
    ? body.courseStatus
    : body.active === false
    ? 'paused'
    : 'active';

  return {
    value: {
      name,
      dosage: typeof body.dosage === 'string' ? body.dosage.trim() : '',
      condition: typeof body.condition === 'string' ? body.condition.trim() : '',
      scheduleType,
      daysOfWeek,
      startDate,
      endDate,
      times,
      mealInstruction:
        typeof body.mealInstruction === 'string' && body.mealInstruction.trim()
          ? body.mealInstruction.trim()
          : 'Any time',
      notes: typeof body.notes === 'string' ? body.notes.trim() : '',
      color: typeof body.color === 'string' && body.color.trim() ? body.color.trim() : '#0ea5e9',
      stockCount,
      lowStockThreshold,
      courseStatus,
      active: courseStatus === 'active',
      curedAt:
        courseStatus === 'cured'
          ? typeof body.curedAt === 'string' && body.curedAt
            ? body.curedAt
            : new Date().toISOString()
          : null,
      recoveryNotes: typeof body.recoveryNotes === 'string' ? body.recoveryNotes.trim() : '',
    },
  };
}

function validateDoctorInput(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!name) {
    return { error: 'Doctor / Physician name is required.' };
  }
  if (!phone) {
    return { error: 'Phone number is required for quick dial.' };
  }
  return {
    value: {
      name,
      specialty: typeof body.specialty === 'string' ? body.specialty.trim() : '',
      clinic: typeof body.clinic === 'string' ? body.clinic.trim() : '',
      phone,
      email: typeof body.email === 'string' ? body.email.trim() : '',
      notes: typeof body.notes === 'string' ? body.notes.trim() : '',
      isPrimary: Boolean(body.isPrimary),
    },
  };
}

function extractGeminiText(apiResponse) {
  const candidates = apiResponse && Array.isArray(apiResponse.candidates) ? apiResponse.candidates : [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    const text = parts
      .map((p) => (typeof p.text === 'string' ? p.text : ''))
      .join('')
      .trim();
    if (text) return text;
  }
  return '';
}

function cleanJsonFence(rawText) {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function formatGeminiError(status, rawMessage) {
  const msg = rawMessage || `Gemini API returned HTTP ${status}`;
  if (/API keys are not supported|no longer supported|unrestricted|ACCESS_TOKEN_TYPE_UNSUPPORTED/i.test(msg)) {
    return (
      `${msg} — Tip: In Google AI Studio, generate a new Authorization Key (AQ...) or restrict your ` +
      `AIza key specifically to the "Generative Language API" in Google Cloud Console.`
    );
  }
  return msg;
}

async function callGemini({ apiKey, model, contents, systemInstruction, generationConfig, fetchImpl = fetch }) {
  const safeModel = (model || DEFAULT_MODEL).replace(/^models\//, '').replace(/[^a-zA-Z0-9._-]/g, '');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(safeModel)}:generateContent`;

  const payload = { contents };
  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  if (generationConfig) {
    payload.generationConfig = generationConfig;
  }

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(formatGeminiError(response.status, data?.error?.message));
    err.statusCode = response.status;
    throw err;
  }

  const text = extractGeminiText(data);
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return { text, model: safeModel };
}

async function listGeminiModels({ apiKey, fetchImpl = fetch }) {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(formatGeminiError(response.status, data?.error?.message));
    err.statusCode = response.status;
    throw err;
  }
  return Array.isArray(data.models)
    ? data.models
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => ({
          id: String(m.name || '').replace(/^models\//, ''),
          displayName: m.displayName || String(m.name || '').replace(/^models\//, ''),
        }))
        .filter((m) => m.id)
    : [];
}

function resolveApiKey(req, bodyKey = '') {
  if (typeof bodyKey === 'string' && bodyKey.trim()) {
    return bodyKey.trim();
  }
  const headerKey = req.headers['x-gemini-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  if (typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  return '';
}

function formatActiveMedsForPrompt(medicines) {
  const activeMeds = medicines.filter((m) => m.active);
  if (activeMeds.length === 0) return 'No active medications currently scheduled.';
  return activeMeds
    .map((m) => {
      const sched =
        m.scheduleType === 'prn'
          ? 'As needed (PRN)'
          : `times [${(m.times || []).join(', ')}]${m.scheduleType === 'days' ? ` on weekdays [${(m.daysOfWeek || []).join(',')}]` : ' daily'}`;
      const dates = m.startDate || m.endDate ? `, range ${m.startDate || '...'} to ${m.endDate || '...'}` : '';
      return `- ${m.name}${m.dosage ? ` (${m.dosage})` : ''}${m.condition ? ` for ${m.condition}` : ''}: ${sched}, ${m.mealInstruction}${dates}${m.notes ? `, notes: ${m.notes}` : ''}`;
    })
    .join('\n');
}

function formatPatientProfileForPrompt(profile = {}) {
  const parts = [];
  if (profile.bloodType) parts.push(`Blood Type: ${profile.bloodType}`);
  if (profile.allergies) parts.push(`Allergies: ${profile.allergies}`);
  if (profile.medicalConditions) parts.push(`Conditions: ${profile.medicalConditions}`);
  return parts.length > 0 ? parts.join(' | ') : 'No allergies or profile conditions recorded.';
}

function createApp(options = {}) {
  const publicDir = options.publicDir || path.join(__dirname, 'public');
  const dataDir = options.dataDir || (options.dataFile ? path.dirname(options.dataFile) : path.join(__dirname, 'data'));
  const fetchImpl = options.fetchImpl || fetch;
  const auth = createAuthStore(dataDir);

  return http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, 'http://localhost');
    const pathname = urlObj.pathname;

    try {
      // Public Health & Auth Endpoints
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
          ok: true,
          hasServerApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
          defaultModel: process.env.GEMINI_MODEL || DEFAULT_MODEL,
          hasUsers: auth.userCount() > 0,
          hasLegacyData: auth.hasLegacyData(),
        });
      }

      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const session = auth.getSessionUser(req);
        if (!session) {
          return sendJson(res, 200, {
            authenticated: false,
            user: null,
            hasLegacyData: auth.hasLegacyData(),
          });
        }
        return sendJson(res, 200, {
          authenticated: true,
          user: session.user,
        });
      }

      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = auth.registerUser({
          name: body.name,
          email: body.email,
          password: body.password,
          importLegacy: Boolean(body.importLegacy),
        });
        if (result.error) {
          return sendJson(res, 400, { error: result.error });
        }
        const token = auth.createSession(result.user.id);
        const state = auth.readUserState(result.user.id);
        return sendJson(
          res,
          201,
          { user: result.user, state },
          { 'Set-Cookie': sessionCookieHeader(token) }
        );
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = auth.authenticateUser({
          email: body.email,
          password: body.password,
        });
        if (result.error) {
          return sendJson(res, 401, { error: result.error });
        }
        const token = auth.createSession(result.user.id);
        const state = auth.readUserState(result.user.id);
        return sendJson(
          res,
          200,
          { user: result.user, state },
          { 'Set-Cookie': sessionCookieHeader(token) }
        );
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const session = auth.getSessionUser(req);
        if (session) {
          auth.destroySession(session.token);
        }
        return sendJson(
          res,
          200,
          { ok: true },
          { 'Set-Cookie': sessionCookieHeader('', 0) }
        );
      }

      // Require authentication for all remaining /api/* routes
      if (pathname.startsWith('/api/')) {
        const session = auth.getSessionUser(req);
        if (!session) {
          return sendJson(res, 401, { error: 'Authentication required. Please sign in or create an account.' });
        }
        const userId = session.user.id;

        if (pathname === '/api/auth/delete-account' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = auth.deleteUserAccount(userId, body.password);
          if (result.error) {
            return sendJson(res, 400, { error: result.error });
          }
          return sendJson(
            res,
            200,
            { ok: true },
            { 'Set-Cookie': sessionCookieHeader('', 0) }
          );
        }

        if (pathname === '/api/state' && req.method === 'GET') {
          return sendJson(res, 200, auth.readUserState(userId));
        }

        if (pathname === '/api/profile' && req.method === 'PUT') {
          const body = await readJsonBody(req);
          const state = auth.readUserState(userId);
          let updatedUser = session.user;
          if (typeof body.name === 'string' && body.name.trim()) {
            const u = auth.updateUserName(userId, body.name);
            if (u) updatedUser = u;
          }
          state.profile = {
            dob: normalizeDateStr(body.dob !== undefined ? body.dob : state.profile.dob),
            bloodType:
              typeof body.bloodType === 'string' ? body.bloodType.trim() : state.profile.bloodType || '',
            allergies:
              typeof body.allergies === 'string' ? body.allergies.trim() : state.profile.allergies || '',
            medicalConditions:
              typeof body.medicalConditions === 'string'
                ? body.medicalConditions.trim()
                : state.profile.medicalConditions || '',
            emergencyContactName:
              typeof body.emergencyContactName === 'string'
                ? body.emergencyContactName.trim()
                : state.profile.emergencyContactName || '',
            emergencyContactRelation:
              typeof body.emergencyContactRelation === 'string'
                ? body.emergencyContactRelation.trim()
                : state.profile.emergencyContactRelation || '',
            emergencyContactPhone:
              typeof body.emergencyContactPhone === 'string'
                ? body.emergencyContactPhone.trim()
                : state.profile.emergencyContactPhone || '',
          };
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { user: updatedUser, profile: state.profile, state });
        }

        if (pathname === '/api/doctors' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const validated = validateDoctorInput(body);
          if (validated.error) {
            return sendJson(res, 400, { error: validated.error });
          }
          const state = auth.readUserState(userId);
          if (validated.value.isPrimary) {
            state.doctors.forEach((d) => {
              d.isPrimary = false;
            });
          }
          const doctor = {
            id: crypto.randomUUID(),
            ...validated.value,
            createdAt: new Date().toISOString(),
          };
          state.doctors.push(doctor);
          auth.writeUserState(userId, state);
          return sendJson(res, 201, { doctor, state });
        }

        if (pathname.startsWith('/api/doctors/') && req.method === 'PUT') {
          const id = decodeURIComponent(pathname.slice('/api/doctors/'.length));
          const body = await readJsonBody(req);
          const state = auth.readUserState(userId);
          const index = state.doctors.findIndex((d) => d.id === id);
          if (index === -1) {
            return sendJson(res, 404, { error: 'Doctor not found.' });
          }
          const validated = validateDoctorInput({ ...state.doctors[index], ...body });
          if (validated.error) {
            return sendJson(res, 400, { error: validated.error });
          }
          if (validated.value.isPrimary) {
            state.doctors.forEach((d) => {
              d.isPrimary = false;
            });
          }
          state.doctors[index] = {
            ...state.doctors[index],
            ...validated.value,
            updatedAt: new Date().toISOString(),
          };
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { doctor: state.doctors[index], state });
        }

        if (pathname.startsWith('/api/doctors/') && req.method === 'DELETE') {
          const id = decodeURIComponent(pathname.slice('/api/doctors/'.length));
          const state = auth.readUserState(userId);
          const before = state.doctors.length;
          state.doctors = state.doctors.filter((d) => d.id !== id);
          if (state.doctors.length === before) {
            return sendJson(res, 404, { error: 'Doctor not found.' });
          }
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { ok: true, state });
        }

        if (pathname === '/api/medicines' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const validated = validateMedicineInput(body);
          if (validated.error) {
            return sendJson(res, 400, { error: validated.error });
          }
          const state = auth.readUserState(userId);
          const med = {
            id: crypto.randomUUID(),
            ...validated.value,
            createdAt: new Date().toISOString(),
          };
          state.medicines.push(med);
          auth.writeUserState(userId, state);
          return sendJson(res, 201, { medicine: med, state });
        }

        if (pathname.endsWith('/refill') && pathname.startsWith('/api/medicines/') && req.method === 'POST') {
          const id = decodeURIComponent(pathname.slice('/api/medicines/'.length, -'/refill'.length));
          const body = await readJsonBody(req);
          const amount = Math.floor(Number(body.amount));
          if (!Number.isFinite(amount) || amount <= 0) {
            return sendJson(res, 400, { error: 'Refill amount must be a positive number.' });
          }
          const state = auth.readUserState(userId);
          const med = state.medicines.find((m) => m.id === id);
          if (!med) {
            return sendJson(res, 404, { error: 'Medicine not found.' });
          }
          med.stockCount = (typeof med.stockCount === 'number' ? med.stockCount : 0) + amount;
          med.updatedAt = new Date().toISOString();
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { medicine: med, state });
        }

        if (pathname.endsWith('/cure') && pathname.startsWith('/api/medicines/') && req.method === 'POST') {
          const id = decodeURIComponent(pathname.slice('/api/medicines/'.length, -'/cure'.length));
          const body = await readJsonBody(req);
          const state = auth.readUserState(userId);
          const med = state.medicines.find((m) => m.id === id);
          if (!med) {
            return sendJson(res, 404, { error: 'Medicine not found.' });
          }
          med.courseStatus = 'cured';
          med.active = false;
          med.curedAt = new Date().toISOString();
          if (typeof body.recoveryNotes === 'string') {
            med.recoveryNotes = body.recoveryNotes.trim();
          }
          med.updatedAt = new Date().toISOString();
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { medicine: med, state });
        }

        if (pathname.startsWith('/api/medicines/') && req.method === 'PUT') {
          const id = decodeURIComponent(pathname.slice('/api/medicines/'.length));
          const body = await readJsonBody(req);
          const state = auth.readUserState(userId);
          const index = state.medicines.findIndex((m) => m.id === id);
          if (index === -1) {
            return sendJson(res, 404, { error: 'Medicine not found.' });
          }
          const existing = state.medicines[index];
          const merged = { ...existing, ...body };
          const validated = validateMedicineInput(merged);
          if (validated.error) {
            return sendJson(res, 400, { error: validated.error });
          }
          state.medicines[index] = {
            ...existing,
            ...validated.value,
            updatedAt: new Date().toISOString(),
          };
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { medicine: state.medicines[index], state });
        }

        if (pathname.startsWith('/api/medicines/') && req.method === 'DELETE') {
          const id = decodeURIComponent(pathname.slice('/api/medicines/'.length));
          const state = auth.readUserState(userId);
          const before = state.medicines.length;
          state.medicines = state.medicines.filter((m) => m.id !== id);
          if (state.medicines.length === before) {
            return sendJson(res, 404, { error: 'Medicine not found.' });
          }
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { ok: true, state });
        }

        if (pathname === '/api/doses/log' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const { medicineId, scheduledTime, date, status, snoozeUntil, isPrn } = body;
          const validStatuses = ['taken', 'snoozed', 'skipped'];
          if (!medicineId || !scheduledTime || !date || !validStatuses.includes(status)) {
            return sendJson(res, 400, {
              error: 'medicineId, scheduledTime, date, and valid status (taken|snoozed|skipped) are required.',
            });
          }

          const state = auth.readUserState(userId);
          const med = state.medicines.find((m) => m.id === medicineId);
          if (!med) {
            return sendJson(res, 404, { error: 'Medicine not found.' });
          }

          const existingIndex = isPrn
            ? -1
            : state.logs.findIndex(
                (l) => !l.isPrn && l.medicineId === medicineId && l.scheduledTime === scheduledTime && l.date === date
              );
          const previousStatus = existingIndex !== -1 ? state.logs[existingIndex].status : null;

          const entry = {
            id: existingIndex !== -1 ? state.logs[existingIndex].id : crypto.randomUUID(),
            medicineId,
            medicineName: med.name,
            dosage: med.dosage,
            condition: med.condition || '',
            scheduledTime,
            date,
            status,
            isPrn: Boolean(isPrn),
            snoozeUntil: status === 'snoozed' ? snoozeUntil || null : null,
            loggedAt: new Date().toISOString(),
          };

          if (existingIndex !== -1) {
            state.logs[existingIndex] = entry;
          } else {
            state.logs.push(entry);
          }

          if (typeof med.stockCount === 'number') {
            if (previousStatus !== 'taken' && status === 'taken' && med.stockCount > 0) {
              med.stockCount -= 1;
            } else if (previousStatus === 'taken' && status !== 'taken') {
              med.stockCount += 1;
            }
          }

          auth.writeUserState(userId, state);
          return sendJson(res, 200, { log: entry, state });
        }

        if (pathname.startsWith('/api/doses/log/') && req.method === 'DELETE') {
          const logId = decodeURIComponent(pathname.slice('/api/doses/log/'.length));
          const state = auth.readUserState(userId);
          const idx = state.logs.findIndex((l) => l.id === logId);
          if (idx === -1) {
            return sendJson(res, 404, { error: 'Dose log entry not found.' });
          }
          const [removed] = state.logs.splice(idx, 1);
          if (removed.status === 'taken') {
            const med = state.medicines.find((m) => m.id === removed.medicineId);
            if (med && typeof med.stockCount === 'number') {
              med.stockCount += 1;
            }
          }
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { ok: true, state });
        }

        if (pathname === '/api/settings' && req.method === 'PUT') {
          const body = await readJsonBody(req);
          const state = auth.readUserState(userId);
          state.settings = {
            ...state.settings,
            defaultSnoozeMinutes: Math.min(
              120,
              Math.max(1, Number(body.defaultSnoozeMinutes) || state.settings.defaultSnoozeMinutes || 10)
            ),
            soundEnabled:
              body.soundEnabled !== undefined ? Boolean(body.soundEnabled) : state.settings.soundEnabled,
            notificationsEnabled:
              body.notificationsEnabled !== undefined
                ? Boolean(body.notificationsEnabled)
                : state.settings.notificationsEnabled,
            model:
              typeof body.model === 'string' && body.model.trim()
                ? body.model.trim()
                : state.settings.model || DEFAULT_MODEL,
            caregiverName:
              typeof body.caregiverName === 'string' ? body.caregiverName.trim() : state.settings.caregiverName || '',
            caregiverContact:
              typeof body.caregiverContact === 'string'
                ? body.caregiverContact.trim()
                : state.settings.caregiverContact || '',
            darkMode: body.darkMode !== undefined ? Boolean(body.darkMode) : Boolean(state.settings.darkMode),
            largeText: body.largeText !== undefined ? Boolean(body.largeText) : Boolean(state.settings.largeText),
          };
          auth.writeUserState(userId, state);
          return sendJson(res, 200, { settings: state.settings, state });
        }

        if (pathname === '/api/sample-data' && req.method === 'POST') {
          const state = auth.readUserState(userId);
          const now = new Date();
          const plusTwoMins = new Date(now.getTime() + 2 * 60000);
          const dueSoonTime = `${String(plusTwoMins.getHours()).padStart(2, '0')}:${String(
            plusTwoMins.getMinutes()
          ).padStart(2, '0')}`;
          const today = now.toISOString().slice(0, 10);

          const samples = [
            {
              id: crypto.randomUUID(),
              name: 'Vitamin D3',
              dosage: '1000 IU (1 softgel)',
              condition: 'Vitamin D Maintenance',
              scheduleType: 'daily',
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startDate: today,
              endDate: '',
              times: ['08:30'],
              mealInstruction: 'With food',
              notes: 'Supports bone and immune health.',
              color: '#f59e0b',
              stockCount: 24,
              lowStockThreshold: 5,
              courseStatus: 'active',
              active: true,
              curedAt: null,
              recoveryNotes: '',
              createdAt: now.toISOString(),
            },
            {
              id: crypto.randomUUID(),
              name: 'Metformin',
              dosage: '500 mg',
              condition: 'Blood Sugar Management',
              scheduleType: 'daily',
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startDate: today,
              endDate: '',
              times: ['09:00', '20:00'],
              mealInstruction: 'After meal',
              notes: 'Take with a full glass of water.',
              color: '#0ea5e9',
              stockCount: 4,
              lowStockThreshold: 5,
              courseStatus: 'active',
              active: true,
              curedAt: null,
              recoveryNotes: '',
              createdAt: now.toISOString(),
            },
            {
              id: crypto.randomUUID(),
              name: 'Omega-3 Fish Oil',
              dosage: '1000 mg',
              condition: 'Heart Health',
              scheduleType: 'daily',
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startDate: today,
              endDate: '',
              times: [dueSoonTime],
              mealInstruction: 'With food',
              notes: 'Demo reminder scheduled 2 minutes from now so you can test alerts.',
              color: '#10b981',
              stockCount: 18,
              lowStockThreshold: 5,
              courseStatus: 'active',
              active: true,
              curedAt: null,
              recoveryNotes: '',
              createdAt: now.toISOString(),
            },
            {
              id: crypto.randomUUID(),
              name: 'Amoxicillin (Completed Course)',
              dosage: '500 mg',
              condition: 'Throat Infection',
              scheduleType: 'daily',
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startDate: '2026-10-01',
              endDate: '2026-10-07',
              times: ['08:00', '20:00'],
              mealInstruction: 'After meal',
              notes: '7-day antibiotic course.',
              color: '#8b5cf6',
              stockCount: 0,
              lowStockThreshold: 5,
              courseStatus: 'cured',
              active: false,
              curedAt: '2026-10-08T09:00:00.000Z',
              recoveryNotes: 'Infection cleared completely; no side effects observed.',
              createdAt: '2026-10-01T08:00:00.000Z',
            },
          ];
          state.medicines.push(...samples);
          if (state.doctors.length === 0) {
            state.doctors.push({
              id: crypto.randomUUID(),
              name: 'Dr. Maya Patel',
              specialty: 'Primary Care Physician',
              clinic: 'City Wellness Clinic',
              phone: '+1-555-0148',
              email: 'dr.patel@clinic.example',
              notes: 'Mon-Fri 9am-5pm',
              isPrimary: true,
              createdAt: now.toISOString(),
            });
          }
          auth.writeUserState(userId, state);
          return sendJson(res, 201, { added: samples.length, state });
        }

        if (pathname === '/api/gemini/verify' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const apiKey = resolveApiKey(req, body.apiKey);
          if (!apiKey) {
            return sendJson(res, 400, {
              error: 'No Gemini API key provided. Paste your key or configure GEMINI_API_KEY in .env.',
            });
          }
          const models = await listGeminiModels({ apiKey, fetchImpl });
          return sendJson(res, 200, {
            ok: true,
            keyFormat: apiKey.startsWith('AQ.') ? 'AQ Authorization Key' : apiKey.startsWith('AIza') ? 'AIza Standard Key' : 'Custom Key',
            models,
          });
        }

        if (pathname === '/api/gemini/parse' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const apiKey = resolveApiKey(req);
          if (!apiKey) {
            return sendJson(res, 400, {
              error: 'Missing Gemini API key. Add your key in Settings or set GEMINI_API_KEY in .env.',
            });
          }

          const text = typeof body.text === 'string' ? body.text.trim() : '';
          const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
          const imageMimeType = typeof body.imageMimeType === 'string' ? body.imageMimeType.trim() : 'image/jpeg';

          if (!text && !imageBase64) {
            return sendJson(res, 400, { error: 'Provide prescription text or an image to analyze.' });
          }

          const state = auth.readUserState(userId);
          const model = body.model || state.settings.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;

          const parts = [
            {
              text:
                `Extract every medication from the user's input (text and/or prescription/pill bottle image) into strict JSON.\n` +
                `Return a JSON object with shape:\n` +
                `{\n` +
                `  "medicines": [\n` +
                `    {\n` +
                `      "name": "string",\n` +
                `      "dosage": "string (e.g. 500 mg, 1 tablet)",\n` +
                `      "condition": "short condition/reason if mentioned, else empty string",\n` +
                `      "scheduleType": "daily | days | prn",\n` +
                `      "daysOfWeek": [0,1,2,3,4,5,6],\n` +
                `      "durationDays": number or null,\n` +
                `      "times": ["HH:MM" in 24-hour format],\n` +
                `      "mealInstruction": "Before meal | With food | After meal | Empty stomach | Bedtime | Any time",\n` +
                `      "stockCount": number or null,\n` +
                `      "notes": "concise instruction or duration note"\n` +
                `    }\n` +
                `  ],\n` +
                `  "summary": "1-sentence summary of what was extracted"\n` +
                `}\n` +
                `Rules:\n` +
                `- Map "once daily/morning" -> ["08:00"], "twice daily/BID" -> ["08:00", "20:00"], "three times daily/TID" -> ["08:00", "14:00", "20:00"], "bedtime" -> ["22:00"].\n` +
                `- If "as needed" / PRN, set scheduleType to "prn" and times to [].\n` +
                `- If specific days (e.g. Mon/Wed/Fri), set scheduleType to "days" and daysOfWeek using 0=Sun..6=Sat.\n` +
                (text ? `\nUser input:\n${text}` : '\nAnalyze the attached medication image.'),
            },
          ];

          if (imageBase64) {
            parts.push({
              inline_data: {
                mime_type: imageMimeType,
                data: imageBase64,
              },
            });
          }

          const result = await callGemini({
            apiKey,
            model,
            contents: [{ role: 'user', parts }],
            systemInstruction:
              'You are a careful medical-schedule extraction assistant. Output valid JSON only, without inventing medications not present in the input.',
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
            fetchImpl,
          });

          let parsed;
          try {
            parsed = JSON.parse(cleanJsonFence(result.text));
          } catch {
            return sendJson(res, 502, {
              error: 'Gemini returned non-JSON output while parsing the schedule.',
              raw: result.text,
            });
          }

          const today = new Date().toISOString().slice(0, 10);
          const extracted = Array.isArray(parsed.medicines)
            ? parsed.medicines
                .map((m) => {
                  const scheduleType = ['daily', 'days', 'prn'].includes(m.scheduleType)
                    ? m.scheduleType
                    : 'daily';
                  const normTimes = normalizeTimes(m.times);
                  const duration =
                    typeof m.durationDays === 'number' && m.durationDays > 0
                      ? Math.floor(m.durationDays)
                      : null;
                  const endDate = duration
                    ? new Date(Date.now() + (duration - 1) * 86400000).toISOString().slice(0, 10)
                    : '';

                  return {
                    name: typeof m.name === 'string' ? m.name.trim() : '',
                    dosage: typeof m.dosage === 'string' ? m.dosage.trim() : '',
                    condition: typeof m.condition === 'string' ? m.condition.trim() : '',
                    scheduleType,
                    daysOfWeek:
                      scheduleType === 'days'
                        ? normalizeDaysOfWeek(m.daysOfWeek)
                        : [0, 1, 2, 3, 4, 5, 6],
                    startDate: duration ? today : '',
                    endDate,
                    times: scheduleType === 'prn' ? [] : normTimes.length ? normTimes : ['08:00'],
                    mealInstruction:
                      typeof m.mealInstruction === 'string' && m.mealInstruction.trim()
                        ? m.mealInstruction.trim()
                        : 'Any time',
                    stockCount:
                      typeof m.stockCount === 'number' && Number.isFinite(m.stockCount)
                        ? Math.max(0, Math.floor(m.stockCount))
                        : null,
                    notes: typeof m.notes === 'string' ? m.notes.trim() : '',
                  };
                })
                .filter((m) => m.name)
            : [];

          return sendJson(res, 200, {
            medicines: extracted,
            summary: typeof parsed.summary === 'string' ? parsed.summary : '',
            model: result.model,
          });
        }

        if (pathname === '/api/gemini/interactions' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const apiKey = resolveApiKey(req);
          if (!apiKey) {
            return sendJson(res, 400, {
              error: 'Missing Gemini API key. Add your key in Settings or set GEMINI_API_KEY in .env.',
            });
          }

          const state = auth.readUserState(userId);
          const activeMeds = state.medicines.filter((m) => m.active);
          if (activeMeds.length === 0) {
            return sendJson(res, 400, { error: 'Add at least one active medicine before running an interaction check.' });
          }

          const model = body.model || state.settings.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
          const medSummary = formatActiveMedsForPrompt(state.medicines);
          const profileSummary = formatPatientProfileForPrompt(state.profile);

          const result = await callGemini({
            apiKey,
            model,
            systemInstruction:
              'You are a clinical medication-safety assistant. Analyze the user medication list and patient allergies/conditions ' +
              'for potential drug-drug interactions, allergy flags, duplicate ingredients, food spacing, and timing improvements. ' +
              'Always include a reminder to consult a licensed doctor or pharmacist.',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      `Patient context: ${profileSummary}\n\n` +
                      `Review these active medications and provide:\n` +
                      `1. Overall safety/conflict & allergy summary\n` +
                      `2. Any potential drug or food-timing interactions\n` +
                      `3. Recommended spacing or routine adjustments\n\n` +
                      `Active schedule:\n${medSummary}`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.2 },
            fetchImpl,
          });

          return sendJson(res, 200, { report: result.text, model: result.model });
        }

        if (pathname === '/api/gemini/chat' && req.method === 'POST') {
          const apiKey = resolveApiKey(req);
          if (!apiKey) {
            return sendJson(res, 400, {
              error: 'Missing Gemini API key. Add your key in Settings or set GEMINI_API_KEY in .env.',
            });
          }

          const body = await readJsonBody(req);
          const question = typeof body.question === 'string' ? body.question.trim() : '';
          if (!question) {
            return sendJson(res, 400, { error: 'Question is required.' });
          }

          const state = auth.readUserState(userId);
          const model = body.model || state.settings.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
          const medSummary = formatActiveMedsForPrompt(state.medicines);
          const profileSummary = formatPatientProfileForPrompt(state.profile);
          const curedMeds = state.medicines.filter((m) => m.courseStatus === 'cured');
          const curedSummary =
            curedMeds.length > 0
              ? curedMeds
                  .map(
                    (m) =>
                      `- ${m.name}${m.dosage ? ` (${m.dosage})` : ''}${m.condition ? ` for ${m.condition}` : ''}, completed ${m.curedAt ? m.curedAt.slice(0, 10) : 'previously'}${m.recoveryNotes ? `: ${m.recoveryNotes}` : ''}`
                  )
                  .join('\n')
              : 'None recorded.';

          const result = await callGemini({
            apiKey,
            model,
            systemInstruction:
              'You are a helpful, safety-conscious Smart Medicine Reminder assistant. ' +
              'Answer clearly and concisely using bullet points when helpful. ' +
              'Consider patient allergies/conditions, active medications, and past cured courses when relevant, ' +
              'and always remind the user to confirm medical decisions with their doctor or pharmacist.',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Patient profile: ${profileSummary}\n\nCurrent active medications:\n${medSummary}\n\nPast cured/completed courses:\n${curedSummary}\n\nUser question:\n${question}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
            },
            fetchImpl,
          });

          return sendJson(res, 200, {
            answer: result.text,
            model: result.model,
          });
        }

        return sendJson(res, 404, { error: 'API endpoint not found.' });
      }

      // Static file serving
      let reqPath = pathname === '/' ? '/index.html' : pathname;
      reqPath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
      const filePath = path.join(publicDir, reqPath);

      if (!filePath.startsWith(publicDir)) {
        return sendJson(res, 403, { error: 'Forbidden' });
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(content);
      }

      return sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err.message === 'INVALID_JSON') {
        return sendJson(res, 400, { error: 'Invalid JSON request body.' });
      }
      if (err.message === 'PAYLOAD_TOO_LARGE') {
        return sendJson(res, 413, { error: 'Request payload is too large (max 8 MB).' });
      }
      const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
      return sendJson(res, status, { error: err.message || 'Internal server error' });
    }
  });
}

if (require.main === module) {
  loadEnvFile(path.join(__dirname, '.env'));
  const port = Number(process.env.PORT) || 3000;
  const server = createApp();
  server.listen(port, '127.0.0.1', () => {
    console.log(`Smart Medicine Reminder running at http://127.0.0.1:${port}`);
  });
}

module.exports = {
  createApp,
  normalizeTimes,
  normalizeDaysOfWeek,
  validateMedicineInput,
  validateDoctorInput,
  cleanJsonFence,
  extractGeminiText,
  formatGeminiError,
};

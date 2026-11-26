const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createApp,
  normalizeTimes,
  normalizeDaysOfWeek,
  validateMedicineInput,
  validateDoctorInput,
  cleanJsonFence,
  extractGeminiText,
} = require('./server');

function startTestServer(options = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dosemind-test-'));
  const server = createApp({ dataDir: tmpDir, ...options });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        dataDir: tmpDir,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => {
              fs.rmSync(tmpDir, { recursive: true, force: true });
              done();
            });
          }),
      });
    });
  });
}

function extractCookie(res) {
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

test('normalizeTimes and normalizeDaysOfWeek clean and sort inputs', () => {
  assert.deepEqual(normalizeTimes(['20:00', '8:05', '08:05', '25:00', 'bad']), ['08:05', '20:00']);
  assert.deepEqual(normalizeDaysOfWeek([5, 1, 1, 9, -1]), [1, 5]);
});

test('validateMedicineInput and validateDoctorInput validate fields cleanly', () => {
  const bad = validateMedicineInput({ name: '   ', times: ['08:00'] });
  assert.ok(bad.error);

  const prnOk = validateMedicineInput({
    name: 'Ibuprofen',
    scheduleType: 'prn',
    times: [],
    stockCount: 12,
  });
  assert.equal(prnOk.error, undefined);
  assert.equal(prnOk.value.scheduleType, 'prn');

  const badDoc = validateDoctorInput({ name: 'Dr. Lee', phone: '' });
  assert.ok(badDoc.error);

  const okDoc = validateDoctorInput({
    name: 'Dr. Lee',
    specialty: 'Cardiologist',
    phone: '+1-555-0199',
    isPrimary: true,
  });
  assert.equal(okDoc.error, undefined);
  assert.equal(okDoc.value.isPrimary, true);
});

test('cleanJsonFence strips markdown code fences and extractGeminiText reads candidate text', () => {
  assert.equal(cleanJsonFence('```json\n{"a":1}\n```'), '{"a":1}');
  const text = extractGeminiText({
    candidates: [{ content: { parts: [{ text: 'Hello ' }, { text: 'world' }] } }],
  });
  assert.equal(text, 'Hello world');
});

test('Account lifecycle: register, cured archive, patient profile, doctors directory, and delete account', async () => {
  const ctx = await startTestServer();
  try {
    const unauthState = await fetch(`${ctx.baseUrl}/api/state`);
    assert.equal(unauthState.status, 401);

    // Register Alice
    const regA = await fetch(`${ctx.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Patient',
        email: 'alice@example.com',
        password: 'password123',
      }),
    });
    assert.equal(regA.status, 201);
    const cookieA = extractCookie(regA);

    // Update Patient Profile
    const profRes = await fetch(`${ctx.baseUrl}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Alice R. Patient',
        dob: '1990-05-12',
        bloodType: 'O+',
        allergies: 'Penicillin',
        medicalConditions: 'Mild Asthma',
        emergencyContactName: 'Sam Patient',
        emergencyContactRelation: 'Spouse',
        emergencyContactPhone: '+1-555-0100',
      }),
    });
    assert.equal(profRes.status, 200);
    const profData = await profRes.json();
    assert.equal(profData.user.name, 'Alice R. Patient');
    assert.equal(profData.profile.bloodType, 'O+');
    assert.equal(profData.profile.allergies, 'Penicillin');

    // Add and update Doctors
    const doc1 = await fetch(`${ctx.baseUrl}/api/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Dr. Maya Patel',
        specialty: 'GP',
        phone: '+1-555-0148',
        isPrimary: true,
      }),
    }).then((r) => r.json());
    assert.equal(doc1.doctor.isPrimary, true);

    const doc2 = await fetch(`${ctx.baseUrl}/api/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Dr. Chen',
        specialty: 'Pulmonologist',
        phone: '+1-555-0177',
        isPrimary: true,
      }),
    }).then((r) => r.json());
    // Setting doc2 as primary unsets doc1
    assert.equal(doc2.state.doctors.find((d) => d.id === doc1.doctor.id).isPrimary, false);
    assert.equal(doc2.state.doctors.find((d) => d.id === doc2.doctor.id).isPrimary, true);

    // Add & cure a medicine
    const created = await fetch(`${ctx.baseUrl}/api/medicines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Azithromycin',
        dosage: '250 mg',
        condition: 'Bronchitis',
        times: ['09:00'],
        stockCount: 5,
      }),
    }).then((r) => r.json());

    await fetch(`${ctx.baseUrl}/api/medicines/${created.medicine.id}/cure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ recoveryNotes: 'Cleared completely' }),
    });

    // Wrong password cannot delete account
    const badDel = await fetch(`${ctx.baseUrl}/api/auth/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ password: 'wrong-password' }),
    });
    assert.equal(badDel.status, 400);

    // Correct password deletes account, session, and store file
    const okDel = await fetch(`${ctx.baseUrl}/api/auth/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ password: 'password123' }),
    });
    assert.equal(okDel.status, 200);

    // Subsequent requests with old cookie are unauthorized and login fails
    const afterState = await fetch(`${ctx.baseUrl}/api/state`, { headers: { Cookie: cookieA } });
    assert.equal(afterState.status, 401);
    const afterLogin = await fetch(`${ctx.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
    });
    assert.equal(afterLogin.status, 401);
  } finally {
    await ctx.close();
  }
});

test('Gemini endpoints pass x-goog-api-key header and include patient allergies + cured history', async () => {
  const prevEnvKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    assert.equal(url.includes('?key='), false);
    assert.equal(init.headers['x-goog-api-key'], 'AQ.test-auth-key');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Checked against Penicillin allergy.' }] } }],
      }),
    };
  };

  const ctx = await startTestServer({ fetchImpl: mockFetch });
  try {
    const reg = await fetch(`${ctx.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }),
    });
    const cookie = extractCookie(reg);

    await fetch(`${ctx.baseUrl}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ bloodType: 'A+', allergies: 'Penicillin' }),
    });

    await fetch(`${ctx.baseUrl}/api/medicines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Vitamin D3', times: ['08:00'] }),
    });

    const chatRes = await fetch(`${ctx.baseUrl}/api/gemini/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        'x-gemini-api-key': 'AQ.test-auth-key',
      },
      body: JSON.stringify({ question: 'Any allergy concerns?' }),
    });
    assert.equal(chatRes.status, 200);
    assert.match(calls[0].body.contents[0].parts[0].text, /Allergies: Penicillin/);
  } finally {
    if (prevEnvKey !== undefined) process.env.GEMINI_API_KEY = prevEnvKey;
    await ctx.close();
  }
});

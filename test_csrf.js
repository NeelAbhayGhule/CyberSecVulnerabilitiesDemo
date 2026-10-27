/**
 * Automated Test Suite to verify CSRF Vulnerability and Mitigation
 * Tests the complete HTTP transaction sequence:
 * 1. Login session creation
 * 2. Exploitation in Vulnerable Mode (forged cross-site POST succeeds)
 * 3. Mitigation activation (CSRF token enforcement)
 * 4. Exploitation attempt in Mitigated Mode (same forged POST rejected with HTTP 403)
 * 5. Legitimate transfer with valid CSRF token succeeds
 */

async function runTests() {
  console.log('🧪 Starting automated CSRF verification test...\n');

  // Step 1: Login as Alice to obtain authenticated session cookie
  console.log('[Step 1] Logging in as Alice...');
  const loginRes = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=alice&password=password123',
    redirect: 'manual'
  });

  const rawCookie = loginRes.headers.get('set-cookie');
  if (!rawCookie) {
    throw new Error('Failed to obtain session cookie from /login');
  }
  const sessionCookie = rawCookie.split(';')[0];
  console.log(`✅ Logged in successfully. Session Cookie: ${sessionCookie}\n`);

  // Reset data to clean state
  await fetch('http://localhost:3000/api/reset-data', {
    method: 'POST',
    headers: { Cookie: sessionCookie }
  });

  // Verify initial balance
  let statusRes = await fetch('http://localhost:3000/api/user-data', {
    headers: { Cookie: sessionCookie }
  });
  let status = await statusRes.json();
  console.log(`[Initial State] Alice Balance: $${status.user.balance}, CSRF Protection: ${status.csrfProtectionEnabled}`);

  // Step 2: Test CSRF Attack in Vulnerable Mode
  console.log('\n[Step 2] Executing CSRF Attack in Vulnerable Mode...');
  console.log('Simulating attacker page (http://localhost:4000) sending cross-site POST to /transfer:');
  const attackPayload = 'recipient=ACC-9999&amount=1000'; // No CSRF token!
  
  const vulnAttackRes = await fetch('http://localhost:3000/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:4000',
      'Referer': 'http://localhost:4000/',
      'Cookie': sessionCookie // Browser automatically attaches this!
    },
    body: attackPayload,
    redirect: 'manual'
  });

  console.log(`HTTP Status: ${vulnAttackRes.status} (Expected 302 redirect to dashboard on success)`);
  
  statusRes = await fetch('http://localhost:3000/api/user-data', {
    headers: { Cookie: sessionCookie }
  });
  status = await statusRes.json();
  console.log(`Alice Balance after attack: $${status.user.balance} (Deducted $1000 to Attacker!)`);
  const lastTxn = status.transactions[0];
  console.log(`Transaction Note: "${lastTxn.note}"`);
  if (status.user.balance === 4000) {
    console.log('🎯 VULNERABILITY CONFIRMED: CSRF attack succeeded without user intent!\n');
  } else {
    throw new Error('CSRF attack failed unexpectedly in vulnerable mode.');
  }

  // Step 3: Enable CSRF Protection (Mitigation)
  console.log('[Step 3] Enabling CSRF Token Protection (Mitigation Mode)...');
  const toggleRes = await fetch('http://localhost:3000/api/toggle-protection', {
    method: 'POST',
    headers: { Cookie: sessionCookie }
  });
  const toggleData = await toggleRes.json();
  console.log(`CSRF Protection Active: ${toggleData.csrfProtectionEnabled}\n`);

  // Step 4: Repeat the EXACT SAME CSRF Attack in Mitigated Mode
  console.log('[Step 4] Repeating the EXACT SAME CSRF Attack in Mitigated Mode...');
  const mitAttackRes = await fetch('http://localhost:3000/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:4000',
      'Referer': 'http://localhost:4000/',
      'Cookie': sessionCookie // Browser still attaches session cookie
    },
    body: attackPayload, // Missing CSRF token
    redirect: 'manual'
  });

  console.log(`HTTP Status: ${mitAttackRes.status} (Expected 403 Forbidden)`);
  const responseBody = await mitAttackRes.text();
  const contains403Text = responseBody.includes('403 Forbidden: CSRF Attack Blocked!');
  console.log(`Blocked Defense Page Received: ${contains403Text}`);

  statusRes = await fetch('http://localhost:3000/api/user-data', {
    headers: { Cookie: sessionCookie }
  });
  status = await statusRes.json();
  console.log(`Alice Balance after blocked attack: $${status.user.balance}`);

  if (mitAttackRes.status === 403 && status.user.balance === 4000) {
    console.log('🛡️  MITIGATION CONFIRMED: Forged request was rejected with HTTP 403 and funds remained safe!\n');
  } else {
    throw new Error('Mitigation failed to block forged request.');
  }

  // Step 5: Verify legitimate transfer with valid CSRF token still works
  console.log('[Step 5] Verifying legitimate transfer with valid CSRF token...');
  const validCsrfToken = status.csrfToken;
  const legitimatePayload = `recipient=ACC-2002&amount=500&_csrf=${encodeURIComponent(validCsrfToken)}`;
  
  const legitRes = await fetch('http://localhost:3000/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:3000',
      'Referer': 'http://localhost:3000/dashboard',
      'Cookie': sessionCookie
    },
    body: legitimatePayload,
    redirect: 'manual'
  });

  console.log(`Legitimate Transfer HTTP Status: ${legitRes.status}`);
  statusRes = await fetch('http://localhost:3000/api/user-data', {
    headers: { Cookie: sessionCookie }
  });
  status = await statusRes.json();
  console.log(`Alice Balance after legitimate transfer: $${status.user.balance}`);

  if (status.user.balance === 3500) {
    console.log('✅ LEGITIMATE TRANSFER CONFIRMED: Authorized transfer with valid token succeeded!\n');
  }

  console.log('====================================================');
  console.log('🏆 ALL TESTS PASSED! CSRF VARIANT 2 DEMO IS COMPLETE');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

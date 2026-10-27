# Web Server Security: Cross-Site Request Forgery (CSRF)
**Course:** Cyber Security (IT-30001) | Autumn Semester 2026  
**Institution:** Indian Institute of Information Technology Allahabad (IIIT-A)  
**Department:** Department of Information Technology  
**Instructor:** Dr. Soumyadev Maity  

---

## Table 3. Ownership Declaration
| Member Name | Roll Number | Category | Variant Implemented |
| :--- | :--- | :--- | :--- |
| **Neel** *(Fill in full name)* | *(e.g. IIT2024266)* | Cross-Site Request Forgery (CSRF) | **Variant 2: POST-based forged action (auto-submitting form)** |
| *(Member 2)* | *(Roll No)* | SQL Injection | *(Variant selected)* |
| *(Member 3)* | *(Roll No)* | OS Command Injection | *(Variant selected)* |
| *(Member 4)* | *(Roll No)* | Cross-Site Scripting (XSS) | *(Variant selected)* |

---

## 1. Executive Summary & Architecture
This repository implements **Variant 2 of Cross-Site Request Forgery (CSRF)**: an automated, POST-based forged transaction attack against a simulated modern banking application (**Apex Horizon Bank**), followed by defense using the industry-standard **Synchronizer Token Pattern (Session-bound Anti-CSRF Token)**.

The demonstration consists of two distinct origins:
1. **Target Web Application (Victim Site):**  
   - URL: `http://localhost:3000`
   - Role: Secure online banking dashboard where victim Alice is authenticated.
   - Contains both the **vulnerable handler** and the **mitigated handler** with a live interactive toggle.
2. **Attacker Web Application (Malicious Origin):**  
   - URL: `http://localhost:4000`
   - Role: Simulates a deceptive phishing website ("CyberFest 2026 $1,000 Travel Grant") hosting a hidden auto-submitting POST form targeting the bank's fund transfer endpoint.

```
+-----------------------------------------------------------------------------------+
|                               Victim's Web Browser                                |
|                                                                                   |
|  1. Alice logs in to Bank                3. Alice visits Attacker Phishing Page   |
|     (http://localhost:3000)                 (http://localhost:4000)               |
|            |                                           |                          |
|            v                                           v                          |
|    Receives Session Cookie              Auto-submits hidden POST form             |
|    (bank_session_id)                    Target: http://localhost:3000/transfer   |
|                                         Payload: recipient=ACC-9999&amount=1000   |
|                                                        |                          |
|                                4. Browser automatically attaches                  |
|                                   bank_session_id cookie!                         |
|                                                        |                          |
+--------------------------------------------------------|--------------------------+
                                                         |
                                                         v
                                     +---------------------------------------+
                                     |         Bank Server (:3000)           |
                                     |                                       |
                                     | [Vulnerable Mode]:                    |
                                     |   Cookie valid? YES.                  |
                                     |   Funds transferred to Attacker! ❌   |
                                     |                                       |
                                     | [Mitigated Mode]:                     |
                                     |   Valid CSRF Token present? NO.       |
                                     |   Rejected with HTTP 403 Forbidden! 🛡️|
                                     +---------------------------------------+
```

---

## 2. Table 2 Requirements (Video & Viva Coverage)

### (a) Vulnerable Implementation
- **Location:** [`bank-server/index.js`](file:///c:/Users/neel/Desktop/CS/labassignment/bank-server/index.js) (lines 183–263, `app.post('/transfer')`)
- **Code Flaw:**
  ```javascript
  // In Vulnerable Mode (csrfProtectionEnabled === false)
  app.post('/transfer', requireAuth, (req, res) => {
    // Server checks ONLY session authentication:
    const sender = users[req.session.user.username];
    const { recipient, amount } = req.body;
    
    // Executes state change without verifying whether request was initiated intentionally by user:
    sender.balance -= parseFloat(amount);
    res.redirect('/dashboard?success=Transferred...');
  });
  ```
  The server solely verifies the presence of a valid `bank_session_id` session cookie. Because HTTP requests are stateless, the server mistakenly assumes any request presenting Alice's session cookie represents Alice's genuine intent.

### (b) Working Exploit
- **Location:** [`attacker-server/views/index.html`](file:///c:/Users/neel/Desktop/CS/labassignment/attacker-server/views/index.html)
- **Exact Attack Payload:**
  ```html
  <!-- Hidden Form hosted on http://localhost:4000 -->
  <form id="csrfExploitForm" action="http://localhost:3000/transfer" method="POST" style="display: none;">
    <input type="hidden" name="recipient" value="ACC-9999" />
    <input type="hidden" name="amount" value="1000" />
  </form>

  <!-- Auto-submitting JavaScript execution -->
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Submits the form automatically without requiring victim interaction
      document.getElementById('csrfExploitForm').submit();
    });
  </script>
  ```
- **How it runs:** When authenticated victim Alice is enticed to open `http://localhost:4000`, the page automatically fires this cross-site POST request to `http://localhost:3000/transfer`. The browser automatically includes the `bank_session_id` cookie. Charlie's account (`ACC-9999`) is credited $1,000 without Alice ever submitting the bank's transfer form.

### (c) Root Cause
1. **Ambient Authority (Automatic Credential Inclusion):** Browsers automatically attach stored cookies scoped to a target domain whenever an HTTP request is made to that domain, regardless of which origin initiated the request.
2. **Missing Proof of User Intent:** The vulnerable server assumes that authentication equals authorization of intent. It executes state-changing mutations without requiring a secret, unpredictable value known only to the legitimate client origin.

### (d) Implemented Mitigation
- **Mitigation Choice:** **Synchronizer Token Pattern (Session-Bound Anti-CSRF Token)**.
- **Implementation in [`bank-server/index.js`](file:///c:/Users/neel/Desktop/CS/labassignment/bank-server/index.js):**
  1. **Token Generation:** Upon login or session initialization, the server generates a cryptographically secure random token and stores it in the user's session:
     ```javascript
     req.session.csrfToken = crypto.randomBytes(24).toString('hex');
     ```
  2. **Token Injection:** The legitimate banking dashboard form includes the token in a hidden input:
     ```html
     <input type="hidden" name="_csrf" value="<%= sessionCsrfToken %>" />
     ```
  3. **Strict Server-Side Validation:** When `POST /transfer` is received:
     ```javascript
     const submittedCsrfToken = req.body._csrf || req.headers['x-csrf-token'];
     if (!submittedCsrfToken || submittedCsrfToken !== req.session.csrfToken) {
       return res.status(403).send('403 Forbidden: CSRF Attack Blocked!');
     }
     ```
- **Mitigation Demonstration (Blocked Attempt):**
  When the attacker on `http://localhost:4000` attempts the exact same auto-submitting POST request:
  - Because of the browser's **Same-Origin Policy (SOP)**, the attacker's script cannot read the DOM of `http://localhost:3000` to steal Alice's CSRF token.
  - The forged request lacks the valid `_csrf` token.
  - The server immediately blocks the request with **HTTP 403 Forbidden**, logs a security alert, and Alice's balance remains untouched ($4,000.00).

### (e) Other Mitigations (Theory)
As discussed in lecture slides, alternative defense mechanisms include:
1. **SameSite Cookie Attribute:**
   - `SameSite=Strict`: The browser never sends the cookie on any cross-site request (including top-level links).
   - `SameSite=Lax`: Cookies are withheld on cross-site subrequests and cross-site state-changing POST requests, while sent only on safe top-level navigations (e.g., clicking a link).
   - *Why it works:* Enforces at the browser layer that ambient credentials will not travel with cross-site form submissions.
2. **Re-Authentication / Step-Up Authentication for Sensitive Actions:**
   - Requiring the user to re-enter their password, provide a One-Time Password (OTP / 2FA), or complete a CAPTCHA before executing critical transactions (e.g. money transfer or password changes).
   - *Why it works:* An automated cross-origin CSRF payload cannot guess or forge dynamic user credentials.
3. **Avoiding State-Changing GET Requests (Idempotency):**
   - Strictly adhering to RFC 7231 / REST guidelines where `GET`, `HEAD`, and `OPTIONS` must remain safe and idempotent (read-only). State mutations must only be accepted via `POST`, `PUT`, or `DELETE`.
   - *Why it works:* Eliminates trivial GET-based CSRF attacks embedded inside simple `<img>`, `<script>`, or `<iframe>` tags (`<img src="http://bank.com/transfer?amt=1000">`).
4. **Verifying Origin & Referer Headers:**
   - Inspecting the `Origin` or `Referer` HTTP request headers to verify that the request originated from `http://localhost:3000`. If the origin is missing or points to a third-party domain (e.g. `http://localhost:4000`), the request is rejected.

---

## 3. Quick Start & Execution Guide

### Prerequisites
- Node.js (v18+ or v24+ installed)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Both Servers (Single Command)
```bash
npm start
```
*Outputs:*
- 🏦 **Bank Application (Victim):** `http://localhost:3000`
- ☠️ **Attacker Page (Malicious):** `http://localhost:4000`

*(Alternatively, you can run `npm run bank` and `npm run attacker` in separate terminal windows.)*

### 3. Run Automated Verification Test Suite
To verify the complete exploit and mitigation lifecycle via CLI:
```bash
npm test
```
*(Runs [`test_csrf.js`](file:///c:/Users/neel/Desktop/CS/labassignment/test_csrf.js), validating login, successful exploitation in vulnerable mode, toggle of defense, and rejection with HTTP 403 in mitigated mode.)*

---

## 4. Step-by-Step Video Demonstration Script (2–3 Minutes)

Use this script during your screen recording with voiceover:

| Step | Action on Screen | Voiceover / Narration Script |
| :--- | :--- | :--- |
| **1. Intro (0:00 - 0:25)** | Show `README.md` and terminal running `npm start`. Navigate to `http://localhost:3000/login`. | *"Hello, I am Neel demonstrating Variant 2 of Cross-Site Request Forgery: POST-based forged action using an auto-submitting form. Here, our Bank application is running on port 3000, and our attacker origin is hosted on port 4000."* |
| **2. Login & Vulnerable State (0:25 - 0:50)** | Click "Victim: Alice ($5,000)" and sign in. Highlight the top banner: **VULNERABLE (CSRF Protection OFF)**. Show initial balance: $5,000.00. | *"I log in as the victim, Alice. Alice has $5,000. Notice our security banner shows that CSRF protection is currently disabled. In this state, the server accepts state-changing POST requests purely based on the session cookie."* |
| **3. The Attack (0:50 - 1:25)** | In a new tab, navigate to `http://localhost:4000`. Pause or show the countdown. Click 'Inspect Code' to display the hidden POST form. Let it fire or click 'Fire Exploit Now'. | *"Now, Alice is tricked into visiting a malicious phishing website on port 4000. Hidden inside this page is an auto-submitting HTML form targeting the bank's transfer endpoint with recipient Charlie (ACC-9999) and amount $1,000. Notice that Alice does not have to click anything; the JavaScript auto-submits the form immediately."* |
| **4. Exploit Evidence (1:25 - 1:50)** | Show the bank dashboard. Balance has dropped to **$4,000.00**. Highlight the transaction ledger row with badge `🚨 FORGED VIA CSRF`. | *"As you can see, Alice's balance instantly dropped to $4,000.00. The transaction ledger flags this transfer as forged via CSRF. The browser attached Alice's session cookie automatically, and the vulnerable server executed the transaction without proof of intent."* |
| **5. Mitigation (1:50 - 2:30)** | Click the 'Toggle Mitigation' switch. Banner turns green: **MITIGATED (CSRF Protection ON)**. Open `http://localhost:4000` again. Watch exploit fire. | *"Now, I activate the mitigation: the Synchronizer Token Pattern. The server now binds a cryptographically random anti-CSRF token to Alice's session. When we visit the attacker site again on port 4000, the auto-submitting form fires, but the server immediately rejects it with HTTP 403 Forbidden: Invalid or Missing CSRF Token."* |
| **6. Verification & Wrap-up (2:30 - 2:55)** | Click 'Return to Bank Dashboard'. Show that Alice's balance is **still $4,000.00** (no funds lost). Make a legitimate transfer to Bob with the token. | *"Returning to the dashboard, Alice's balance remains safe at $4,000. Finally, making a legitimate transfer from the bank's UI succeeds because the form includes the valid session token. This concludes the demonstration."* |

---

## 5. Comprehensive Viva Preparation (Q & A)

Be prepared to answer these questions during the individual viva:

### Q1: What is Cross-Site Request Forgery (CSRF)?
> **Answer:** CSRF is an attack where a malicious website causes a victim's web browser to perform unwanted state-changing actions on a trusted web application in which the victim is currently authenticated.

### Q2: Why did the POST-based exploit succeed without the user clicking anything?
> **Answer:** In Variant 2, the attacker page contains a standard HTML `<form method="POST" action="...">` with hidden `<input>` elements. Using JavaScript (`window.onload = () => form.submit()`), the form is submitted automatically upon page load. The browser treats this as a regular form submission and attaches all cookies scoped to the target origin (`http://localhost:3000`), including `bank_session_id`.

### Q3: Why does the Synchronizer Token Pattern stop CSRF?
> **Answer:** Synchronizer tokens are unpredictable, cryptographically strong random values generated on the server and stored in the user's session. When a legitimate form is rendered, the token is embedded. Because the browser's **Same-Origin Policy (SOP)** prevents the attacker's script on `http://localhost:4000` from reading the DOM or headers of `http://localhost:3000`, the attacker cannot know or include Alice's CSRF token. When the server validates the incoming request, the missing or mismatched token causes immediate rejection (HTTP 403).

### Q4: Why don't CORS or the Same-Origin Policy (SOP) protect against CSRF forms by default?
> **Answer:** SOP restricts cross-origin JavaScript from *reading* responses, but does *not* prevent browsers from *writing* or *submitting* requests (like standard HTML `<form>` POST submissions). Simple form POST submissions do not trigger CORS preflight (`OPTIONS`), so the request reaches the server and executes state mutations before any browser check.

### Q5: What is the difference between `SameSite=Strict`, `SameSite=Lax`, and `SameSite=None`?
> **Answer:**
> - `SameSite=Strict`: Cookies are never sent in any cross-site context, not even when following regular links from external sites.
> - `SameSite=Lax`: Cookies are withheld on cross-site state-changing requests (such as POST forms), but sent on top-level safe GET navigations (e.g. clicking a link to the bank).
> - `SameSite=None`: Cookies are sent on all cross-site requests, provided `Secure` is enabled (HTTPS).

### Q6: If SameSite cookies exist, why do we still need Anti-CSRF tokens?
> **Answer:**
> 1. Defense-in-depth: Older browsers or HTTP clients may not support SameSite.
> 2. `SameSite=Lax` allows GET requests to carry cookies; if any sensitive state-changing endpoint accidentally allows GET or method-override, CSRF is possible.
> 3. Subdomain takeover or sibling domain vulnerabilities can compromise `SameSite` cookies if domain cookies are shared across subdomains. Synchronizer tokens provide strong application-layer isolation.

---

## 6. Project Structure
```
labassignment/
├── package.json               # Dependencies and scripts (npm start, npm test)
├── server.js                  # Master launcher spawning both Bank and Attacker
├── test_csrf.js               # Automated verification test suite
├── README.md                  # Complete documentation, ownership table, viva guide
├── bank-server/               # Target Application (Victim Web App :3000)
│   ├── index.js               # Express server, session, /transfer endpoint, CSRF logic
│   ├── views/
│   │   ├── login.html         # User sign-in with quick-fill credentials
│   │   └── dashboard.html     # Banking dashboard, live toggle, transaction ledger
│   └── public/
│       └── style.css          # Modern dark-mode fintech stylesheet
└── attacker-server/           # Malicious Application (Attacker Origin :4000)
    ├── index.js               # Attacker Express server
    ├── views/
    │   └── index.html         # Phishing lure + auto-submitting POST form + HUD
    └── public/
        └── style.css          # Attacker styling and HUD layout
```

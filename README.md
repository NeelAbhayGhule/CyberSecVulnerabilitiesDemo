# CSRF Variant 2: POST-Based Forged Action

**Course:** Cyber Security (IT-30001) | IIIT Allahabad  
**Instructor:** Dr. Soumyadev Maity

---

## Table 3. Ownership Declaration

| Member Name | Roll Number | Vulnerability Category | Variant Implemented |
| :--- | :--- | :--- | :--- |
| **Neel** | IIT2024266 | Cross-Site Request Forgery (CSRF) | **POST-based forged action using an auto-submitting form** |
| **Adith Reganti** | IIT2024249 | SQL Injection | **UNION-based data extraction** |
| **Paras Pandey** | IIT2024235 | OS Command Injection | **In-band (command output returned) and Blind (time-based or out-of-band)** |
| **Anubhav Sharma** | IIT2024234 | Cross-Site Scripting (XSS) | **Stored XSS** |

---

## Quick Start and Port Architecture

```bash
npm install
npm start
```

The application runs two web servers simultaneously:

1. **Port 3000 — Victim Origin:** `http://localhost:3000`
   - Hosts the Apex Bank web portal, representing Alice's authenticated banking session with an initial balance of **$5,000**.
   - Provides a transaction audit ledger, a CSRF protection toggle, and a system architecture overview.

2. **Port 4000 — Attacker Origin:** `http://localhost:4000`
   - Hosts the simulated malicious website controlled by Attacker Charlie.
   - Displays a deceptive prize page and the forged POST form used in the CSRF demonstration.
   - Includes pause and trigger controls so the exploit can be demonstrated deliberately during the video and viva.

### Why are two ports used?

A web origin is defined by its **scheme (protocol), host, and port**. Therefore, `http://localhost:3000` and `http://localhost:4000` are different origins. This separation is used to demonstrate a cross-origin request in the CSRF scenario.

---

## Table 2 Requirements: CSRF Demonstration

### (a) Vulnerable Implementation

**File:** `server.js` — route `POST /transfer`

In vulnerable mode, the transfer endpoint processes the submitted recipient and amount without requiring a valid CSRF token. The application therefore does not verify that the state-changing request was intentionally initiated through the legitimate bank form.

### (b) Working Exploit

**File:** `server.js` — attacker route on port 4000

The attacker page contains a form that submits a POST request to the bank's `/transfer` endpoint. The form supplies the recipient and transfer amount, and JavaScript submits it automatically when the countdown completes.

```html
<form id="csrfForm"
      action="http://localhost:3000/transfer"
      method="POST">
  <input type="hidden" name="recipient" value="Attacker_Charlie">
  <input type="hidden" name="amount" value="1000">
</form>

<script>
  document.getElementById('csrfForm').submit();
</script>
```

In the updated application, the page also provides a pause control and a manual trigger button to support a controlled live demonstration.

### (c) Root Cause

The vulnerability results from two conditions:

1. **Ambient authority:** A browser may automatically include a matching session cookie with a request.
2. **Missing intent validation:** In vulnerable mode, the server accepts a state-changing request without requiring a valid, unpredictable CSRF token.

### (d) Implemented Mitigation

**Mitigation:** Synchronizer Token Pattern (CSRF token).

The application implements the following checks:

1. The server generates a random token and stores it in `req.session.csrfToken`.
2. The legitimate bank transfer form embeds that session-bound token.
3. The `POST /transfer` route checks that the submitted `req.body._csrf` value exists and matches `req.session.csrfToken`.
4. When protection is enabled, a missing or invalid token results in **HTTP 403 Forbidden**, and the transfer is not processed.

The attacker's form does not include the legitimate token. The Same-Origin Policy generally prevents scripts on the attacker origin from reading the bank page's DOM to obtain the token, while still allowing a standard cross-origin HTML form submission to be initiated.

### (e) Other Mitigations

- **SameSite cookies:** `SameSite=Strict` or `SameSite=Lax` can restrict when cookies accompany cross-site requests. Exact behavior depends on the setting and request context.
- **Re-authentication for sensitive actions:** Require confirmation, such as a password or one-time password (OTP), before high-impact operations.
- **Avoid state-changing GET requests:** GET requests should not perform actions such as financial transfers. State-changing operations should use appropriate methods and CSRF protections.

---

## Video Demonstration Workflow

1. Open `http://localhost:3000`. Confirm the initial balance is **$5,000** and CSRF protection is **OFF**.
2. Open `http://localhost:4000` in a new tab. Pause the countdown to explain the attacker form and its POST target.
3. Trigger the attack. Show the successful $1,000 transfer to `Attacker_Charlie`, then return to the bank and confirm the balance is **$4,000**.
4. Return to the bank and enable **PROTECTED** mode.
5. Open the attacker page again and trigger the same request.
6. Show the **HTTP 403 Forbidden** response and confirm that the bank balance remains **$4,000**.

For a clear before-and-after demonstration, reset the application only at the beginning. Do not reset the balance after the first successful attack.

---

## Expected Demonstration Results

| Stage | CSRF Protection | Expected Result |
| :--- | :--- | :--- |
| Initial state | OFF | Balance is $5,000 |
| After forged request | OFF | Transfer succeeds; balance becomes $4,000 |
| Protection enabled | ON | Balance remains $4,000 |
| Same forged request repeated | ON | HTTP 403 Forbidden; balance remains $4,000 |

---

## Automated Verification

The file `test_csrf.js` provides automated verification of the server-side behavior. It establishes a session, submits a forged POST request without a CSRF token while protection is disabled, enables protection, and submits the same request again.

The expected outcome is that the first request succeeds and the second request is rejected with **HTTP 403 Forbidden**. This test verifies the server's validation behavior; it does not reproduce every browser-specific cookie or Same-Origin Policy behavior.

Run the test with the server already running:

```bash
node test_csrf.js
```

---

## Implementation Notes

- The updated server does not define a `/login` route; begin the demonstration at `http://localhost:3000`.
- The demo configures `SameSite=None` and `Secure=true` and includes a localhost-specific connection workaround. Verify browser cookie behavior before recording. This workaround is for the local demonstration and is not a production security configuration.
- CSRF tokens should not be exposed to untrusted origins or displayed publicly in a production application.
- This project is an educational demonstration. Testing should be limited to the group's own application.

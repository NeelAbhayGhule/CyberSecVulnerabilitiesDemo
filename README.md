# CSRF Variant 2: POST-Based Forged Action
**Course:** Cyber Security (IT-30001) | IIIT Allahabad  
**Instructor:** Dr. Soumyadev Maity  

---

## Table 3. Ownership Declaration
| Member Name | Roll Number | Category | Variant Implemented |
| :--- | :--- | :--- | :--- |
| **Neel** | *(Roll Number)* | Cross-Site Request Forgery (CSRF) | **Variant 2: POST-based forged action (auto-submitting form)** |
| *(Member 2)* | *(Roll No)* | SQL Injection | *(Variant selected)* |
| *(Member 3)* | *(Roll No)* | OS Command Injection | *(Variant selected)* |
| *(Member 4)* | *(Roll No)* | Cross-Site Scripting (XSS) | *(Variant selected)* |

---

## Quick Start
```bash
npm install
npm start
```
- **Bank App (Victim):** `http://localhost:3000` (Alice's account, Balance: $5,000)
- **Attacker Site:** `http://localhost:4000`

---

## Table 2 Requirements (Viva & Video Summary)

### (a) Vulnerable Implementation
- **File:** `server.js` (Route: `POST /transfer`)
- **Flaw:** The server executes fund transfers relying solely on the session cookie (`bank_session_id`). It never checks if the request was intentionally initiated by the user.

### (b) Working Exploit
- **File:** `server.js` (Attacker Route on Port 4000)
- **Payload:** A hidden HTML form that auto-submits via JavaScript upon page load:
  ```html
  <form id="f" action="http://localhost:3000/transfer" method="POST">
    <input type="hidden" name="recipient" value="ACC-9999" />
    <input type="hidden" name="amount" value="1000" />
  </form>
  <script>document.getElementById('f').submit();</script>
  ```

### (c) Root Cause (In 2 Lines)
1. **Ambient Authority:** The browser automatically attaches stored cookies to cross-origin requests.
2. **Missing Intent Check:** The server trusts the cookie without verifying user intent via an unpredictable secret token.

### (d) Implemented Mitigation
- **Fix:** **Synchronizer Token Pattern (CSRF Token)**.
- **How it works:** 
  1. Server generates a random token (`req.session.csrfToken`) bound to the user's session.
  2. The legitimate bank transfer form embeds this token.
  3. `POST /transfer` verifies `req.body._csrf === req.session.csrfToken`.
  4. If missing/invalid, the server rejects with **HTTP 403 Forbidden**.
- **Why the attack fails:** Under the **Same-Origin Policy (SOP)**, the attacker's script on port 4000 cannot read the bank's page on port 3000, so it cannot include the token.

### (e) Other Mitigations (Theory)
1. **SameSite Cookies:** Setting `SameSite=Strict` or `Lax` tells the browser not to send cookies on cross-site POST requests.
2. **Re-authentication:** Prompting for password, OTP, or CAPTCHA on sensitive actions.
3. **Safe GET Requests:** Ensuring `GET` requests never make state changes (financial transfers).

---

## 2-Minute Video Narration Cheat Sheet

1. **Step 1:** Open `http://localhost:3000/login`, log in as Alice ($5,000 balance). Show banner: **Vulnerable (OFF)**.
2. **Step 2:** In a new tab, open `http://localhost:4000`. Show the hidden form auto-submitting.
3. **Step 3:** Switch back to Bank. Balance drops to **$4,000**, ledger shows `🚨 FORGED VIA CSRF`.
4. **Step 4:** Flip the **Toggle Mitigation** switch to **ON** (banner turns green).
5. **Step 5:** Re-visit `http://localhost:4000`. Show the transfer blocked with **HTTP 403 Forbidden**.
6. **Step 6:** Return to Bank. Balance remains safe at **$4,000**.

---

## Viva Q&A (Short & High-Yield)

**Q1: What is CSRF?**  
> An attack where an unauthorized website tricks an authenticated user's browser into executing an unwanted action on a trusted web app.

**Q2: Why does the POST exploit work without user clicks?**  
> JavaScript (`form.submit()`) submits the form automatically on page load. The browser automatically attaches Alice's stored session cookie.

**Q3: Why doesn't Same-Origin Policy (SOP) block the form submission?**  
> SOP blocks external scripts from *reading* responses across origins, but does not block browsers from *sending* standard HTML form requests.

**Q4: How does the CSRF token defend against this?**  
> The token is stored in the session and embedded in the authentic form. Because SOP prevents the attacker from reading port 3000's DOM, the attacker cannot steal the token, causing the forged request to be rejected.

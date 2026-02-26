# SUKODA Client Portal Audit

**Date:** 2026-02-26  
**Scope:** Magic Link auth, onboarding, pause/resume, portal UI  
**Method:** Code review of `functions/index.js`, `minu.html`, `firestore.rules`, `firebase.json`, `functions/lib/config.js`

---

## A) Executive Summary

**Top 2 risks (security/privacy):**
1. **Token in URL + Referrer leak** — Email link `https://sukoda.ee/minu?token=xxx` can leak via Referer header on same-origin fetch; token persists in browser history until `replaceState` runs.
2. **Pause does not affect Stripe** — User pays full subscription during pause while visits are cancelled; high trust violation and support burden.

**Top 2 UX/friction issues:**
1. **Token expiry never renews on regular use** — Expiry extends only when user clicks email link (`validatePortalToken`). Daily use via localStorage leads to expiry after 30 days from last email click.
2. **"Muuda aega" (Reschedule) buttons are non-functional** — Overview and Visits tabs show reschedule buttons with no `@click` handler; users cannot actually reschedule.

**1 thing unusually well done:**
- **No enumeration in magic-link** — Always returns `{ sent: true }` regardless of email existence; rate-limited (3/5 min per IP); Firestore rules deny all client access so tokens/orders never exposed directly.

---

## B) Security & Privacy Review (Ranked)

### 1. Token in URL — Referrer and history exposure
**Severity:** High  
**Scenario:** User clicks email link. Page loads, `init()` runs `fetch('/api/auth/validate', { body: { token } })`. Same-origin fetch sends `Referer: https://sukoda.ee/minu?token=xxx` to the API. Token can also persist in browser history until `replaceState` runs.  
**Evidence:** `minu.html` L57–71: token read from URL, fetch before `replaceState`. No `Referrer-Policy` on page.  
**Minimal fix:** Add `<meta name="referrer" content="no-referrer">` to `minu.html` head. Consider moving token exchange to a dedicated `/auth/callback` page that redirects to `/minu` with no token in URL after exchange.

---

### 2. Pause vs billing mismatch
**Severity:** High (operational / trust)  
**Scenario:** Customer pauses for 30 days. Stripe continues charging. Cal.com bookings cancelled. Customer expects not to pay during pause.  
**Evidence:** `pauseSubscription` (L4939–4943) updates only Firestore `pausedAt`, `pauseExpiresAt`, `pauseReason`. No Stripe API calls. `autoScheduleVisits` skips paused orders (L1876).  
**Minimal fix:** Document clearly in UI: "Tellimus jätkub tasumisega. Visiidid peatatakse." Add Stripe subscription pause when feasible (Stripe supports `subscription_schedule` or `pause_collection`). **Smaller alternative:** Add prominent copy: "Pausil olev tellimus jätkab tasumisega. Visiidid taastuvad pärast jätkamist."

---

### 3. Token expiry renewal only on email-link use
**Severity:** Medium  
**Scenario:** User uses portal daily via localStorage. Token never hits `validatePortalToken`, so `sessionTokenExpiresAt` never refreshes. After 30 days from last email click, token expires and user is logged out unexpectedly.  
**Evidence:** `validatePortalToken` (L4714–4719) refreshes expiry; `authenticateClient` (L4672–4674) only checks expiry, does not update.  
**Minimal fix:** In `getClientProfile` (or a shared auth helper), after successful auth, extend `sessionTokenExpiresAt` by 30 days. Same pattern as validate.

---

### 4. localStorage token — XSS and device sharing
**Severity:** Medium  
**Scenario:** XSS (e.g. via third-party script or future CMS) could read `sukoda_portal_token` and exfiltrate. Shared device retains token until explicit logout.  
**Evidence:** `minu.html` L16, L70: token in `localStorage`. No `HttpOnly` alternative (not possible for client-side token).  
**Minimal fix:** Ensure CSP and script integrity; avoid loading untrusted scripts. Add "Log out from all devices" that invalidates token server-side (new hash, old hash rejected). **Smaller alternative:** Document that "Logi välja" clears local token only; add short note in UI about shared devices.

---

### 5. Rate limiting — in-memory and per-IP only
**Severity:** Medium  
**Scenario:** Cloud Functions scale to multiple instances. In-memory `rateLimitStore` is per-instance. Attacker can exceed 3 magic-link / 5 min by hitting different instances. Per-IP allows one IP to block others (e.g. office NAT).  
**Evidence:** `functions/lib/config.js` L51–69: `rateLimitStore = {}`, key = `${limitName}:${ip}`.  
**Minimal fix:** Use Firestore or Redis for rate-limit state. **Smaller alternative:** Add per-email rate limit in Firestore (e.g. `rateLimits/{hash(email)}` with `lastSent`, `count`) to cap magic-link sends per address.

---

### 6. Magic-link enumeration (mitigated)
**Severity:** Low (current design is good)  
**Scenario:** Attacker tries to discover if an email has a subscription.  
**Evidence:** `sendMagicLink` (L4756–4758) always returns `{ sent: true }` for valid emails; same for non-existent. Rate limit 3/5 min per IP.  
**Minimal fix:** None needed. Optional: add per-email limit (e.g. 1/hour) to reduce abuse.

---

### 7. Firestore rules — principle of least privilege
**Severity:** Low  
**Scenario:** Client could try to read/write Firestore directly.  
**Evidence:** `firestore.rules` L5–7: `allow read, write: if false` for orders. All access via Cloud Functions with admin SDK.  
**Minimal fix:** None. Current design is correct.

---

### 8. Replay and token theft
**Severity:** Low–Medium  
**Scenario:** Token stolen (screenshot, forwarded email, malware). Same token works until expiry or explicit invalidation.  
**Evidence:** Token is long-lived (30 days, renewed on validate). No one-time-use or binding to device/fingerprint.  
**Minimal fix:** Add "Log out from all devices" that rotates token (new hash, old invalidated). **Smaller alternative:** Shorten initial email-link validity (e.g. 24h) and issue a separate longer-lived session token on first validate.

---

### 9. Logging — what to log and what never to log
**Severity:** Low  
**Scenario:** Tokens or PII in logs could leak via log aggregation or support access.  
**Evidence:** Grep of `console.log/error` — no raw token or email in logs. `Order completed: orderId` and similar are safe.  
**Minimal fix:** Add explicit rule: never log `token`, `sessionTokenHash`, `email`, or full `req.body` for auth endpoints. Consider structured logging with redaction for `authorization` header.

---

## C) Product/UX Audit (Quiet Luxury + Trust)

**Does the flow feel discreet and membership-grade?**  
Mostly yes. Minimal nav, serif headings, cream/black palette, no loud CTAs. The "Minu SUKODA" framing and home profile questionnaire ("Aita meil sinu kodu paremini tundma õppida") support a personal, keys-to-home feel.

**Where does it feel like "SaaS dashboard"?**  
- Tab labels "Ülevaade", "Minu kodu", "Visiidid" are functional but generic.  
- Status badges ("Aktiivne", "Pausil") and "Logi välja" feel utilitarian.  
- Reschedule buttons that do nothing undermine trust.

**Microcopy suggestions (Estonian):**

| Context | Current | Suggested |
|---------|---------|-----------|
| 1) Email request screen | "Sisesta oma e-posti aadress ja saadame sulle sisselogimislingi." | "Sisesta oma e-post. Saadame sulle privaatse lingi oma SUKODA ruumi." |
| 2) Success after login | "Link saadetud!" / "Kontrolli oma e-posti." | "Kontrolli oma e-posti. Link saadetud." (calm, no exclamation) |
| 3) Pause confirmation | (none — immediate action) | After click: "Tellimus on pausil. Visiidid taastuvad, kui jätkad." |
| 4) Reschedule confirmation | (none) | After success: "Aeg uuendatud. Saadame meeldetuletuse." |

---

## D) Operational Integrity

### Pause vs billing
- **Mismatch:** Pause updates only Firestore and cancels Cal.com. Stripe subscription stays active. Customer is charged during pause.
- **Recommendation:** Either integrate Stripe pause (`subscription_schedule` or `pause_collection`) or make billing continuation very explicit in UI and terms.

### Cal.com cancellation/reschedule edge cases
- **Reschedule flow:** Cancel old Cal.com booking, create new one. If `createBooking` succeeds but Firestore update fails, Cal.com has new booking but Firestore has stale data.  
- **Double-booking:** Unlikely if cancel-then-create is sequential; Cal.com frees the slot on cancel.  
- **Lost booking:** If `cancelBooking` fails (L5062–5066), old Cal.com booking remains; new one may also be created. Manual reconciliation needed.  
- **Timezone:** `newStartTime` from client — ensure ISO string with timezone. Cal.com typically uses UTC; verify `calService.createBooking` handles correctly.

### Webhook delivery (Stripe)
- **Delayed:** Order may be `paid` in Stripe but not yet in Firestore. Customer could try portal before webhook. Magic-link would find no order. Retry logic in Stripe helps.  
- **Duplicated:** `handleCheckoutComplete` has no explicit idempotency. `Order already paid (webhook retry), skipping` (L830) suggests some handling. Verify that portal token generation and email send are inside a block that skips on retry, or add idempotency key.

### Multiple orders per email
- **Current behavior:** `sendMagicLink` uses `orderBy('paidAt', 'desc').limit(1)` — only the most recent subscription gets the link.  
- **Impact:** User with two subscriptions (e.g. main home + summer house) only accesses the latest.  
- **Recommendation:** Document this. If multi-order support is needed, add order selector after magic-link login.

---

## E) Priority Plan

### Do now (max 5)
1. **Add `Referrer-Policy: no-referrer`** to `minu.html` (or `<meta name="referrer" content="no-referrer">`).
2. **Extend token expiry in `getClientProfile`** (or `authenticateClient`) on successful auth — same 30-day refresh as `validatePortalToken`.
3. **Wire reschedule buttons** — Add `@click` to open reschedule flow (or link to Cal.com reschedule if that’s the design). If reschedule is not ready, hide or disable the buttons and add "Tuleb varsti".
4. **Clarify pause billing in UI** — Add copy: "Pausil olev tellimus jätkab tasumisega. Visiidid taastuvad pärast jätkamist."
5. **Add pause confirmation copy** — After successful pause, show: "Tellimus on pausil. Visiidid taastuvad, kui jätkad."

### Do next (max 5)
1. **Stripe pause integration** — Pause Stripe subscription when user pauses; resume when they resume. Reduces billing during pause.
2. **Per-email rate limit for magic-link** — Store in Firestore to prevent one email from being spammed across instances.
3. **"Log out from all devices"** — Rotate token server-side (new hash, invalidate old) so stolen tokens stop working.
4. **Idempotency for checkout webhook** — Ensure portal token + email are not sent twice on retry.
5. **Reschedule UX** — Implement full reschedule flow (calendar, time slots) or integrate Cal.com reschedule link.

### Nice later (max 5)
1. **Shorter-lived email link** — e.g. 24h for initial link; issue longer-lived session token on first validate.
2. **Multi-order support** — If a customer can have multiple subscriptions, add order selector after login.
3. **Distributed rate limiting** — Firestore or Redis for rate-limit state across function instances.
4. **CSP and script integrity** — Tighten Content-Security-Policy to reduce XSS risk for localStorage token.
5. **Structured logging with redaction** — Ensure auth-related fields are never logged.

---

*End of audit*

# The Council: Localhost Security Architecture (`docs/SECURITY.md`)

> **Security Posture:** Hardened Single-User Localhost Application  
> **Target Threat Model:** External malicious web pages, malicious scripts, DNS rebinding, secret exfiltration, prompt injection.

---

## 1. Threat Model for Localhost Web Applications

Even when an application binds to `localhost` and has no public domain or open internet port forwarding, it is subject to attacks originating from the browser when the user visits other websites:

1. **DNS Rebinding & Host Header Attacks:** An external malicious site (`attacker.com`) resolves its DNS to `127.0.0.1` after page load. JavaScript running on `attacker.com` then makes requests to `http://attacker.com:3000/api/v1/sessions` with `Host: attacker.com`, attempting to bypass the Same-Origin Policy.
2. **Cross-Site Request Forgery (CSRF / Cross-Origin Fetch):** A script on an arbitrary webpage issues `fetch('http://localhost:3000/api/v1/sessions')` or posts data.
3. **Secret Exfiltration (`GEMINI_API_KEY`):** Any exposure of API keys in client-side JS bundles, error responses, or logs could allow malicious browser extensions or inspection tools to steal credentials.
4. **Prompt Injection & Persona Boundary Escape:** User dilemmas or peer interactions containing meta-instructions attempting to break cognitive personas, hijack system instructions, or fabricate consensus votes.
5. **Path Traversal on Export / Backup Routes:** Malicious filenames in export requests attempting to read or write arbitrary filesystem paths (`../../etc/passwd` or `..\Windows\System32`).

---

## 2. Defensive Controls Implemented

### 2.1 Default Server Binding & LAN Opt-In
- The application server binds exclusively to loopback `127.0.0.1` by default.
- Binding to LAN (`0.0.0.0`) is disabled by default and requires explicit opt-in in `Settings` guarded by a generated local PIN / authentication token.

### 2.2 Host & Origin Verification Guard
A Next.js server middleware inspects every state-changing (`POST`, `PATCH`, `DELETE`) and stream (`GET /stream`) request:
- **Host Validation:** Verifies that the `Host` header strictly matches `localhost:3000` or `127.0.0.1:3000`. Rejects external hostnames (e.g. `attacker.com`), defeating DNS rebinding.
- **Origin Validation:** If an `Origin` or `Referer` header is present, it must begin with `http://localhost:3000` or `http://127.0.0.1:3000`. Rejects requests from any external origin with `403 Forbidden`.
- **Strict CORS:** No wildcard `Access-Control-Allow-Origin: *`.

### 2.3 Strict API Key Hygiene
- `GEMINI_API_KEY` is loaded strictly server-side into Node.js process environment from `.env.local` or OS secret store.
- Never prefixed with `NEXT_PUBLIC_`.
- Bundle scanning tests verify `.next/static` contains 0 instances of the user's API key.
- `POST /api/v1/settings/test-key` tests key validity with Gemini's models endpoint and returns strictly `{ valid: true | false }` without echoing the key or parts of it.

### 2.4 Content Security Policy (CSP) & Security Headers
Configured in `next.config.ts` headers:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 2.5 Input Sanitization & Path Traversal Defense
- Deliberation queries sanitized with XML entity encoding (`<` -> `&lt;`, `>` -> `&gt;`) inside `<deliberation_subject>`.
- Export filename paths generated strictly using sanitized session IDs without user-supplied directory segments (`path.basename()` enforced).

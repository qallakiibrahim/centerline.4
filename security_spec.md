# Security Specification for Centerline Pro

This document defines the security boundaries, data invariants, and target penetration payloads ("Dirty Dozen") for the Firestore database in **Centerline Pro**.

---

## 🔒 1. Data Invariants

1. **Authenticated Access Only:** Only signed-in, email-verified users can read or write app state in the `/app_state` collection.
2. **Key Integrity:** The `documentId` (or document field `key`) must be a valid ID matching our strict pattern: small alphanumeric characters and lowercase words (e.g., `points`, `layout`, `definitions`, `recipes`, `hierarchy`, `backgrounds`, `history`).
3. **Immutable Property Protection:** Once set, the key field itself should be immutable.
4. **Valid Values:** The `value` field must be a valid, non-empty object map or array structure.

---

## ☣️ 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent malicious or invalid database transactions that must be definitively rejected by our security rules.

### Playloads 1 & 2: Identity & Authentication Violations
1. **Unauthenticated Read:** Any read command to `/app_state/{docId}` without a `request.auth` credential.
2. **Unauthenticated Write:** An anonymous or unauthenticated write to `/app_state/{docId}`.
3. **Unverified Email Signup:** A write attempt by a signed-in user whose `email_verified` flag is `false`.

### Payloads 4 to 8: ID Poisoning & Injection
4. **Massive Key Poisoning:** Creating a document with a massive 1MB string key `docId` (e.g., `points_` + 10,000 characters).
5. **Special Characters Key Injection:** Injecting a key containing system control characters or paths (e.g., `../dangerous/inject`).

### Payloads 9 to 12: Value Poisoning & Scheme Violations
6. **No Value Field:** Creating/updating a state item where `value` is omitted.
7. **String instead of Object:** Trying to write `value` as a raw primitive non-object/array string.
8. **Null/Empty Key:** Writing an empty key or key not matched by the allowed list of configuration strings.

---

## 🧬 3. Rule Architecture Definition

We will generate mathematically precise rules in `/firestore.rules` containing:
- Standalone helper functions like `isValidAppState(data)` and `isValidId(id)`.
- A global catch-all deny.
- Read/Write checks verifying `request.auth.token.email_verified == true`.

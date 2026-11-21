# Architecture

## Principles

1. **Local-first.** All records live on the user's devices in an encrypted IndexedDB database.
   The device is the source of truth.
2. **The server is a relay, not a store.** It forwards end-to-end encrypted messages between
   family devices and deletes them once every device has acknowledged them, or after 7 days.
3. **No images or audio are stored on the server.** Photos are processed on the device. If the
   LLM must see an image, it is sent once, held only in memory, and discarded.
4. **On-device first, LLM only when needed.** OCR, speech-to-text, date parsing and rule-based
   classification run on the device. The LLM receives extracted _text_ only when on-device
   confidence is low.
5. **Backups belong to the user.** An encrypted backup goes to the user's own Google Drive
   (hidden app-data folder, `drive.appdata` scope only).
6. **Pay-per-use only.** No always-on servers, so idle cost is close to $0.

## Components

```
 Phone (PWA)                                   AWS (ap-south-1)
 ┌───────────────────────────────┐             ┌──────────────────────────────┐
 │ React UI                      │   HTTPS     │ CloudFront + S3 (app files)  │
 │ OCR (Tesseract, Web Worker)   │◀───────────▶│                              │
 │ Rules engine + date parser    │             │ API Gateway (throttled)      │
 │ Encrypted IndexedDB           │   JWT       │   ├─ Lambda: LLM extraction ─┼──▶ LLM API
 │ Service worker (push, offline)│────────────▶│   ├─ Lambda: relay send/ack  │    (Gemini in
 └──────────┬────────────────────┘             │   ├─ Lambda: push schedule   │     test, Claude
            │ drive.appdata                    │   └─ Lambda: family/billing  │     Haiku in prod)
            ▼                                  │ DynamoDB (TTL)               │
   User's Google Drive                         │ EventBridge Scheduler → Push │
   (encrypted backup)                          │ Cognito (Google sign-in)     │
                                               └──────────────────────────────┘
```

## Key decisions

| Topic           | Decision                                                                                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reminders       | Browsers cannot schedule local notifications, so the device registers an encrypted "push at time T" entry. The server sends the push via Web Push (VAPID) and deletes the entry. The server cannot read the payload.                                        |
| Encryption keys | One AES-GCM family key. It is shared with new members through the invite link's URL fragment, which never reaches the server. It is wrapped with a user recovery passphrase for Drive backup. Losing the passphrase and all devices means the data is gone. |
| Identity        | Cognito user pool with Google as the identity provider. The Drive access token is requested separately in the browser (Google Identity Services) and never sent to our server.                                                                              |
| LLM             | A provider-agnostic interface in `backend/`. The provider is chosen by configuration: Gemini free tier with test data only, Claude Haiku before real users.                                                                                                 |
| Secrets         | SSM Parameter Store SecureString (free), instead of Secrets Manager ($0.40 per secret per month).                                                                                                                                                           |
| Environments    | `dev` and `prod` stacks in one AWS account, separated by name prefix and tags.                                                                                                                                                                              |
| Region          | `ap-south-1` (Mumbai), to keep Indian users' data in India.                                                                                                                                                                                                 |
| Shared contract | `shared/src/extraction.ts` defines `ExtractionResult`. On-device rules and the LLM must both produce exactly this shape, validated with zod.                                                                                                                |

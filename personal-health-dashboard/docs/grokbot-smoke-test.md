# Phase 0 — Grokbot outbound POST smoke test

Before relying on Grokbot for daily capture, verify it can call an HTTPS endpoint.

## Steps

1. Pick any temporary HTTPS echo service you trust, or use the deployed app’s motivation endpoint once it exists.
2. Ask your Grokbot (in chat):

```text
Store nothing secret in chat. Using your terminal, run a single curl POST
to https://httpbin.org/post with header Authorization: Bearer smoke-test
and JSON body {"ping":true,"source":"grokbot-smoke"}. Report only HTTP
status and whether the JSON echoed back. Do not print any real tokens.
```

3. Expected: HTTP 200 and confirmation that the body was received.
4. If that fails (network policy, missing shell, etc.), use the in-app motivation form until outbound POST works.

## After the app is deployed

Repeat against:

`POST $APP_BASE_URL/api/ingest/motivation`

with the real write-only bearer token stored only on the Bot computer (env file), never pasted into chat.

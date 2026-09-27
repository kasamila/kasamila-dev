# SDK 2.1 protected package

[中文](sdk_2_1_protected_runtime.md)

Version: SDK 2.1.0, sealed with an independent production secret.
Check /api/v1/system/version and /api/v1/runtime/releases for actual deployment/health.
Scope: encrypted assets and temporary authorization; stop on failure. No watermark or fallback player.

## AILIVE upgrade

1. Set client.sdk_version=2.1.0, update_policy=pinned and required_capabilities including
   geometry-v7, hls, protected-runtime-v1 and license-grant-v1 on your backend.
2. Forward sdk and client_token unchanged; use loadKasamila(sdk, apiBase).
   Do not copy models/rendering source or hardcode the old SDK URL. Load a new version in a fresh document/iframe.
3. Keep templateMedia and your original HLS/transparent media; no geometry retraining is needed.
4. The SDK licenses automatically. AILIVE must not hold the package encryption secret.
   Preserve API connect-src, WASM compilation and existing worker-src blob: CSP permissions.
5. Treat loading failures as errors, release sessions and never silently fall back to an old/plaintext engine.
   Test C/G/H/I, seek/loop, IDLE, transparency and Agent audio receipts.

The example defaults to 2.1.0 with the same public API calls. API paths stay /api/v1.
Pinned 2.0.0 sessions remain supported; this release does not invalidate existing fixed-version integrations.

## What is protected

The builder extracts V7 GLSL and encrypts shaders and individual ONNX models with AES-256-GCM.
A small WASM module validates the package envelope; WebCrypto performs decryption.
V7 mesh scheduling and audio control mapping remain JavaScript; ONNX Runtime Web still executes models.
This does not mean the full renderer has been ported to WASM and is not DRM.
Only the selected model is downloaded. C/G/H share a model; the I Worker receives decrypted model bytes.

The existing Runtime Token authorizes POST /api/v1/runtime/license-grants.
The server checks the active lease, Origin, template access, pinned package, key fingerprint and rate limit.
P-256 ECDH, HKDF-SHA256 and AES-GCM wrap the content key for an ephemeral client public key.
A grant lasts at most 120 seconds, never beyond the lease; it is used to obtain the key at initialization.
It does not reload models every 120 seconds. Existing Runtime lifetime rules remain authoritative.
Keys and plaintext models are not persisted by the SDK.

Initialization or profile-switch decryption failure stops media and rendering and ends the lease.
There is no plaintext model fallback. Authenticated HTTPS, pinned package hashes, integrity hashes and AEAD
bindings provide this implementation's integrity/authentication checks; no separate signing service was added.
An authorized user can still inspect browser memory and shaders. This is a commercial access barrier.

## Release prerequisites

Provision an independent random 32-byte Base64 secret through approved secret management:

- GitHub Actions secret: KASAMILA_SDK_PACKAGE_KEY.
- API service environment: KASAMILA_SDK_PACKAGE_KEY, identical to the package build secret.

Do not reuse authentication secrets, commit keys, print them or use the test fixture key.
CI supports secret injection and builds 2.1.0 by default; default new API sessions use 2.1.0.
Missing or mismatched keys reject session creation before a billable lease is allocated.
Never rotate an already published package in place. This minimal implementation uses one root secret;
multi-key rotation is not implemented.

With the production secret configured, build and seal:

    python scripts/build_sdk_release.py --version 2.1.0 --create-lock

2.1.0 is registered as supported/default/stable with capabilities matching its sealed lock.
Validate future candidates before promoting channels; synchronize request defaults, Portal and public examples.
Do not reuse the test-generated lock. Deployment needs API/Web only, not Worker or geometry retraining.
Existing 2.0.0 packages remain immutable. Retiring publicly available plaintext versions requires
an explicit customer migration policy; this implementation does not silently revoke their support.

Third-party clients request client.sdk_version=2.1.0 and update_policy=pinned,
with protected-runtime-v1 and license-grant-v1 capabilities.
Use the SDK descriptor returned by the session with the existing Bootstrap.
Media hosting and public SDK calls otherwise remain unchanged; the SDK handles licensing automatically.

## Acceptance

Backend/package tests cover wrapping interoperability, session/package/Origin binding,
expiry, invalid public keys, missing/mismatched configuration, encrypted contents and determinism.
Chrome tests cover WASM, extracted shader compilation, real C-model and I-Worker initialization,
wrong keys, expired grants, tampering, destroyed contexts and initialization-failure lease cleanup.
Full avatar visual comparisons, production authorization E2E and mobile long-duration testing
remain release acceptance steps after sealing with the production secret.

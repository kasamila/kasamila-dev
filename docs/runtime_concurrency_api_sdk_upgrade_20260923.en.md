[English](runtime_concurrency_api_sdk_upgrade_20260923.en.md) | [简体中文](runtime_concurrency_api_sdk_upgrade_20260923.md)

# Runtime concurrency: API/SDK update and upgrade guide

Applies to the server-side Runtime, MCP/Agent and Portal test-session allocation changes introduced in API package 0.11.0. The Web SDK remains **1.11.6**. This does not change HLS `templateMedia`, audio inputs, mouth parameters or browser initialization.

## Rules

- Workspace default: **100 simultaneous valid Sessions**. Optional one-time seat purchases increase the total. Seats and inference-time balance are separate resources.
- New API Key default: **20 allocated seats**. Specify another nonnegative integer when creating a Key, or update it in Portal. Allocations across active user Keys cannot exceed the Workspace total. An allocation of 0 keeps the Key but prevents new Runtime Sessions.
- Revoking a Key invalidates its active Sessions immediately and returns its allocated seats to the Workspace pool. Rotation invalidates old Sessions but keeps allocation. Lowering allocation does not cancel existing Sessions; new creation is blocked until active count falls below the new limit.
- Portal free previews use an internal Key, with at most three simultaneous previews per Workspace. They count toward active Workspace Sessions but do not reserve user-Key allocation.
- Following a refund, excess allocation is reclaimed from the newest active Keys first. Existing Sessions finish or expire normally. Admin adjustments cannot remove the default 100 base seats.

## Key-management endpoints

These are authenticated Portal-management operations with CSRF, not permanent-Key Runtime endpoints.

```http
POST /api/v1/api-keys
Content-Type: application/json
X-CSRF-Token: <Portal CSRF token>

{"name":"production","environment":"live","origins":["https://app.example.com"],"runtime_concurrency_limit":20}
```

Omitting `runtime_concurrency_limit` uses the default 20. Adjust without rotating:

```http
PATCH /api/v1/api-keys/key_<id>
Content-Type: application/json
X-CSRF-Token: <Portal CSRF token>

{"runtime_concurrency_limit":35}
```

`GET /api/v1/api-keys` returns each item's `runtime_concurrency_limit` and a Workspace summary:

```json
{"runtime_concurrency":{"total":125,"allocated":55,"available":70,"overallocated":0}}
```

`total` includes base and purchased/granted seats. `allocated` counts non-revoked user Keys. `available` is assignable capacity, not the current number of inactive Sessions. `overallocated` exposes legacy inconsistencies and should normally be 0.

Deleting a Key performs irreversible revocation; it does not delete the ledger or change purchased Workspace capacity.

## Errors and the independent rate limit

| Condition | HTTP | Error code |
| --- | ---: | --- |
| Key creation/increase exceeds assignable capacity | 409 | `runtime_concurrency_allocation_exceeded` |
| Key active Sessions reach allocation | 429 | `runtime_key_concurrency_exceeded` |
| Workspace active Sessions reach total | 429 | `runtime_workspace_concurrency_exceeded` |
| 60 creation attempts per Key per 60 seconds | 429 | `runtime_rate_limited`; observe `Retry-After` |

Concurrency measures **currently active Sessions**. Rate limiting measures **creation attempts per minute**, including failed attempts. They are not contradictory.
Session creation still checks time balance, allowed Origin and runnable template status. Reuse or end unneeded Sessions; avoid infinite retry loops.

## Purchases and configuration

Administrators configure a one-time Stripe Price and matching `concurrency_price_id`, `concurrency_units` and `concurrency_amount` in Admin billing. Unconfigured products cannot enter Checkout.
Customers use `POST /api/v1/billing/checkout-sessions` with `{"price_code":"concurrency-pack"}`. Only verified paid Stripe Webhook events grant seats idempotently; a browser success redirect does not grant entitlement.

A purchase increases Workspace total but **does not automatically enlarge any Key**. Assign new seats in Portal Key management and verify with `GET /api/v1/api-keys`. Audited admin adjustments use `/api/v1/admin/entitlements/adjustments` with `resource=runtime_concurrency` and the seat count in `delta_units`.

## Third-party upgrade checklist

1. Keep SDK 1.11.6; no geometry rebuild or media redownload is needed. Agent and Session request bodies are unchanged.
2. Distinguish the two concurrency 429 codes from token/media/audio failures; respect retry guidance.
3. To exceed a Key's default 20, obtain Workspace capacity if necessary and allocate it to that Key. Creating more Keys cannot bypass Workspace total.
4. End idle/unneeded Sessions using SDK `destroy()` or the authorized Session end operation. Creating and destroying rapidly still encounters the independent 60/minute limit.
5. In a controlled test environment, create 20 on a default Key, confirm the 21st gets a Key-limit 429, end/expire one and confirm a new Session succeeds. Also test aggregate limits across Keys.

Legacy Keys are allocated during migration in creation-time order; when more than five existed, later Keys may receive the remaining capacity, possibly 0. Runtime-only consumers need no code change; management UIs must display these allocation semantics.

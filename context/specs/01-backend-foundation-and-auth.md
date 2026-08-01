# Unit 01: Backend Foundation and Auth Boundary

## Goal

Create the Express/TypeScript service foundation that accepts only authenticated, validated FitLoom requests and exposes a safe health check. This unit establishes the security boundary before media or AI work begins.

## Design

- Place the service in `apps/api/` and use the boundary described in `context/architecture.md`.
- Version routes under `/api/v1`.
- Use one consistent JSON envelope: success is `{ data, error: null }`; failure is `{ data: null, error: { code, message } }`.
- Return safe messages only. Do not expose tokens, vendor errors, or request media metadata.

## Implementation

### Application Skeleton

- Set up strict TypeScript, Express, linting, and test scripts.
- Add typed, validated server configuration for Supabase and future vendor credentials.
- Implement a health endpoint at `GET /health` that exposes no secrets.
- Add centralized 404 and error middleware.

### Authentication Middleware

- Validate Supabase bearer tokens on protected `/api/v1` routes.
- Attach only verified identity data to the request context.
- Reject missing, expired, malformed, or invalid tokens with a safe `401` response.
- Never accept a user ID from request input as a substitute for verified identity.

### Request Validation

- Add a schema validation utility for JSON bodies, query parameters, and vendor responses.
- Define initial shared contracts for the generate-try-on request and response, even though its handler is built in a later unit.

## Dependencies

- `express`
- `typescript`
- Supabase server SDK or verified JWT middleware dependency
- A schema validation library
- A test runner

## Verify When Done

- [ ] `GET /health` returns the success envelope.
- [ ] A protected placeholder route rejects a missing or malformed JWT.
- [ ] A verified token is accepted and its user ID is sourced only from the token.
- [ ] Invalid request data produces the safe error envelope.
- [ ] Type check, lint, and unit tests pass.

## Digital Signatures – assessment-service

This backend acts as the microservice `assessment-service`. All outbound requests to the Coordinator are now signed.

- Target endpoint: `${COORDINATOR_URL}/api/fill-content-metrics/`
- Algorithm: ECDSA P-256 (prime256v1) using Node.js `crypto`
- Message format: `educoreai-{service-name}-{payload-sha256-hash}` where `payload` is the JSON envelope.

### Request Headers

- `X-Service-Name`: `assessment-service` (or `SERVICE_NAME` from env)
- `X-Signature`: Base64 ECDSA signature of the message above

### Environment Variables

- `COORDINATOR_URL`: Base URL of Coordinator
- `SERVICE_NAME`: Defaults to `assessment-service`
- `PRIVATE_KEY`: PEM private key for signing (required to sign)
- `COORDINATOR_PUBLIC_KEY` (optional): PEM public key to verify Coordinator responses; verification is non-blocking.

The Coordinator must have the public key of `assessment-service` configured to verify incoming requests. If signing is not configured, the Coordinator will reject requests with 401.



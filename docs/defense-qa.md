# Architectural Defense Q&A Prep

## Why microservices instead of monolith?

- Business domains are distinct and evolve at different speeds.
- Fault isolation and independent deployment reduce operational risk.
- Team parallelism is easier during implementation.

## How did you enforce service boundaries?

- Each service has a separate codebase and dedicated SQLite database.
- No cross-service direct DB access is allowed.
- Interactions occur only through HTTP APIs.

## Why API Gateway?

- Single public entry point simplifies frontend integration and deployment.
- Centralized routing and future-ready spot for rate limiting/auditing.

## Why REST for inter-service communication?

- Fast implementation for synchronous workflows needed in this scope.
- Easy debugging and clear endpoint contracts.
- Selected over broker/gRPC due to timeline and simplicity.

## How is security handled?

- JWT bearer tokens on protected endpoints.
- Role-based access checks in service handlers.
- Internal service-to-service calls require `X-Service-Token`.

## How is data consistency handled across services?

- Synchronous validation/reservation calls for critical flows.
- Compensating logic can be added for partial failure scenarios.
- Current design emphasizes correctness of stock-affecting operations.

## What are known limitations?

- SQLite is suitable for prototype scale, not high concurrency production.
- Gateway currently pass-through; no advanced circuit-breaker/retry layer.
- Monitoring and distributed tracing are basic and can be extended.

## If given 2 more weeks, what would you improve?

- Add event-driven messaging for asynchronous workflows.
- Add automated tests and CI pipeline with containerized integration tests.
- Add observability stack (Prometheus/Grafana + centralized logs).
- Move to managed Postgres per service in production.

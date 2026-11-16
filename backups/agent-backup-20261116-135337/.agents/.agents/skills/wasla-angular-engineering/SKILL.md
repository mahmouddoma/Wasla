---
name: wasla-angular-engineering
description: Use for Angular v20-compatible architecture, standalone components, features, TypeScript, Reactive Forms, Signals, RxJS, routing and safe refactoring.
---

# Senior Angular implementation
## Determine actual stack
Inspect `package.json`, `angular.json`, existing feature code, lockfile if needed. Original user baseline is Angular 20 with Material and Bootstrap 5; this is not a license to ignore project version.
## Feature design
- Follow existing feature-driven structure; lazy routes where present; `core` for app-level infrastructure and `shared` for domain-neutral reusable components only.
- Stateful page/container coordinates data and navigation; presentation components stay UI-focused; create services/facades only when they simplify real repeated orchestration.
- Use typed interfaces/DTOs matching backend, narrow state scope, `inject()` when project convention supports it, Signals for local derived state and RxJS for streams/network as appropriate.
- Avoid indiscriminate `effect`, global stores, `any`, subscriptions without cleanup, redundant manual change detection and ad hoc DOM manipulation.
- For complex existing forms, prefer typed Reactive Forms with appropriate sync/async validation and error messaging. Do not force APIs introduced after installed Angular version.
- Do not rewrite existing auth, routing or request layering to satisfy a style preference; preserve public APIs and test behavior.
## Implementation decisions checklist
Data owner, input/output contract, submit/loading/error state, concurrency prevention, teardown/cancel behavior, idempotency, accessibility, RTL, mobile behavior, tests.
## Sample state model (adapt; don't paste by default)
```ts
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty'; data: T }
  | { status: 'error'; message: string };
```
Read `../../knowledge/angular-architecture.md` for repository-specific seams.

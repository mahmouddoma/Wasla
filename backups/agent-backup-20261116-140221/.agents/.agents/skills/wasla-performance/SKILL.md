---
name: wasla-performance
description: Use to improve Wasla Angular performance and scale patient/booking lists, large tables, search, filters, live queue updates and mobile rendering.
---

# Performance and scalability
1. Start with an observable bottleneck: bundle size, INP/LCP/CLS, memory, network waterfall, list rendering or task time. Do not optimize based only on guesswork.
2. Design large lists: server-side pagination/filter/sort when supported, virtualization for true large scrolling, `track` stable identifiers, and loading/empty/error semantics.
3. Favor efficient change detection, scoped Signals, memoized derived state only when needed, no repeated expensive template computations or cascading subscriptions.
4. Use debounced searches where appropriate; cancel stale requests, avoid duplicate concurrent fetching and avoid caching sensitive patient details unsafely.
5. Lazy-load routes/modules where architecture already supports it; optimize media and avoid heavy animation/reflow, especially on low-end phones.
6. For live queues, throttle/redraw only relevant changes, reconcile after reconnect and prevent event drift; prioritize correctness over optimistic visual smoothness.
7. Benchmark before/after on representative sample sizes and midrange mobile/network when practical. Never claim improvement from code shape alone.

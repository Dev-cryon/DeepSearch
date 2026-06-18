## 2026-06-18 - O(n^2) Deduplication Bottleneck
**Learning:** Found significant O(n^2) bottlenecks in this codebase due to array deduplication using `.some` and `.find` for thousands of extracted links and URLs (taking ~6700ms for 20k links).
**Action:** Always prefer O(1) `Set` lookups. To keep chained methods elegant, use an IIFE (e.g. `.filter((() => { const seen = new Set(); return x => ... })())`) to scope the Set securely without breaking the chain.

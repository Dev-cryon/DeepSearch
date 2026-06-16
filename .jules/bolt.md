# Performance Bottlenecks & Learnings

## Inefficient Array Lookups
- **Observation:** `Array.some` or `Array.includes` inside loops (especially while extracting entries to an array) create O(N^2) complexity. This causes significant performance degradation as the array size increases.
- **Resolution:** By introducing a `Set` to keep track of seen elements, the O(N) array lookup operation is replaced with an O(1) `Set.has()` operation.
- **Impact:** Benchmark analysis (`benchmarks/lookup.js`) showed massive execution time reduction (from ~13.5s down to ~140ms on a large dataset) when shifting from `Array.some` to `Set.has`.

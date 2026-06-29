## 2026-06-29 - Replaced O(n^2) Array Deduplication with O(1) Set Lookup
**Learning:** Found an O(n^2) array deduplication pattern using `!arr.find(...)` inside `.filter` during link extraction in `src/toolsProvider.ts`. This gets exponentially slower with more links extracted.
**Action:** Replace `!arr.find(...)` in `.filter` loops with O(1) `Set` lookups for tracking uniqueness, especially when handling HTML elements.

## 2024-07-04 - O(n^2) Deduplication Bottleneck
**Learning:** Avoid using `.find` or `.some` within `.filter` for array deduplication, as it creates an O(n^2) operation. This is especially problematic for operations like extracting links from HTML, where there could be thousands of links. Using an IIFE for the set in an array method chain breaks contextual type inference in TypeScript.
**Action:** Replace `O(n^2)` array deduplications with `O(1)` `Set` lookups. Extract the logic into an explicit function block to avoid `ImplicitAny` errors with TypeScript type inference.

## 2024-05-24 - Array Deduplication Bottleneck in HTML Parsing
**Learning:** Found an O(n^2) array deduplication pattern using `.filter` and `.find` in `src/toolsProvider.ts` when extracting links from large HTML payloads. This is a common bottleneck when parsing thousands of links from DOM strings.
**Action:** Always prefer O(1) `Set` lookups for array deduplication, especially when dealing with elements repeatedly extracted from large inputs like HTML documents.

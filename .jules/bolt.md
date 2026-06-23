## 2026-06-23 - Optimize extractLinks O(n^2) array deduplication
**Learning:** The array deduplication in extractLinks used an O(n^2) find inside a filter which is very slow for large arrays. Using an O(1) Set lookup significantly improves performance.
**Action:** Use Sets for array deduplication instead of nested array loops.

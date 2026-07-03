## 2026-07-03 - [Array Deduplication Bottleneck]
**Learning:** [Using O(n^2) deduplication (e.g., `arr.filter((x, i) => !arr.find((y, j) => j < i && y.link === x.link))`) for frequently extracted DOM elements like links can cause severe performance bottlenecks, especially on pages with hundreds of links.]
**Action:** [Always use O(1) `Set` lookups to deduplicate arrays, and leverage early breaks when iterating to extract bounded items (e.g., stopping when `maxLinks` is reached).]

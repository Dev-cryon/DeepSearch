## 2025-03-09 - Avoid O(n²) array deduplication in frequent link extraction
**Learning:** Found O(n²) deduplication (`filter` + `.find` and `while` + `.some`) when extracting/collecting URLs. This degrades heavily when processing large HTML bodies with hundreds of links, causing performance bottlenecks and slowing down parsing time unnecessarily.
**Action:** Always use an O(1) `Set` cache (e.g., `seenUrls.has(link)`) for URL uniqueness deduplication loops.

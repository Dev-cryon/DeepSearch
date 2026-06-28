## 2024-06-25 - Avoid O(n^2) deduplication in scraping utilities
**Learning:** Using `.filter` with a nested `.find` or `.some` for deduplicating extracted items (like links from a large webpage) causes O(n^2) time complexity, which becomes a major bottleneck when extracting thousands of links from large DOMs.
**Action:** Always use an O(1) `Set` lookup to track and filter seen items (URLs) during list building and processing, particularly in string-parsing/web-scraping tasks.

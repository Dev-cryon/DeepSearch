## 2024-05-24 - extractLinks Deduplication Optimization
**Learning:** Found an O(n²) bottleneck in extracting and deduplicating scraped links (`filter` combined with `find`). Using a `Set` handles this deduplication in O(n) without breaking the method chain if structured correctly.
**Action:** Always prefer `Set` for deduplication, particularly in data scraping/extraction tools where arrays can get unexpectedly large.

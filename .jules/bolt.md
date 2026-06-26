## 2024-05-18 - [Avoid O(n^2) Link Deduplication]
**Learning:** Found multiple instances of O(n^2) array deduplication patterns (`.find` inside `.filter` and `.some` inside loops) for extracting and filtering links. This can cause severe performance degradation on pages containing hundreds or thousands of links.
**Action:** Replace nested array scans with O(1) `Set` lookups when filtering or deduplicating elements, specifically for frequently executed functions like `extractLinks`.

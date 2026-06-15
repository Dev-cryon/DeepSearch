## 2026-06-15 - O(N^2) Array Searches in Parsing
**Learning:** Using `.some` or `.find` to deduplicate arrays inside a loop or `.filter()` chain leads to O(N^2) time complexity. This is particularly harmful when parsing webpages that contain hundreds of links.
**Action:** Use a `Set` to keep track of seen elements to achieve O(1) lookups, bringing the total time complexity down to O(N).

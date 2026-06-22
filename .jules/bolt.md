
## $(date +%Y-%m-%d) - O(n^2) Array Deduplication Anti-Pattern
**Learning:** Found an O(n^2) deduplication bottleneck when parsing web pages in `extractLinks`. The code used `.filter((x, i, arr) => !arr.find((y, j) => j < i && y.link === x.link))`, which severely degrades performance on large datasets compared to an O(1) Set lookup approach.
**Action:** Always prefer `Set` for deduplicating large collections (like links or image URLs) to guarantee O(1) membership checks and prevent unneccessary CPU usage during large web extractions.

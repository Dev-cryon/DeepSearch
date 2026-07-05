## 2024-07-05 - O(n^2) deduplication in loops
**Learning:** Using `.filter()` with `.find()` inside to deduplicate arrays (e.g. `!arr.find(...)`) creates an O(n^2) bottleneck. This is especially bad for frequently extracted items like links from large web pages.
**Action:** Replace nested loops/finds in array deduplication with O(1) `Set` lookups. To preserve TypeScript type inference, instantiate the `Set` outside the array method chain by converting inline arrow functions to explicit block functions.

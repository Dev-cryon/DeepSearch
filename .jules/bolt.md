## 2024-06-27 - [O(n^2) array deduplication patterns]
**Learning:** [Using `.find` or `.some` or `.includes` within filters or loops for frequently extracted items like links is an O(n^2) operation that causes performance bottlenecks on large documents.]
**Action:** [Use an O(1) `Set.has()` lookup and `Set.add()` to track seen items for large array deduplications instead of array methods.]

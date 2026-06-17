## 2025-02-28 - Set Lookup for Extract Links
**Learning:** O(n²) nested array iteration using `.filter()` and `.find()` becomes exceptionally slow as elements grow. Array deduplication should use O(1) hash map lookups like `Set`. In local benchmarks, the difference goes from seconds to under 50 milliseconds for just 10000 items. Also, modifying `package.json` and `tsconfig.json` without instructions is strictly prohibited, any local testing must be reverted before commit.
**Action:** Always prefer `Set` for deduplicating arrays and never commit `package.json` or `tsconfig.json` changes.

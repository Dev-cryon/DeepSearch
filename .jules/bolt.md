## 2024-07-02 - O(n^2) deduplication in loop
**Learning:** Found an O(n^2) array deduplication pattern (`.filter((x, i, arr) => !arr.find(y => y.link === x.link))`) used in a potentially hot path when parsing URLs.
**Action:** Replace `Array.prototype.find` inside `Array.prototype.filter` with a generic O(1) `Set` lookup for seen values in the future when doing extraction of multiple items.

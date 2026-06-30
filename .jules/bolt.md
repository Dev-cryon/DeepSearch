
## 2024-05-18 - IIFE Scope Contextual Type Inference Failure in TypeScript
**Learning:** Using an IIFE to scope variables inside array methods (e.g., `[].filter((() => { const seen = new Set(); return (x) => ... })())`) breaks TypeScript's contextual type inference for the callback arguments, leading to `ImplicitAny` errors. It also sacrifices code readability compared to standard scoping.
**Action:** Always prefer declaring state variables (like Sets) outside the array processing chain or by converting arrow functions to explicit blocks, ensuring both readability and type safety are maintained without requiring extra type annotations.

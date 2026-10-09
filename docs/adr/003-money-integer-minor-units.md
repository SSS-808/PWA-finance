# ADR-003: Store money as whole numbers of the smallest unit, with a currency

**Status:** Accepted · 2026-10-09

## Context
Floats can't represent most decimals exactly (`0.1 + 0.2 = 0.30000000000000004`). Errors pile up in sums and comparisons. We use three currencies with different decimals, and the brief requires every amount to carry its currency.

## Decision
- **Database:** `amount_minor bigint` next to `currency char(3)`. The `currencies` table holds `minor_unit` (the number of decimals).
- **Decimals:** LAK = **0**, USD = 2, THB = 2. ISO 4217 says LAK has 2 decimals (att), but att aren't used in practice, and browsers format kip with 0 decimals (`Intl.NumberFormat` gives `LAK 100,000`). Using 0 matches reality.
- **TypeScript:** `type Money = { minor: number; currency: CurrencyCode }`. Every value is checked with `Number.isSafeInteger`, which is exact up to about 9 × 10¹⁵. That's far beyond any personal amount, and the database also caps a single row at 10¹³. We use `number` rather than `bigint` because JSON, the Supabase API, Zod and Recharts all work with `number`.
- **Parsing:** user input is converted from its *string* form (`"1,250.50"` → `125050`), never with `parseFloat(x) * 100`. That classic bug turns `1.005 * 100` into `100.49999…`.
- **Calculations:** only addition, subtraction and integer multiplication on `minor`. Any division (exchange rates, splitting) uses one rounding helper (round half away from zero), which is tested.
- **Display:** floats appear only at the very end, in formatting and in percentages like savings rate. A percentage is a ratio, not money.
- **Mixing:** `addMoney` throws an error if the currencies differ ([ADR-008](008-no-currency-mixing.md)).

## Alternatives
- **`numeric(19,4)` plus a decimal library (decimal.js):** exact too, but it adds a dependency, and amounts travel as strings everywhere in JavaScript.
- **Floats:** wrong for money.

## Consequences
- ✅ Exact sums, simple storage, fast comparisons.
- ⚠️ Every input and display must go through `parseMoney` and `formatMoney`.
- ⚠️ If LAK ever needed decimals, every LAK amount would need a data migration (× 100).

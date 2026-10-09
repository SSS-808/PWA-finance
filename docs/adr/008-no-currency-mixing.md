# ADR-008: Never add different currencies together without an explicit exchange rate

**Status:** Accepted · 2026-10-09

## Context
You hold LAK, USD and THB. A single "Total balance" needs exchange rates, and the official rate can differ from what a money changer actually gives you. A number that quietly uses a wrong or out-of-date rate looks precise but isn't.

## Decision
- **MVP:** every total is grouped by currency (for example "LAK 12,500,000 · USD 340.00"). The domain function `addMoney` throws an error on mismatched currencies.
- **Phase 8:** a combined total in your base currency (LAK), using exchange rates you type in by hand. The screen always shows which rate and date it used.

## Alternatives
- **A hard-coded rate:** quietly wrong.
- **A live exchange-rate API:** adds a dependency, needs a fallback when offline, and may not match the rate you actually get.

## Consequences
- ✅ Every number on screen is exactly true.
- ⚠️ The dashboard shows up to three totals until Phase 8.

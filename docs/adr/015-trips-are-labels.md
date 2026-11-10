# ADR-015: A trip is a label on entries, not a place money lives

**Status:** Accepted · 2026-11-10

## In plain words
A trip is like an envelope you drop receipts into: "Vietnam, 10–17 Dec". The money still comes out of your normal accounts; the trip only says which spending belonged to it. Afterwards the trip page adds up what's in the envelope, per currency.

## Context
- The owner travels from Laos and wants to see what a trip cost (travel plan, 2026-11-06).
- Spending on a trip happens in several currencies and accounts, from a dong cash account to a kip bank card.
- Totals are never added across currencies without a rate ([ADR-008](008-no-currency-mixing.md)).

## Decision
- A `trips` table holds name, first day and last day. `transactions.trip_id` is an optional label.
- **Only money in and money out** can carry a trip. Transfers and money changes can't, because moving money isn't spending.
- **Two trips can't share a day** (an exclusion constraint), so Add always knows which trip a date belongs to and can fill the Trip field by itself.
- **Deleting a trip keeps its entries**; they only lose the label.
- **One tap for a late trip:** `label_trip_entries` labels the untagged money in and out of the trip's days, for a trip created afterwards or whose dates changed.
- The trip page shows spending per currency and per category, money in on its own line, and links to History filtered by the trip.
- No trip budget for now.

## Alternatives
- **A trip as an account:** you'd have to move money into it, and spending paid by a home card would be missed.
- **Tags on entries (many per entry):** more flexible, but more to build and to understand. A trip is one label with dates.
- **Filtering History by dates only:** it can't leave out entries that weren't part of the trip.

## Consequences
- ✅ No money moves and no balances change; old entries are untouched.
- ✅ The same date rule gives automatic labelling on Add.
- ⚠️ Overlapping trips (a day trip inside a longer one) aren't possible.
- ⚠️ Changing a trip's dates doesn't relabel entries by itself; the one-tap offer does it.

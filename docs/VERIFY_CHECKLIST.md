# Verification checklist (author)

Nothing is published until every box is ticked by Taiwo Fausiyat Adesiyan.

## Rulings to make
- [x] **Commodity groups.** 14 groups via `code/commodity_rules.json`: bare "beans"/"peas" → Vegetables; "Other: Corn" → Grains (field corn); dairy words suppress Beef within an item; cotton and tobacco → Other. (Approved 1 Nov 2026.)
- [x] **Handling.** Handlers' product lists are *not* classified into commodity groups; handlers appear only under the Handling scope. (Approved with Methods text, 18 Nov 2026.)
- [x] **Window.** 2018–2025 full years shown by default, 2026 (Jan–Sep) available and flagged.
- [x] **Small states.** Fewer than 30 stock-years: hatched and uncoloured on the map, marked † with greyed rates in the table (added 18 Nov 2026).

## Checks to run
- [x] Preview reviewed, 18 Nov 2026: headline tiles, year chart, map, exit types, stock chart, state table and Methods.
- [x] `data/qa_report.txt`: all checks PASS. Data rebuilt from the panel file (md5 15025d1716880d50937bf3537f7573cb) on 18 Nov 2026 and reproduced byte-for-byte.
- [x] Spot-checks, 2024: Tennessee stock 91 / entries 25 / exits 12; Vermont 841 / 57 / 32; California 5,029 / 783 / 475. State table (2018–2025) sums to the headline totals and net = entries − exits in every row.
- [x] Commodity audit (`data/commodity_audit.csv`) reviewed 18 Nov 2026: about 80 clearly identifiable missed items added to the keyword rules at the author's request (state and certifier figures unchanged; group figures change by under 2%).
- [x] Certifier labels: code · most recent OID name; code 000 is OID's "Transitioning to New Certifier" placeholder (per the panel's docs/LIMITATIONS.md, item 14).

## Your voice
- [x] Intro paragraph rewritten by the author (18 Nov 2026); Methods and Limits text approved (18 Nov 2026).

## Fixes made in review (18 Nov 2026)
- Net rate = rounded entry rate − rounded exit rate, so displayed figures add up.
- Map legend re-laid out; hatching explained.
- "Moves to another certifier" moved to the Exits tile.
- Links to the panel use its v1.0.0 DOI (10.5281/zenodo.23130740); concept DOI kept in metadata.
- Methods explain the 59,988 spells used (active on or after 1 Jan 2018) vs the panel's 66,279 U.S. operations.
- "OID purges old exit records" reworded to match the panel's evidence ("appears to drop … after a few years").

## Before publishing
- [x] DRAFT banner removed from `index.html` and README.
- [ ] `python code/publish_gate.py . --allow-draft-in docs/ code/publish_gate.py` passes, apart from the DOI tag filled in after Zenodo mints it.

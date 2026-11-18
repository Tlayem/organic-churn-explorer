# Codebook: The Organic Certification Churn Explorer v1.0.0

All files cover U.S.-located spells (`us_located == True`) in The U.S. Organic Certification Panel v1.0.0 (DOI 10.5281/zenodo.23130739). Years 2018–2026; 2026 is January–September (`partial_year = True`).

## Yearly tables

`churn_state_year.csv` (key `state`), `churn_certifier_year.csv` (key `certifier`, "code · latest OID name"), `churn_group_year.csv` (key `commodity_group`; rows starting "Scope:" are the four OID scopes, the rest are commodity groups; both overlap).

| Field | Definition |
|---|---|
| `year` | Calendar year. |
| `stock` | Spells with a known start before 1 January of `year` and no exit before that date. |
| `entries` | Spells starting in `year` with a known start on or after 16 Mar 2017, not linked to an earlier spell. |
| `exits_surrendered`, `exits_suspended`, `exits_revoked`, `exits_dropped_from_listing` | Spells ending in `year` by type; moves to a new certifier excluded. |
| `exits` | Sum of the four exit types. |
| `transfers_out` | Spells ending in `year` that the panel links to a new Operation ID of the same business (`exit_is_transfer`). |
| `transfers_in` | Spells starting in `year` that continue an earlier spell (`linked_prev_spell_id` set). |
| `net_change` | `entries − exits`. |
| `net_change_incl_transfers` | (certifier table only) `net_change + transfers_in − transfers_out`. |
| `entry_rate`, `exit_rate` | `entries / stock`, `exits / stock` (empty or inf when stock is 0). |
| `partial_year` | True for 2026. |

## `spells.json` (columnar; one array per field, one position per spell)

| Key | Meaning |
|---|---|
| `st` | Index into `meta.states`. |
| `ce` | Index into `meta.certifiers` (NOP certifier ID; 000 = OID placeholder "Transitioning to New Certifier"). |
| `sy` | Start year; −1 if the start is unknown (exit-only spell). |
| `en` | 1 if the spell is an entry (as above). |
| `ti` | 1 if the spell is a transfer in. |
| `xy` | Exit year; −1 if still certified at 1 Oct 2026. |
| `xt` | Exit type index into `meta.exit_types`: 0 open, 1 surrendered, 2 suspended, 3 revoked, 4 dropped from listing, 5 transfer to another certifier. |
| `sc` | Scope bitmask: 1 crops, 2 livestock, 4 wild crops, 8 handling (certified at any point in the spell). |
| `gr` | Commodity-group bitmask; bit *i* = `meta.groups[i]`. |

Spells that ended before 2018 are omitted (they affect no figure shown).

## Commodity rules (`code/commodity_rules.json`)

Each OID product item ("Category: item" or bare item) is assigned by its OID category when the category is in `category_map`; otherwise by regular-expression keywords matched against the full item text, including unmapped category words such as "Cattle". Items matching `exclude_items` (fallow, cover crops, "see addendum", slaughter-eligibility notes, etc.) are ignored. Dairy words suppress the beef group within the same item. A spell with items but no matched group goes to "Other or unclassified products". Unmatched items and counts: `data/commodity_audit.csv`.

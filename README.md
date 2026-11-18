# The Organic Certification Churn Explorer

An interactive public resource showing how many U.S. organic operations become certified each year, how many leave, and whether the certified base is growing, by **state**, **certification scope**, **commodity group** and **certifier**, 2018–2026.

**Live site:** https://tlayem.github.io/organic-churn-explorer/
**Cite:** Adesiyan, T. F. (2026). *The Organic Certification Churn Explorer* (Version 1.0.0) [Interactive data resource]. [VERIFY: Zenodo DOI after release]

Built on [The U.S. Organic Certification Panel v1.0.0](https://doi.org/10.5281/zenodo.23130740) (Adesiyan, 2026), which reconstructs every operation's certification history from eleven USDA Organic INTEGRITY Database (OID) snapshots, 16 March 2017 to 1 October 2026.

## What it shows

From 2018 to 2025, 24,775 U.S. operations entered organic certification and 25,410 left (surrendered, suspended, revoked or dropped from the listing), a net change of −635. On 1 October 2026, 29,394 U.S. operations were certified. Users can filter any combination of years, state, scope, commodity group and certifier, and compare states, groups, scopes or certifiers in a sortable table that downloads as CSV. Filter settings are kept in the page URL, so a view can be shared as a link.

## Definitions

| Measure | Definition |
|---|---|
| Entry | A spell that starts in the year and is not the continuation of an earlier spell (moves to a new certifier are transfers, not entries). |
| Exit | A spell ending in the year as surrendered, suspended, revoked or dropped from listing; moves to a new certifier excluded. |
| Net change | Entries − exits. The certifier view adds transfers in − transfers out. |
| Stock | Spells with a known start before 1 January and no exit before it. |
| Entry / exit rate | Entries (exits) ÷ stock on 1 January, pooled over the selected years. |
| Commodity group | 14 groups assigned from OID crops, livestock and wild-crops product lists by the keyword rules in [`code/commodity_rules.json`](code/commodity_rules.json); groups overlap. 98.5% of producer spells fall in at least one named group. |

Definitions match the panel's own QA script, and `code/02_qa.py` checks that entries and exits recounted directly from the panel equal the explorer's totals for every year (all pass; see `data/qa_report.txt`).

## Files

| Path | Contents |
|---|---|
| `index.html`, `assets/` | The site (plain HTML, CSS and JavaScript; no build step, no external requests). |
| `data/spells.json` | Compact spell-level file the page aggregates in the browser (59,988 U.S. spells; no names or addresses). |
| `data/meta.json` | Labels for states, certifiers, scopes, groups; source DOI and md5. |
| `data/churn_state_year.csv`, `churn_group_year.csv`, `churn_certifier_year.csv` | Flat yearly tables. Fields in `docs/CODEBOOK.md`. |
| `data/stats.json`, `data/qa_report.txt` | Headline numbers and QA results written by the pipeline. |
| `data/commodity_audit.csv` | Product items no rule matched, with counts (for refining the rules). |
| `data/PROVENANCE.txt` | Source file, date, size and checksums. |
| `code/` | `00_fetch.py` → `01_build.py` → `02_qa.py`, run by `code/run_all.sh`. |

## Reproduce

```bash
pip install -r requirements.txt
bash code/run_all.sh          # downloads the panel file (md5-checked), rebuilds data/, runs QA
python -m http.server 8000     # then open http://localhost:8000
```

## Limits

- Years before 2018 are not shown: the first snapshot is from 16 March 2017, and OID appears to drop surrendered operations after a few years (the January 2026 export goes back only to 2023), so earlier exits cannot be recovered.
- Operations first seen already surrendered or suspended count as exits but, with no known start, are not in the stock, so exit rates are slightly overstated (most in 2020–2022).
- "Dropped from listing" exits are dated by the first snapshot in which the operation is missing (up to about a year late).
- Commodity lists are cumulative over each spell, and keyword rules are approximate (e.g. "Other: Corn" is read as field corn). Handlers' product lists are not classified.
- 2026 covers January–September only.

## Licence

Code: MIT (`LICENSE`). Derived data in `data/`: CC BY 4.0 (`LICENSE-DATA.md`). Source: USDA AMS National Organic Program, Organic INTEGRITY Database (U.S. public domain). USDA does not endorse this resource.

## Author

Taiwo Fausiyat Adesiyan · Middle Tennessee State University, Murfreesboro, Tennessee, USA · ORCID [0000-0002-2023-3624](https://orcid.org/0000-0002-2023-3624)

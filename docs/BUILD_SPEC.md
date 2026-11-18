# Build spec: The Organic Certification Churn Explorer

**Question.** Where, in what kinds of farming, and under which certifiers are U.S. organic operations entering and leaving certification, and is the stock growing or shrinking?

**Archetype.** Interactive public resource (atlas/explorer) built on an existing open dataset.

**Source.** The U.S. Organic Certification Panel v1.0.0 (Adesiyan, 2026), concept DOI 10.5281/zenodo.23130739, file `data/processed/ocp_spells.csv.gz` (md5 `15025d1716880d50937bf3537f7573cb`), itself built from 11 USDA Organic INTEGRITY Database (OID) snapshots, 2017-03-16 to 2026-10-01. Panel licence CC BY 4.0; OID is U.S. public domain.

**Unit.** Certification spell of a U.S.-located operation (`us_located == True`), aggregated in the browser to any combination of state × year × scope/commodity group × certifier.

**Measures** (definitions match the panel's `04_qa.py`, so totals reconcile with `stats.json`):

| Measure | Definition |
|---|---|
| Entry (year *t*) | Spell with a known start in *t*, not linked to an earlier spell (`linked_prev_spell_id` empty). Moves between certifiers are not entries. |
| Exit (year *t*) | Spell ending in *t* as surrendered, suspended, revoked or dropped from listing, **excluding** `exit_is_transfer`. Shown by type. |
| Transfer out / in | Exit linked to a new Operation ID of the same business (`exit_is_transfer`), and the linked later spell. Reported separately; they matter only in the certifier view. |
| Net change | Entries − exits. Certifier view adds transfers in − transfers out. |
| Stock (1 Jan *t*) | Spells with known start before 1 Jan *t* and no exit before 1 Jan *t*. |
| Entry / exit rate | Entries (exits) in *t* ÷ stock on 1 Jan *t*. |

**Window.** Full years 2018–2025; 2026 shown as Jan–Sep (last snapshot 1 Oct 2026), flagged partial. Pre-2018 years are excluded: the first snapshot is 16 March 2017 and OID appears to drop surrendered operations after a few years, so earlier exits cannot be recovered.

**Dimensions.**
- State: 50 states, DC, Puerto Rico and other territories (stray codes cleaned, see `code/01_build.py`).
- Scope: OID certified scopes ever held in the spell: crops, livestock, wild crops, handling.
- Commodity group: ~15 groups assigned from the crops, livestock and wild-crops item text by documented keyword rules (`code/commodity_rules.json`). An operation can be in several groups. Handling item text is not classified (handlers list the products they process, not what they produce); handlers appear under the Handling scope.
- Certifier: NOP certifier ID (first three digits of the Operation ID), labelled with its most recent OID name. Code 000 = OID placeholder certifier "Transitioning to New Certifier", which holds operations moving between certifiers.

**Outputs.** Static site (index.html + compact columnar `data/spells.json` + `data/meta.json`): filters, KPI tiles, entries/exits/net time series, tile-grid state map, exit-type breakdown, ranked tables by state / commodity group / certifier, CSV download of the current view, methods and citation. Plus `data/churn_state_year.csv`, `churn_group_year.csv`, `churn_certifier_year.csv` as flat downloads, `stats.json`, `qa_report.txt`.

**Verification points (Taiwo).** (1) Commodity rules and the handling decision; (2) reconciliation of explorer totals with the panel; (3) spot-check 3 state-years (incl. Tennessee) against OID; (4) prose on the methods panel in your own voice.

**Hosting and licence.** New public repo `Tlayem/organic-churn-explorer` served by GitHub Pages; code MIT, derived data CC BY 4.0; Zenodo DOI via the GitHub integration on release v1.0.0.

"""QA for the Churn Explorer. Writes data/qa_report.txt and data/stats.json.

Checks
  1. Independent recount from the panel (definitions of the panel's 04_qa.py, U.S. subset)
     equals the sum of churn_state_year.csv.
  2. Re-aggregating data/spells.json (what the browser reads) reproduces churn_state_year.csv
     and churn_certifier_year.csv exactly.
  3. Stock identity: stock(t+1) = stock(t) + entries + transfers_in - exits - transfers_out
     + entries/transfers_in that start and end in the same year adjustments (reported, not forced).
  4. Commodity coverage: share of crops/livestock/wild-crops spells with a group other than "Other".
Usage: python code/02_qa.py path/to/ocp_spells.csv.gz
"""
import json, sys
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / "data"
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "input" / "ocp_spells.csv.gz"
L, fails = [], []


def check(name, ok, detail=""):
    L.append(f"[{'PASS' if ok else 'FAIL'}] {name} {detail}")
    if not ok:
        fails.append(name)


meta = json.loads((D / "meta.json").read_text())
YEARS = meta["years"]
st = pd.read_csv(D / "churn_state_year.csv")
ce = pd.read_csv(D / "churn_certifier_year.csv")
gr = pd.read_csv(D / "churn_group_year.csv")

# 1. independent recount
sp = pd.read_csv(SRC, low_memory=False, parse_dates=["spell_start", "spell_end"])
sp = sp[sp["us_located"].astype(str).eq("True")]
first = pd.Timestamp(meta["first_snapshot"])
tr = sp["exit_is_transfer"].astype(str).eq("True")
ent = sp[sp["start_known"].astype(str).eq("True") & (sp["spell_start"] >= first) & sp["linked_prev_spell_id"].isna()]
ex = sp[sp["spell_end"].notna() & ~tr & sp["end_type"].ne("censored")]
ent_y = ent.groupby(ent["spell_start"].dt.year).size()
ex_y = ex.groupby(ex["spell_end"].dt.year).size()
tot = st.groupby("year")[["entries", "exits", "stock", "transfers_in", "transfers_out"]].sum()
for y in YEARS:
    check(f"entries {y} recount", int(ent_y.get(y, 0)) == int(tot.loc[y, "entries"]),
          f"panel={int(ent_y.get(y, 0)):,} explorer={int(tot.loc[y, 'entries']):,}")
    check(f"exits {y} recount", int(ex_y.get(y, 0)) == int(tot.loc[y, "exits"]),
          f"panel={int(ex_y.get(y, 0)):,} explorer={int(tot.loc[y, 'exits']):,}")

# 2. browser data reproduces tables
js = pd.DataFrame(json.loads((D / "spells.json").read_text()))
states = [s["name"] for s in meta["states"]]
certs = [c["label"] for c in meta["certifiers"]]
XT = meta["exit_types"]
for y in YEARS:
    stock = (js.sy >= 0) & (js.sy < y) & ((js.xy < 0) | (js.xy >= y))
    e = (js.en == 1) & (js.sy == y)
    x = (js.xy == y) & js.xt.between(1, 4)
    for key, names, tab, col in [("st", states, st, "state"), ("ce", certs, ce, "certifier")]:
        agg = pd.DataFrame({"k": js[key].map(lambda i: names[i]), "stock": stock, "entries": e, "exits": x}) \
            .groupby("k").sum()
        t = tab[tab.year == y].set_index(col)[["stock", "entries", "exits"]]
        same = agg.reindex(t.index).fillna(0).astype(int).equals(t.astype(int))
        if not same:
            check(f"spells.json == {col} table {y}", False)
check("spells.json reproduces state and certifier tables for every year", not any("spells.json" in f for f in fails))

# 3. stock identity (approximate: spells entering and exiting within the year drop out of both stocks)
L.append("\nStock flow (U.S., 1 Jan). The gap is mostly exits of exit-only spells (operations first seen already "
         "exited, start unknown): they count as exits but were never in the stock. The rest are back-dated records.")
eo = js[js.xt.between(1, 4) & (js.sy < 0)].groupby("xy").size()
for y in YEARS[:-1]:
    a = tot.loc[y]
    pred = a.stock + a.entries + a.transfers_in - a.exits - a.transfers_out
    L.append(f"  {y}: stock {int(a.stock):,} -> predicted {int(pred):,}, observed {int(tot.loc[y + 1, 'stock']):,}"
             f" (diff {int(tot.loc[y + 1, 'stock'] - pred):+,}; exit-only exits {int(eo.get(y, 0)):,})")

# 4. commodity coverage
prod = js[(js.sc & 0b0111) > 0]
oth_bit = 1 << [g["id"] for g in meta["groups"]].index("othercrops")
has_group = (prod.gr & ~oth_bit) > 0
cov = has_group.mean()
check("commodity coverage >= 95% of crops/livestock/wild-crops spells", cov >= 0.95, f"({cov:.1%})")
none = (prod.gr == 0).mean()
L.append(f"  production spells with no commodity text: {none:.1%}; 'Other' only: {((prod.gr == oth_bit)).mean():.1%}")

# spot rows
L.append("\nSpot rows (for checking against OID):")
for s in ["Tennessee", "California", "Vermont"]:
    r = st[(st.state == s) & (st.year == 2024)].iloc[0]
    L.append(f"  {s} 2024: stock {r.stock}, entries {r.entries}, exits {r.exits}, net {r.net_change}")

full = [y for y in YEARS if y != meta["partial_year"]]
stats = {
    "version": meta["version"], "source_doi": meta["source"]["doi"], "source_md5": meta["source"]["md5"],
    "years_full": [full[0], full[-1]], "partial_year": meta["partial_year"],
    "n_spells": int(len(js)), "n_states": len(states), "n_certifiers": len(certs),
    "n_groups": len(meta["groups"]),
    "entries_total_full_years": int(tot.loc[full, "entries"].sum()),
    "exits_total_full_years": int(tot.loc[full, "exits"].sum()),
    "net_total_full_years": int(tot.loc[full, "entries"].sum() - tot.loc[full, "exits"].sum()),
    "stock_by_year": {int(y): int(tot.loc[y, "stock"]) for y in YEARS},
    "entries_by_year": {int(y): int(tot.loc[y, "entries"]) for y in YEARS},
    "exits_by_year": {int(y): int(tot.loc[y, "exits"]) for y in YEARS},
    "commodity_coverage": round(float(cov), 4),
    "qa_failures": len(fails),
}
(D / "stats.json").write_text(json.dumps(stats, indent=1))
L.insert(0, f"Churn Explorer QA — {len(fails)} failure(s)\n")
(D / "qa_report.txt").write_text("\n".join(L) + "\n")
print("\n".join(L))
sys.exit(1 if fails else 0)

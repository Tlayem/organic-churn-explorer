"""Build the Churn Explorer data from The U.S. Organic Certification Panel.

Input : ocp_spells.csv.gz from the panel (concept DOI 10.5281/zenodo.23130739).
Output: data/spells.json (compact columnar, read by the site), data/meta.json,
        data/churn_*_year.csv (flat downloads), data/commodity_audit.csv.

Usage : python code/01_build.py path/to/ocp_spells.csv.gz
"""
import hashlib, json, re, sys
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data"
OUT.mkdir(exist_ok=True)
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "input" / "ocp_spells.csv.gz"

FIRST_SNAP = pd.Timestamp("2017-03-16")
LAST_SNAP = pd.Timestamp("2026-10-01")
YEARS = list(range(2018, 2027))          # 2026 partial (Jan-Sep)
PARTIAL_YEAR = 2026
SCOPES = ["crops", "livestock", "wildcrops", "handling"]
EXIT_TYPES = ["surrendered", "suspended", "revoked", "dropped_from_listing"]

STATE_FIX = {"NM": "New Mexico", "Adjuntas": "Puerto Rico", "San Sebastian": "Puerto Rico",
             "Virgin Islands": "U.S. Virgin Islands"}
USPS = {"Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO",
        "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA",
        "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
        "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA",
        "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT",
        "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
        "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
        "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
        "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
        "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "Puerto Rico": "PR",
        "U.S. Virgin Islands": "VI", "Guam": "GU", "American Samoa": "AS", "Northern Mariana Islands": "MP"}


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def is_true(s):
    return s.astype(str).eq("True")


# ---------- commodity classifier ----------
RULES = json.loads((ROOT / "code" / "commodity_rules.json").read_text())
GROUP_IDS = [g["id"] for g in RULES["groups"]]
KW = {g: re.compile("(?:" + pat + ")", re.I) for g, pat in RULES["keywords"].items()}
EXCL = re.compile(RULES["exclude_items"], re.I)


def classify_item(item):
    """Return (set of groups, cleaned item) for one OID item string."""
    item = item.strip().strip("*").strip()
    if not item:
        return set(), ""
    cat, sep, rest = item.partition(":")
    if sep and len(cat) < 45:
        cat_l = cat.strip().lower()
        text = rest.strip()
        for key, g in RULES["category_map"].items():
            if key in cat_l and not (key == "flowers" and "vegetable" in cat_l):
                return {g}, text
    else:
        text = item
    if not text or EXCL.match(text):
        return set(), text
    full = item if sep else text          # unmapped category words (e.g. "Cattle:") count as keywords
    found = {g for g, rx in KW.items() if rx.search(full)}
    if "dairy" in found:
        found.discard("beef")           # dairy cattle are not beef unless only beef words match
    return found, text


def spell_groups(row, audit):
    groups = set()
    any_item = False
    for sc in ["crops", "livestock", "wildcrops"]:
        v = row["commodities_" + sc]
        if not isinstance(v, str):
            continue
        for it in re.split(r";\s*", v):
            g, text = classify_item(it)
            if text and not EXCL.match(text):
                any_item = True
                if not g:
                    audit[text.lower()] = audit.get(text.lower(), 0) + 1
            groups |= g
    if any_item and not groups:
        groups.add("othercrops")
    return groups


def main():
    sp = pd.read_csv(SRC, low_memory=False, dtype={"certifier_code": str, "county_fips": str},
                     parse_dates=["spell_start", "spell_end"])
    n_all = len(sp)
    sp = sp[is_true(sp["us_located"])].copy()

    # geography
    sp["state"] = sp["state"].replace(STATE_FIX)
    sp.loc[sp["country"].str.contains("Puerto Rico", na=False), "state"] = "Puerto Rico"
    sp.loc[sp["country"].str.contains("Virgin Islands", na=False), "state"] = "U.S. Virgin Islands"
    sp["state"] = sp["state"].where(sp["state"].isin(USPS), "Unknown")

    # flags
    transfer_out = is_true(sp["exit_is_transfer"])
    start_known = is_true(sp["start_known"])
    sp["is_entry"] = start_known & (sp["spell_start"] >= FIRST_SNAP) & sp["linked_prev_spell_id"].isna()
    sp["is_transfer_in"] = start_known & sp["linked_prev_spell_id"].notna()
    sp["xtype"] = sp["end_type"].where(sp["end_type"].isin(EXIT_TYPES))
    sp.loc[transfer_out & sp["spell_end"].notna(), "xtype"] = "transfer"
    sp["sy"] = sp["spell_start"].dt.year.where(start_known)
    sp["xy"] = sp["spell_end"].dt.year
    sp.loc[sp["xtype"].isna(), "xy"] = pd.NA          # open (censored) spells

    # certifier labels: most recent name per code
    sp["certifier_code"] = sp["certifier_code"].fillna("NA").str.zfill(3)
    last_name = (sp.sort_values("last_snapshot_in_spell").groupby("certifier_code")["certifier_end"].last())
    cert_label = {c: (f"{c} · Transitioning to New Certifier (OID placeholder)" if c == "000" else f"{c} · {n}")
                  for c, n in last_name.items()}

    # scopes and groups
    audit = {}
    sp["groups"] = sp.apply(lambda r: spell_groups(r, audit), axis=1)
    scope_bits = sum((is_true(sp[f"scope_{s}_ever"]).astype(int) * (1 << i)) for i, s in enumerate(SCOPES))
    group_bits = sp["groups"].apply(lambda gs: sum(1 << GROUP_IDS.index(g) for g in gs))

    # keep spells relevant to 2018+ (stock, entries, exits); drop those ended before 2018
    keep = sp["xy"].isna() | (sp["xy"] >= YEARS[0]) | (sp["sy"] >= YEARS[0])
    sp = sp[keep].copy()
    scope_bits, group_bits = scope_bits[sp.index], group_bits[sp.index]

    states = sorted(sp["state"].unique(), key=lambda s: (s == "Unknown", s))
    certs = sorted(sp["certifier_code"].unique())
    st_idx = {s: i for i, s in enumerate(states)}
    ce_idx = {c: i for i, c in enumerate(certs)}
    XT = ["open"] + EXIT_TYPES + ["transfer"]

    def col(series, fill=-1):
        return [int(x) if pd.notna(x) else fill for x in series]

    data = {
        "st": [st_idx[s] for s in sp["state"]],
        "ce": [ce_idx[c] for c in sp["certifier_code"]],
        "sy": col(sp["sy"]),                          # start year (-1 unknown)
        "en": sp["is_entry"].astype(int).tolist(),    # 1 = new entrant
        "ti": sp["is_transfer_in"].astype(int).tolist(),
        "xy": col(sp["xy"]),                          # exit year (-1 open)
        "xt": [XT.index(x) if isinstance(x, str) else 0 for x in sp["xtype"]],
        "sc": scope_bits.astype(int).tolist(),
        "gr": group_bits.astype(int).tolist(),
    }
    (OUT / "spells.json").write_text(json.dumps(data, separators=(",", ":")))

    meta = {
        "title": "The Organic Certification Churn Explorer",
        "version": "1.0.0",
        "source": {"name": "The U.S. Organic Certification Panel", "version": "1.0.0",
                   "doi": "10.5281/zenodo.23130740", "concept_doi": "10.5281/zenodo.23130739", "file": "ocp_spells.csv.gz", "md5": md5(SRC)},
        "first_snapshot": str(FIRST_SNAP.date()), "last_snapshot": str(LAST_SNAP.date()),
        "years": YEARS, "partial_year": PARTIAL_YEAR,
        "states": [{"name": s, "abbr": USPS.get(s, "??")} for s in states],
        "certifiers": [{"code": c, "label": cert_label.get(c, c)} for c in certs],
        "scopes": [{"id": s, "label": {"crops": "Crops", "livestock": "Livestock", "wildcrops": "Wild crops",
                                       "handling": "Handling"}[s]} for s in SCOPES],
        "groups": RULES["groups"],
        "exit_types": XT,
        "n_spells": len(sp), "n_spells_panel": n_all,
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1))

    # ---- flat yearly tables (for download and QA) ----
    def table(sp, key_series, key_name, extra_transfers=False):
        rows = []
        k = key_series
        for y in YEARS:
            stock = ((sp["sy"] < y) & (sp["xy"].isna() | (sp["xy"] >= y)))
            ent = sp["is_entry"] & (sp["sy"] == y)
            ex = sp["xy"].eq(y)
            df = pd.DataFrame({key_name: k, "stock": stock, "entries": ent,
                               **{f"exits_{t}": ex & sp["xtype"].eq(t) for t in EXIT_TYPES},
                               "transfers_out": ex & sp["xtype"].eq("transfer"),
                               "transfers_in": sp["is_transfer_in"] & (sp["sy"] == y)})
            g = df.groupby(key_name).sum().reset_index()
            g.insert(1, "year", y)
            rows.append(g)
        t = pd.concat(rows)
        t["exits"] = t[[f"exits_{x}" for x in EXIT_TYPES]].sum(axis=1)
        t["net_change"] = t["entries"] - t["exits"]
        if extra_transfers:
            t["net_change_incl_transfers"] = t["net_change"] + t["transfers_in"] - t["transfers_out"]
        t["entry_rate"] = (t["entries"] / t["stock"]).round(4)
        t["exit_rate"] = (t["exits"] / t["stock"]).round(4)
        t["partial_year"] = t["year"].eq(PARTIAL_YEAR)
        return t

    table(sp, sp["state"], "state").to_csv(OUT / "churn_state_year.csv", index=False)
    table(sp, sp["certifier_code"].map(cert_label), "certifier", True).to_csv(
        OUT / "churn_certifier_year.csv", index=False)
    # groups: long format, one spell can count in several groups
    lbl = {g["id"]: g["label"] for g in RULES["groups"]}
    long = sp["groups"].apply(sorted).explode().dropna()
    sub = sp.loc[long.index]
    parts = []
    for i, s in enumerate(SCOPES):
        m = sp[is_true(sp[f"scope_{s}_ever"])]
        parts.append(table(m, pd.Series("Scope: " + meta["scopes"][i]["label"], index=m.index), "commodity_group"))
    parts.append(table(sub, pd.Series(long.map(lbl).values, index=sub.index), "commodity_group"))
    tg = pd.concat(parts)
    tg.to_csv(OUT / "churn_group_year.csv", index=False)

    pd.Series(audit).sort_values(ascending=False).rename("n").rename_axis("unclassified_item") \
        .to_csv(OUT / "commodity_audit.csv")
    print(f"spells kept {len(sp):,} of {n_all:,}; states {len(states)}; certifiers {len(certs)}; "
          f"unclassified distinct items {len(audit):,}")


if __name__ == "__main__":
    main()

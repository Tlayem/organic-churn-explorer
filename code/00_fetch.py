"""Fetch the panel's spell file and log provenance (URL, date, bytes, SHA-256, md5).

The file is taken from the tagged v1.0.0 release of the panel repository, which is the same
content archived on Zenodo (concept DOI 10.5281/zenodo.23130739). The md5 is checked against
the value recorded in data/meta.json.
"""
import datetime, hashlib, urllib.request
from pathlib import Path

URL = "https://github.com/Tlayem/us-organic-certification-panel/raw/v1.0.0/data/processed/ocp_spells.csv.gz"
EXPECTED_MD5 = "15025d1716880d50937bf3537f7573cb"
ROOT = Path(__file__).resolve().parents[1]
dest = ROOT / "input" / "ocp_spells.csv.gz"
dest.parent.mkdir(exist_ok=True)

urllib.request.urlretrieve(URL, dest)
b = dest.read_bytes()
md5, sha = hashlib.md5(b).hexdigest(), hashlib.sha256(b).hexdigest()
if md5 != EXPECTED_MD5:
    raise SystemExit(f"md5 mismatch: got {md5}, expected {EXPECTED_MD5}")
line = f"{datetime.datetime.utcnow():%Y-%m-%dT%H:%M:%SZ}\t{URL}\t{len(b)}\tsha256={sha}\tmd5={md5}\n"
with open(ROOT / "data" / "PROVENANCE.txt", "a") as f:
    f.write(line)
print(line.strip())

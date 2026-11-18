#!/usr/bin/env bash
# Rebuild everything from the published panel. Run from the repository root.
set -euo pipefail
python code/00_fetch.py
python code/01_build.py input/ocp_spells.csv.gz
python code/02_qa.py input/ocp_spells.csv.gz

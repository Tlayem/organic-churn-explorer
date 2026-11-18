# Publish guide: The Organic Certification Churn Explorer

Do this only after every box in `docs/VERIFY_CHECKLIST.md` is ticked. Total time: about 25 minutes.

**What can be automated.** Claude can create the GitHub repository, push, and turn on GitHub Pages if you give it a token for that session (fine-grained, repository `organic-churn-explorer` only, permissions *Contents: read/write*, *Pages: read/write*, *Administration: read/write*; revoke it afterwards). Zenodo is not reachable from Claude's sandbox, so the Zenodo switch and DOI step are yours.

## 1. Zenodo ↔ GitHub (2 minutes, do after step 2 creates the repo)

zenodo.org → log in with ORCID → top-right menu → **GitHub** → **Sync now** → switch `Tlayem/organic-churn-explorer` **On**.

## 2. GitHub repository

Either let Claude push, or with GitHub Desktop (avoid OneDrive paths and leading spaces in the folder path):

1. github.com/new → owner `Tlayem`, name `organic-churn-explorer`, **Public**, no README.
2. Add the project folder as a local repository → commit "The Organic Certification Churn Explorer v1.0.0" → Publish/Push to `main`.
   Do not add the `input/` folder (it is in `.gitignore`).

## 3. Turn on GitHub Pages (2 minutes)

Repository → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch `main`, folder `/ (root)` → **Save**. After 1–2 minutes the site is live at **https://tlayem.github.io/organic-churn-explorer/**. Open it and check the map and table load.

## 4. Release → DOI

With the Zenodo switch On: **Releases** → **Draft a new release** → tag `v1.0.0`, title `The Organic Certification Churn Explorer v1.0.0`, description = the abstract in `CITATION.cff` → **Publish release**. Zenodo creates the record from `.zenodo.json` within minutes. Check the live page shows your name, ORCID and the MIT licence, and click **Publish** if Zenodo saved any edit as a draft.

## 5. Put the DOI in (same day)

Copy the **concept DOI** ("Cite all versions"). Replace `[VERIFY: Zenodo DOI after release]` in `index.html` (Cite box) and `README.md`, add `doi:` to `CITATION.cff`, commit, push. Pages updates by itself.

## 6. Future CV line and evidence log

Future CV line:
`The Organic Certification Churn Explorer — entry, exit and net change by state, commodity and certifier. https://tlayem.github.io/organic-churn-explorer/ (doi:<concept DOI>)`

```
date,artifact_or_event,type,venue_or_host,link_or_doi,status,prong_tags,metrics_snapshot,files_saved,notes
<release date>,The Organic Certification Churn Explorer v1.0.0,interactive resource,GitHub Pages + Zenodo,<site URL>; <concept DOI>,live,,0 views at release,site.pdf; zenodo_record.pdf; github_release.pdf,Version DOI <version DOI>; built on doi:10.5281/zenodo.23130739
```
Save PDFs of the live site, the Zenodo record and the GitHub release the same day. Optionally add the explorer to the panel's Zenodo record as a related work ("Is source of").

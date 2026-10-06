# RobotWorld Demo

Static source and presentation assets for the RobotWorld demo website.

## Preview

Run `python3 -m http.server 8000` from this directory, then open
`http://localhost:8000/`. The Chinese homepage is `index-zh.html`.

## Contents

- English and Chinese homepages and blog pages.
- Selected results for five models, 84 tasks each, including drone volleyball 1v1.
- 407 available task recordings and their posters, plus overview videos and showreels.
- Scores and recorded-usage summaries used by the interactive tables and charts.

The snapshot adopts the RoboDojo Shell-on cohort. Nine runs have no recording
because they stopped without executing an action; another four recordings could
not be read because their MP4 containers were not finalized. Those task results
remain in the data. Gemini cost is unavailable pending a verified price.

Raw experiment logs, credentials, private runtime directories, and internal
trajectory-review pages are not included. Media paths are local to this repository;
the site does not depend on the original LAN server.

## Hosting Status

GitHub Pages has not been enabled as part of this upload. This complete source
bundle exceeds the 1 GB published-site limit, so deployable Pages content will
need a separate media host or a smaller media distribution before publishing.

Some existing paper/code and release-review placeholders remain unchanged.
This repository is the demo website, not the benchmark implementation.

## Rights

No blanket license is granted by this upload. The bundled Google Sans Code font
has its license in `google-sans-code-OFL.txt`. Other source and media rights remain
with their respective owners.

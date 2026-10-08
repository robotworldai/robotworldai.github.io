# RobotWorld Demo

Static source and presentation assets for the RobotWorld demo website.

## Preview

Run `python3 -m http.server 8000` from this directory, then open
`http://localhost:8000/`. The Chinese homepage is `/zh/`.
Serve this repository at the site root; local URLs are root-relative.

## Directory Structure

```text
index.html          English homepage
zh/                 Chinese homepage
blog/               English blog; Chinese blog in blog/zh/
showreel/           Showreel pages
data/               Results, usage summaries, and media tile indexes
assets/
  css/              Stylesheets
  js/               Browser scripts
  fonts/            Font and its license
  images/           Posters and image sprites
  videos/           Overview and promotional videos
  recordings/       Task recordings and their posters
```

`404.html` redirects the previous blog and Chinese homepage URLs to their new
locations, preserving query parameters and section anchors on GitHub Pages.

## Contents

- English and Chinese homepages and blog pages.
- Selected results for five models, 84 tasks each, including drone volleyball 1v1.
- 407 available task recordings and their posters, plus overview videos and showreels.
- Scores and recorded-usage summaries used by the interactive tables and charts.

The snapshot adopts the RoboDojo Shell-on cohort. Nine runs have no recording
because they stopped without executing an action; another four recordings could
not be read because their MP4 containers were not finalized. Those task results
remain in the data. Gemini 3.8 Flash token inference cost uses the October 7,
2026 OpenRouter/Google standard list prices: $0.75 per million fresh input tokens,
$0.075 per million cached input tokens, and $3.75 per million output tokens
(including thinking). Upstream billing usage is used, not context-window counts.
Separately billed cache storage and grounding are excluded from this estimate.

Raw experiment logs, credentials, private runtime directories, and internal
trajectory-review pages are not included. Media paths are local to this repository;
the site does not depend on the original LAN server.

## Hosting Status

GitHub Pages is enabled at https://robotworldai.github.io/ using the root of
the `main` branch. The complete bundle is large; separate media hosting is
recommended for long-term maintenance.

Some existing paper/code and release-review placeholders remain unchanged.
This repository is the demo website, not the benchmark implementation.

## Embodiment atlas

The homepage embodiment atlas is maintained in `data/embodiments.json` and
rendered by `assets/js/embodiments.js`. It maps the 84 published tasks to 18
embodiments with 20 evaluated controller profiles. Panda appears once, with
joint-increment, DROID and cup-catching profiles selectable in the right-hand detail panel.
The desktop layout keeps the robot gallery on the left and selected-robot details
on the right, below a compact two-row action-space overview. Mobile stacks the
detail panel below a scrollable gallery; tapping a robot brings its details into view.
Robot and task-domain mouse previews return to the overview on exit, with a
220 ms grace period for moving into a robot or the detail panel. Domain hover
highlights matching bodies in place, without rearranging the gallery. Keyboard
focus and touch can narrow the gallery; touch filters remain until cleared.
Action dimensions count native controller input scalars, not hardware DOF.
The Unified Action Space is a 12-component semantic union, not a newly implemented
fixed-length backend vector. Overview values are independent component maxima;
they are not added together. A robot/profile selection highlights only its native
channels. Joint-space arms and Cartesian EEF commands are separate components.
Run `node tests/embodiments.mjs` to check counts, mappings, assets and bilingual integration.

Robot cutout provenance and background-extraction prompts are recorded in
`data/embodiment-sources.json`. Some images show a hardware family or component,
as explicitly noted in the atlas; three custom research platforms remain unpictured.
Third-party image redistribution permissions must be reviewed before public deployment.

## Rights

No blanket license is granted by this upload. The bundled Google Sans Code font
has its license in `assets/fonts/google-sans-code-OFL.txt`. Other source and media rights remain
with their respective owners.

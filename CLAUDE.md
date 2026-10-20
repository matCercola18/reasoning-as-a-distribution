# Notes for agents working on this site

Project page for *Reasoning as a Distribution: Generative Plan Latents for VLA Models* (GPL).
The page will be linked from the arXiv version of the paper. `README.md` has the layout and the
media provenance table; this file has the context and rules that are not visible in the code.

## Status (2026-10-12)

- Repo `matCercola18/reasoning-as-a-distribution`, branch `main`, **public** since 2026-10-20 and
  served by GitHub Pages (`main` / root) at https://matcercola18.github.io/reasoning-as-a-distribution/,
  the URL printed in the arXiv PDF. Every push to `main` redeploys the live site.
- Open TODOs (search `TODO` in `index.html`): PDF/arXiv/code links and the arXiv BibTeX, once the
  paper is announced on arXiv.
- Structure since 2026-10-19 (owner asked for less text, punchier claims, outcome adaptation
  highlighted): hero → three-verb summary tiles → problem toy → one section per capability
  (Sample, Steer, Adapt) → when it matters → how it works → beyond → scope. Results first, method
  late. Each result = one bold statement + one visual + one number; provenance goes in a collapsed
  `<details>` block under it, never in the main text. No tabs for primary results.
- Color rule (one meaning per color, page-wide): mint = GPL, gray = every baseline, red = failure,
  blue / amber = pick / push (matches the colors burned into `adapt_demo.mp4`).
- Background (2026-10-19, owner found near-black too dark): slate `--bg` #1b2129 for content,
  near-black `--bg-deep` #0d1117 only in the hero, fading into the slate.
- Paper figures are not used except the architecture diagram; results are native charts/bars
  (dark theme). The old sim steering clips `R1-guided-L/R` were dropped (`R1-guided-R` slipped).

## Rules from the owner

- **No failing or jerky clips where the text implies success.** Robot (SO-101) clips must come
  from the smoothed motion controller (October 5 sessions); the October 2 `r2_g0` footage is jerky.
  Hero and steering clips use condition `normal` (upright roll on the table), not the lying roll or
  the raised block.
- **Original design.** Take ideas from reference sites but never copy their look (the cream
  background of the Pinocchio page was rejected). Current identity: dark "flow field" theme,
  Bricolage Grotesque + IBM Plex, colors as tokens on `:root` in `static/css/style.css`.
- **Low-quality media gets redone or removed**, not kept (the old plan-sampling video was replaced
  by the interactive canvas built by `tools/render_plan_samples.py`).
- **Every number must trace to the paper or a result file.** A full audit (~270 items) was done on
  2026-10-12. Hardware numbers not in the paper come from
  `latent-reasoning-vla/results/so101_hw_eval_20261005/`. Do not add the 1-minute explainer video
  (`latent-reasoning-vla/video/out/short_1min.mp4`): its outcome-adaptation numbers were removed
  from the paper.
- No credentials in the repo or in commands. Pushes use `GIT_TOKEN` from
  `/home/cercola/Continuous-Reasoning/.env` through a `GIT_ASKPASS` helper: a two-line script that prints
  `x-access-token` for the username prompt and `$GIT_TOKEN` for the password prompt (the `gh` CLI
  token on virgo is invalid).

## Where the media comes from

All paths below are relative to `/home/cercola/Continuous-Reasoning/latent-reasoning-vla`.

- Sim clips: `video/media/clips/<name>.mp4` (sidecar `<name>.json` gives executor, plan, outcome),
  and the full run pools in `video/media/sim_raw/<job>/clips/`, named
  `L<layout>_<arm>_t<target>_r<rep>_d<draw>__commit<L|R>_grasp<0|1>.mp4`. Pick replacements from
  the pool by sidecar fields (`commit`, `grasped`, `success`), then check the frames.
- Encoding for sim clips: H.264, `-t <end_s>`, `scale='min(640,iw)':-2`, `-crf 28 -preset slow
  -pix_fmt yuv420p -movflags +faststart -an`; poster = frame at 0.8 s (`-q:v 4`). ffmpeg lives at
  `/home/cercola/miniconda3/envs/video_manim/bin/ffmpeg`.
- SO-101 clips: workspace-camera cuts at 2× real time from the robot sessions in
  `data/so101/eval/` (also on the public HF dataset `so101_gpl_eval`). Run ids are in `README.md`.
  Check new robot footage frame by frame for hands or faces before publishing.
- Figures: `paper/figures/*.pdf` rendered to WebP at about 2000 px wide.
- Plan-draw canvas: `CUDA_VISIBLE_DEVICES=0 ~/miniconda3/envs/simpler_eval/bin/python
  tools/render_plan_samples.py` (GPU 0 only on virgo; GPU 1 is a display card).

## Checking changes

- `python tools/site_check.py` (needs `pip install playwright`) loads the page in headless Chromium
  at desktop and phone width and exercises every widget; it must print ALL CHECKS PASSED.
- After changing `style.css` or any `static/js/*.js`, bump the `?v=` stamp on its URL in
  `index.html`. Without it, browsers keep the old file next to the new HTML (2026-10-19: the
  owner saw unstyled tiles, black chart lines and a blank toy from exactly this).
- `node static/js/flow.js` self-checks the playground math.
- `node --check static/js/main.js` after JS edits; keep `<div>` balance per section (a stray
  `</div>` once moved clips into the wrong tab).
- Screenshots: headless Firefox (snap) cannot write to `/tmp`; use `~/gpl-shots/shot.sh <name>
  <width> <height>`. Its profile sets `ui.prefersReducedMotion=1`, so captures are static.
  Headless captures ignore scrolling: use a tall window (e.g. 1400×15000) and crop.
- Commit, then push to `origin main`.

# Notes for agents working on this site

Project page for *Reasoning as a Distribution: Generative Plan Latents for VLA Models* (GPL).
The page will be linked from the arXiv version of the paper. `README.md` has the layout and the
media provenance table; this file has the context and rules that are not visible in the code.

## Status (2026-10-12)

- Repo `matCercola18/reasoning-as-a-distribution`, branch `main`, **private** for now. The owner
  makes it public and enables Pages (Settings → Pages → `main` / root) after filling the TODOs.
- Open TODOs (search `TODO` in `index.html`): authors, affiliations, PDF/arXiv/code links, BibTeX.
- Known weak clip: Steering tab, `R1-guided-R` (guided toward the right cube) slips after the lift,
  and its caption says so. None of the 12 guided-right runs in the source pool lifts; replacing it
  needs new π0 runs in SimplerEnv (the w = 8 plan lands about 17 cm past the cube on layout 20, so
  try a lower w).

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

- `node static/js/flow.js` self-checks the playground math.
- `node --check static/js/main.js` after JS edits; keep `<div>` balance per section (a stray
  `</div>` once moved clips into the wrong tab).
- Screenshots: headless Firefox (snap) cannot write to `/tmp`; use `~/gpl-shots/shot.sh <name>
  <width> <height>`. Its profile sets `ui.prefersReducedMotion=1`, so captures are static.
  Headless captures ignore scrolling: use a tall window (e.g. 1400×15000) and crop.
- Commit, then push to `origin main`.

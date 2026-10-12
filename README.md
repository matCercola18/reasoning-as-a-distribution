# Reasoning as a Distribution — project page

Static site for *Reasoning as a Distribution: Generative Plan Latents for Vision–Language–Action
Models*. Plain HTML/CSS/JS, no build step.

```bash
python3 -m http.server 8000     # then open http://localhost:8000
node static/js/flow.js          # self-check of the playground's flow math
```

## Before going public

1. Fill in the authors, affiliations and links: search `index.html` for `TODO`.
2. Make the repo public, then Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

## Layout

| path | what |
|---|---|
| `index.html` | the page |
| `static/css/style.css` | styles (dark theme) |
| `static/js/main.js` | video playback, clip switchers, chapters, charts, playground |
| `static/js/flow.js` | toy rectified-flow model behind the playground |
| `static/js/plan_samples.js` | flow draws for the "plan draws on the scene image" figure |
| `tools/render_plan_samples.py` | rebuilds that figure's frames at 3× camera resolution (SimplerEnv, GPU) |
| `static/img/` | paper figures (WebP, rendered from the paper PDFs) |
| `static/media/` | web encodes of the simulation and SO-101 robot videos |

Chart values are copied from the paper's result files; each chart's JSON sits next to it in
`index.html`.

## Media provenance

Simulation clips are web encodes (H.264, CRF 28) of the explainer-video clip pool
(`latent-reasoning-vla/video/media/clips/<same name>.mp4`), trimmed to the action.
`adapt_demo.mp4` is a re-encode of `results/so101_demo/outcome_adaptation_demo.mp4`.
The other SO-101 clips are workspace-camera cuts at 2× real time from the robot sessions
(public HF dataset `so101_gpl_eval`):

| clip | session | run id | plan | outcome |
|---|---|---|---|---|
| `hero_pick` | lying_base_2 (cond normal) | 20261005-165309-003 | r:pick | success |
| `hero_push` | lying_base_2 (cond normal) | 20261005-165309-007 | r:push | success |
| `steer_pick` | lying_base_2 (cond normal) | 20261005-165309-021 | r:pick | success |
| `steer_push` | lying_base_2 (cond normal) | 20261005-165309-027 | r:push | success |
| `raised_pick_ok` | raised_base | 20261005-141712-006 | pick | success |
| `raised_push_fail` | raised_base | 20261005-141712-007 | push | failure |
| `lying_pick_fail` | lying_2 | 20261005-122538-001 | adapt → pick | failure |
| `lying_push_ok` | lying_2 | 20261005-122538-002 | adapt → push | success |

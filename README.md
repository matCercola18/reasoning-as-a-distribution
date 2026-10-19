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
| `static/js/main.js` | video playback, clip switchers, chapters, charts, the two toys (steer, adapt) |
| `static/js/flow.js` | toy rectified-flow model behind the toys |
| `static/js/plan_samples.js` | flow draws for the "plan draws on the scene image" figure |
| `tools/site_check.py` | headless-browser check of every widget, file and anchor (`pip install playwright`) |
| `tools/render_plan_samples.py` | rebuilds that figure's frames at 3× camera resolution (SimplerEnv, GPU) |
| `static/img/` | the architecture figure (WebP, from the paper PDF) and the plan-draw scene images |
| `static/media/` | web encodes of the simulation and SO-101 robot videos |

Chart and bar values are copied from the paper and its result files; each chart's JSON sits next
to it in `index.html`. Adaptation numbers not printed in the paper text come from
`latent-reasoning-vla/star/si_compute_frontier_result.json` (retraining vs compute),
`star/order_cost_si_agg.json` (path-length regret, % above the cheapest order) and the four-task
panel of `paper/figures/fig_contact_sketch_battery.pdf`.

## Media provenance

Simulation clips are web encodes (H.264, CRF 28) of the explainer-video clip pool
(`latent-reasoning-vla/video/media/clips/<same name>.mp4`), trimmed to the action, except
`R1-sample.a`/`.b`: draws 1 and 3 of layout 10, rep 2 in
`video/media/sim_raw/R1c_twocube_sample/clips/` (both grasp and lift; no right-cube draw of the
explainer's layout 20 does).
`adapt_demo.mp4` is a web encode (H.264, CRF 26, 1920×1080) of `results/so101_demo/outcome_adaptation_demo.mp4`,
rendered by `hardware/so101_adapt_video.py`; its poster is the frame at 15.6 s.
The other SO-101 clips are workspace-camera cuts at 2× real time from the robot sessions
(public HF dataset `so101_gpl_eval`):

| clip | session | run id | plan | outcome |
|---|---|---|---|---|
| `hero_pick` | lying_base_2 (cond normal) | 20261005-165309-003 | r:pick | success |
| `hero_push` | lying_base_2 (cond normal) | 20261005-165309-007 | r:push | success |
| `steer_pick` | lying_base_2 (cond normal) | 20261005-165309-021 | r:pick | success |
| `steer_push` | lying_base_2 (cond normal) | 20261005-165309-027 | r:push | success |

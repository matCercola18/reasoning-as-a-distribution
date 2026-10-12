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
| `static/css/style.css` | styles (light and dark) |
| `static/js/main.js` | video playback, clip switchers, chapters, charts, playground |
| `static/js/flow.js` | toy rectified-flow model behind the playground |
| `static/img/` | paper figures (WebP, rendered from the paper PDFs) |
| `static/media/` | web encodes of the simulation and SO-101 robot videos |

Chart values are copied from the paper's result files; each chart's JSON sits next to it in
`index.html`.

"""Browser check of the page: serves the repo, loads it with JS and animations on (desktop and phone
widths), exercises every widget, and reports console errors, missing files, dead anchors, sideways
overflow and broken interactions. Exit code 1 on any failure.

    pip install playwright && playwright install chromium      # once
    python tools/site_check.py [port]

Video playback is not tested (Playwright's Chromium has no H.264); check codecs with ffprobe."""
import sys, glob, os, subprocess, time, atexit
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8765"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "--bind", "127.0.0.1"], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
atexit.register(srv.terminate); time.sleep(2)
URL = f"http://127.0.0.1:{PORT}/index.html"
# any Chromium already in the Playwright cache works, whatever the Playwright version
CHROME = (sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome"))) or [None])[-1]
fails, notes = [], []
ok = lambda cond, msg: (None if cond else fails.append(msg))

def canvas_ink(page, sel):
    """Fraction of non-transparent pixels in a canvas (0 = blank)."""
    return page.eval_on_selector(sel, """c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n / (d.length / 4); }""")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME)
    for name, vp in [("desktop", dict(width=1440, height=900)), ("mobile", dict(width=390, height=844))]:
        ctx = b.new_context(viewport=vp, device_scale_factor=1)
        page = ctx.new_page()
        errs, bad = [], []
        page.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        page.on("response", lambda r: r.status >= 400 and bad.append(f"{r.status} {r.url}"))
        page.goto(URL, wait_until="networkidle")
        page.wait_for_function("document.querySelectorAll('.katex').length > 0", timeout=15000)
        tag = f"[{name}]"

        # ---- layout
        sw = page.evaluate("[document.documentElement.scrollWidth, innerWidth]")
        ok(sw[0] <= sw[1], f"{tag} horizontal overflow: scrollWidth {sw[0]} > {sw[1]}")
        wide = page.evaluate("""() => [...document.querySelectorAll('body *')].filter(e => {
            const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 &&
            !e.closest('pre, .tablewrap, .card .eq, .katex-display') && getComputedStyle(e).position !== 'fixed'; })
            .slice(0, 8).map(e => e.tagName + '.' + e.className + ' right=' + Math.round(e.getBoundingClientRect().right))""")
        ok(not wide, f"{tag} elements past the right edge: {wide}")

        # ---- CSS really applied (the bug the owner saw = stale CSS)
        ok(page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--base').trim()") != "", f"{tag} --base token missing")
        ok(page.eval_on_selector(".tile", "e => getComputedStyle(e).borderRadius") != "0px", f"{tag} .tile unstyled")

        # ---- every referenced file resolves
        srcs = page.evaluate("""() => [...document.querySelectorAll('video')].flatMap(v => [v.getAttribute('src'), v.getAttribute('poster')])
            .concat([...document.querySelectorAll('[data-src],[data-alt]')].flatMap(b => [b.dataset.src, b.dataset.alt]))
            .concat([...document.querySelectorAll('img[src]')].map(i => i.getAttribute('src'))).filter(Boolean)""")
        srcs += [s.replace(".mp4", ".jpg") for s in srcs if s.endswith(".mp4")]   # switchers load poster = src.jpg
        for s in sorted(set(srcs)):
            r = page.request.get(f"http://127.0.0.1:{PORT}/{s}")
            ok(r.status == 200, f"{tag} missing file {s} ({r.status})")
        # ---- anchors
        missing = page.evaluate("""() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href'))
            .filter(h => h.length > 1 && !document.querySelector(h))""")
        ok(not missing, f"{tag} dead anchors {missing}")
        dup = page.evaluate("""() => { const c = {}; document.querySelectorAll('[id]').forEach(e => c[e.id] = (c[e.id] || 0) + 1);
            return Object.keys(c).filter(k => c[k] > 1); }""")
        ok(not dup, f"{tag} duplicate ids {dup}")
        raw = page.evaluate("document.body.innerText.match(/\\\\\\(|\\\\\\[|\\\\mathcal|\\\\nabla/g)")
        ok(not raw, f"{tag} unrendered TeX left: {raw}")

        # ---- canvases draw
        page.wait_for_timeout(600)
        ok(canvas_ink(page, "#hero-flow") > 0.001, f"{tag} hero canvas blank")
        for sel in ["canvas[data-flow=mse]", "canvas[data-flow=wta]", "canvas[data-flow=gpl]"]:
            page.locator(sel).scroll_into_view_if_needed(); page.wait_for_timeout(1700)
            ok(canvas_ink(page, sel) > 0.001, f"{tag} toy {sel} blank after scroll")
        page.locator("canvas.plancv").first.scroll_into_view_if_needed(); page.wait_for_timeout(1200)
        for k in (0, 1):
            ok(canvas_ink(page, f"canvas.plancv[data-scene='{k}']") > 0.5, f"{tag} plan canvas {k} blank (scene image not drawn)")
        t0 = page.inner_text("#plan-tv"); page.wait_for_timeout(700); t1 = page.inner_text("#plan-tv")
        ok(t0 != t1, f"{tag} plan canvas not animating ({t0} -> {t1})")
        page.click("#plan-play"); ok(page.inner_text("#plan-play") == "Play", f"{tag} plan pause button")
        page.fill("#plan-t", "0.5"); page.dispatch_event("#plan-t", "input")
        ok(page.inner_text("#plan-tv") == "t = 0.50", f"{tag} plan t slider -> {page.inner_text('#plan-tv')}")

        # ---- steer toy
        page.locator("#pg-steer").scroll_into_view_if_needed(); page.wait_for_timeout(300)
        ok(canvas_ink(page, "#pg-steer") > 0.001, f"{tag} steer toy canvas blank")
        s0 = page.inner_text("#pg-share"); ok("/ 48" in s0, f"{tag} steer readout '{s0}'")
        page.fill("#pg-dose", "8"); page.dispatch_event("#pg-dose", "input")
        s1 = page.inner_text("#pg-share"); ok(s1 != s0 and page.inner_text("#pg-w") == "8.0", f"{tag} dose slider: {s0} -> {s1}")
        page.click("[data-request='1']")
        ok(page.get_attribute("[data-request='1']", "aria-pressed") == "true", f"{tag} right-cube button not pressed")
        notes.append(f"{tag} steer toy share: w0 {s0}, w8 left {s1}, w8 right {page.inner_text('#pg-share')}")

        # ---- adapt toy
        page.locator("#pg-adapt").scroll_into_view_if_needed()
        ok(canvas_ink(page, "#pg-adapt") > 0.001, f"{tag} adapt toy canvas blank")
        n = lambda: page.eval_on_selector("#pg-log", "e => e.children.length")
        page.click("#pg-run1"); ok(n() == 1, f"{tag} deploy once -> log {n()}")
        page.click("#pg-run10"); ok(n() == 11, f"{tag} deploy x10 -> log {n()}")
        ok(page.inner_text("#pg-exp") not in ("–", ""), f"{tag} expected-success readout empty")
        notes.append(f"{tag} adapt toy after 11: left {page.inner_text('#pg-t0')} right {page.inner_text('#pg-t1')} P(left) {page.inner_text('#pg-left')} exp {page.inner_text('#pg-exp')}")
        page.fill("#pg-beta", "3"); page.dispatch_event("#pg-beta", "input"); ok(page.inner_text("#pg-b") == "3", f"{tag} beta slider")
        page.click("#pg-reset"); ok(n() == 0, f"{tag} reset -> log {n()}")

        # ---- charts
        charts = page.query_selector_all("[data-chart]")
        ok(len(charts) == 4, f"{tag} expected 4 charts, found {len(charts)}")
        for i, c in enumerate(charts):
            c.scroll_into_view_if_needed()
            info = c.evaluate("""c => ({svg: !!c.querySelector('svg'), lines: c.querySelectorAll('polyline').length,
                out: c.querySelector('output').innerText,
                colors: [...c.querySelectorAll('polyline')].map(p => p.getAttribute('stroke')),
                sw: [...c.querySelectorAll('output i')].map(i => i.style.background)})""")
            ok(info["svg"] and info["lines"] >= 1, f"{tag} chart {i} not drawn")
            ok(all(col and not col.startswith("--") for col in info["colors"]), f"{tag} chart {i} unresolved colors {info['colors']}")
            ok(all(info["sw"]), f"{tag} chart {i} legend swatch without color {info['sw']}")
            sl = c.query_selector("input[type=range]"); before = info["out"]
            sl.evaluate("s => { s.value = 0; s.dispatchEvent(new Event('input')); }")
            after = c.evaluate("c => c.querySelector('output').innerText")
            ok(after != before or before.startswith(("q = 0",)), f"{tag} chart {i} slider does nothing")
            notes.append(f"{tag} chart {i}: {before.splitlines()[0] if before else '?'} | colors {info['colors']}")

        # ---- family switcher
        btns = page.query_selector_all("[data-switch] button")
        for bt in btns:
            bt.scroll_into_view_if_needed(); bt.click(); page.wait_for_timeout(100)
            a = page.get_attribute("#v-fam-a", "src"); bsrc = page.get_attribute("#v-fam-b", "src")
            chips = page.evaluate("[...document.querySelectorAll('#v-fam-a, #v-fam-b')].map(v => v.parentElement.querySelector('.chip').innerText)")
            ok(a == bt.get_attribute("data-src") and bsrc == bt.get_attribute("data-alt"), f"{tag} switcher {bt.inner_text()} videos not swapped")
            want = ["plan: " + c for c in bt.get_attribute("data-chips").split("|")]
            ok([c.lower() for c in chips] == [w.lower() for w in want], f"{tag} switcher {bt.inner_text()} chips {chips} != {want}")
            ok(page.inner_text("#cap-fam") == bt.get_attribute("data-cap"), f"{tag} switcher caption")
        page.click("[data-switch] button >> nth=0")

        # ---- chapters (seek only; this Chromium has no H.264)
        ch = page.query_selector_all("[data-chapters] button")
        ok(len(ch) == 4, f"{tag} chapters {len(ch)}")
        # ---- details, lightbox, copy
        for d in page.query_selector_all("details"):
            d.evaluate("d => d.open = true")
        ok(all(d.evaluate("d => d.open") for d in page.query_selector_all("details")), f"{tag} details won't open")
        mk = page.eval_on_selector("details summary", "s => getComputedStyle(s).listStyleType")
        ok(mk == "none", f"{tag} details marker still default ({mk})")
        page.click("figure.fig img"); ok(page.eval_on_selector("#lightbox", "d => d.open"), f"{tag} lightbox didn't open")
        page.click("#lightbox"); ok(not page.eval_on_selector("#lightbox", "d => d.open"), f"{tag} lightbox didn't close")
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=f"http://127.0.0.1:{PORT}")
        page.click("#copy-bib"); page.wait_for_timeout(100)
        ok(page.inner_text("#copy-bib") == "Copied", f"{tag} copy button -> {page.inner_text('#copy-bib')}")
        clip = page.evaluate("navigator.clipboard.readText()")
        ok(clip.startswith("@article{gpl2026"), f"{tag} clipboard got {clip[:30]!r}")

        ok(not errs, f"{tag} console: {errs}")
        ok(not bad, f"{tag} failed requests: {bad}")
        ctx.close()
    b.close()

print("\n".join(notes))
print("\nFAILS:" if fails else "\nALL CHECKS PASSED", *fails, sep="\n  ")
sys.exit(1 if fails else 0)

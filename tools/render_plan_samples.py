#!/usr/bin/env python3
"""High-resolution assets for the page's "plan draws on the scene image" figure.

latent-reasoning-vla/star/viz_reasoning_on_image.py drew 22 flow samples of one reasoner's
grasp keyframe on two SimplerEnv frames and saved them to star/hero_scenes.npz, but its
frames are 640x480 and each panel shows a 270 px crop. This script rebuilds the same two
scenes with the WidowX 3rd-view camera scaled 3x (rgbd mode: pure render, no photo overlay),
checks the objects sit where the saved scenes had them, crops each frame around the scene
centre, and projects every sample's grasp glyph into crop pixels for the canvas in main.js.

  CUDA_VISIBLE_DEVICES=0 ~/miniconda3/envs/simpler_eval/bin/python tools/render_plan_samples.py
Writes static/img/plan_s0.webp, static/img/plan_s1.webp, static/js/plan_samples.js.
"""
import json
import os
import sys

import numpy as np

os.environ.setdefault("DISPLAY", "")
REPO = "/home/cercola/Continuous-Reasoning/latent-reasoning-vla"
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for sub in ("gen", "gate1", "star"):
    sys.path.insert(0, os.path.join(REPO, sub))

S = 3                      # camera upscale
HALF = 135 * S             # crop half-width, same field of view as the original panels
L, CAP = 0.045, 0.02       # glyph half-length and cap half-length (m), as in the original

from mani_skill2_real2sim.sensors import camera as cam_mod  # noqa: E402

_init = cam_mod.CameraConfig.__init__


def _scaled_init(self, *a, **kw):
    if kw.get("uid") == "3rd_view_camera":
        kw["width"], kw["height"] = kw["width"] * S, kw["height"] * S
        if kw.get("intrinsic") is not None:
            k = np.array(kw["intrinsic"], float)
            k[:2] *= S
            kw["intrinsic"] = k
    _init(self, *a, **kw)


cam_mod.CameraConfig.__init__ = _scaled_init

import gymnasium as gym  # noqa: E402
from gate1_anchor_recoverability import project  # noqa: E402


def camera(base, obs):
    p = base.get_camera_params()["3rd_view_camera"]
    return p["intrinsic_cv"], p["extrinsic_cv"], np.asarray(obs["image"]["3rd_view_camera"]["rgb"])


def two_cube_scene():
    from make_dataset import build_configs, register_gen_env
    xy, meta = build_configs(40, 5, 0.2, np.random.default_rng(0))
    env = gym.make(register_gen_env(xy), obs_mode="rgbd", prepackaged_config=True)
    base = env.unwrapped
    for k in [k for k in range(len(xy)) if meta[k]["split"] == "test"]:   # same pick rule as the original
        obs, _ = env.reset(options={"obj_init_options": {"episode_id": k}})
        K, E, img = camera(base, obs)
        pa = np.asarray(base.episode_source_obj.pose.p, float)
        pb = np.asarray(base.episode_target_obj.pose.p, float)
        ca, cb = project(pa, K, E), project(pb, K, E)
        H, W = img.shape[:2]
        if all(0 < c[0] < W and 0 < c[1] < H for c in (ca, cb)) and np.linalg.norm(ca - cb) > 95 * S:
            env.close()
            objs = np.array([pa, pb])
            return img, K, E, objs[np.lexsort((objs[:, 1], objs[:, 0]))]
    raise RuntimeError("no two-cube scene matched")


def grasp_scene():
    from make_grasp_demos import scenes_from_cond
    from grasp_yaw_widowx import register_scaled, SCALE
    have = {int(s) for s in np.load(os.path.join(REPO, "star", "cond_grasp_wx.npz"))["scene_id"]}
    sids, xy, quat, phis, splits = scenes_from_cond()
    env = gym.make(register_scaled(SCALE, xy, quat), obs_mode="rgbd", prepackaged_config=True)
    base = env.unwrapped
    cand = [k for k in range(len(sids)) if splits[k] == "test" and int(sids[k]) in have]
    k = min(cand, key=lambda k: abs(abs(phis[k] % (np.pi / 2)) - np.pi / 4))
    obs, _ = env.reset(options={"obj_init_options": {"episode_id": k}})
    K, E, img = camera(base, obs)
    cube = np.asarray(base.episode_source_obj.pose.p, float)
    env.close()
    return img, K, E, cube[None]


def bar(center, yaw, K, E, half=L):
    d = np.array([np.cos(yaw), np.sin(yaw), 0.0])
    return np.concatenate([project(center + d * half, K, E), project(center - d * half, K, E)])


def export(i, img, K, E, objs, saved):
    from PIL import Image
    assert np.allclose(objs, saved[f"s{i}_objects"], atol=2e-3), (objs, saved[f"s{i}_objects"])
    c = project(saved[f"s{i}_center"], K, E)
    x0 = int(np.clip(round(c[0]) - HALF, 0, img.shape[1] - 2 * HALF))
    y0 = int(np.clip(round(c[1]) - HALF, 0, img.shape[0] - 2 * HALF))
    Image.fromarray(img[y0:y0 + 2 * HALF, x0:x0 + 2 * HALF]).save(
        os.path.join(SITE, "static", "img", f"plan_s{i}.webp"), quality=95, method=6)
    off = np.array([x0, y0, x0, y0], float)
    P, Y = saved[f"s{i}_P"], saved[f"s{i}_Y"]                   # (22, 49, 3), (22, 49)
    frames = [[round(float(v), 1) for j in range(P.shape[0]) for v in bar(P[j, f], Y[j, f], K, E) - off]
              for f in range(P.shape[1])]
    labels = [{"x": round(float(p[0] - x0), 1), "y": round(float(p[1] - y0), 1), "text": str(t)}
              for p, t in zip((project(o, K, E) for o in objs), saved[f"s{i}_labels"])]
    det = bar(saved[f"s{i}_dpos"], float(saved[f"s{i}_dyaw"]), K, E, 0.05) - off
    return {"img": f"static/img/plan_s{i}.webp", "size": 2 * HALF, "ring": 22 * S, "labels": labels,
            "det": [round(float(v), 1) for v in det], "frames": frames}


if __name__ == "__main__":
    saved = np.load(os.path.join(REPO, "star", "hero_scenes.npz"), allow_pickle=True)
    scenes = [export(0, *two_cube_scene(), saved), export(1, *grasp_scene(), saved)]
    with open(os.path.join(SITE, "static", "js", "plan_samples.js"), "w") as f:     # a script, so file:// works
        f.write("window.PLAN=" + json.dumps({"cap": CAP / L, "scenes": scenes}, separators=(",", ":")) + ";\n")
    print("wrote", [s["img"] for s in scenes], "frames per scene:", len(scenes[0]["frames"]))

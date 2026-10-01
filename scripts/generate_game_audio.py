"""Create the original ShipingIT game sound pack with Python's standard library.

No recordings, downloaded sounds, external samples, or model services are used.
Run normally to regenerate the owned assets, or --check to verify without writing.
"""

from __future__ import annotations

import argparse
from array import array
from hashlib import sha256
import io
import json
import math
from pathlib import Path
import random
import sys
import tempfile
import wave


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/audio/game"
MANIFEST = ROOT / "docs/game-audio-manifest.json"
PREVIEW = ROOT / "artifacts/audio-20260930/cue-preview.wav"
RATE = 44100
AMBIENCE_SECONDS = 14.0
MAX_PACK_BYTES = 2_000_000
SOURCE = "Original deterministic procedural synthesis; no external audio or recordings"
TONE_PARTIALS = [(1, 1.0, 3.0), (2, 0.12, 7.0), (3, 0.025, 9.0)]
SPECS = {
    "footstep": {
        "duration": 0.09, "peak": 0.14, "seed": 730031,
        "cutoff": 520.0, "bodyHz": 98.0, "throttleMs": 200,
        "priority": 0, "volume": 0.42,
    },
    "clue": {
        "duration": 0.26, "peak": 0.26,
        "notes": [(587.330, 0.0, 0.16, 1.0), (659.255, 0.08, 0.18, 0.82)],
        "throttleMs": 250, "priority": 1, "volume": 0.55,
    },
    "snap": {
        "duration": 0.08, "peak": 0.19, "seed": 730033,
        "cutoff": 1550.0, "bodyHz": 820.0, "throttleMs": 90,
        "priority": 1, "volume": 0.48,
    },
    "correct": {
        "duration": 0.34, "peak": 0.29,
        "notes": [(659.255, 0.0, 0.22, 1.0), (783.991, 0.105, 0.235, 0.82)],
        "throttleMs": 120, "priority": 2, "volume": 0.55,
    },
    "wrong": {
        "duration": 0.30, "peak": 0.24,
        "notes": [(440.0, 0.0, 0.20, 1.0), (391.995, 0.10, 0.20, 0.75)],
        "throttleMs": 160, "priority": 2, "volume": 0.48,
    },
    "completion": {
        "duration": 0.76, "peak": 0.33,
        "notes": [
            (523.251, 0.0, 0.25, 1.0), (659.255, 0.12, 0.27, 0.88),
            (783.991, 0.24, 0.29, 0.84), (1046.502, 0.39, 0.37, 0.76),
        ],
        "throttleMs": 780, "priority": 3, "volume": 0.55,
    },
}


def raised_attack_release(t: float, length: float, attack: float, release: float) -> float:
    attack_gain = 0.5 - 0.5 * math.cos(math.pi * min(1.0, max(0.0, t / attack)))
    tail = min(1.0, max(0.0, (length - t) / release))
    release_gain = 0.5 - 0.5 * math.cos(math.pi * tail)
    return attack_gain * release_gain


def zero_dc_preserving_cue_ends(samples: list[float]) -> None:
    # A smooth correction window removes bias while preserving silent endpoints.
    weights = [math.sin(math.pi * i / (len(samples) - 1)) ** 2 for i in range(len(samples))]
    offset = sum(samples) / sum(weights)
    for i, weight in enumerate(weights):
        samples[i] -= offset * weight
    samples[0] = samples[-1] = 0.0


def mallet(spec: dict) -> list[float]:
    samples = [0.0] * round(spec["duration"] * RATE)
    for frequency, start, length, gain in spec["notes"]:
        begin = round(start * RATE)
        for i in range(round(length * RATE)):
            position = begin + i
            if position >= len(samples):
                break
            t = i / RATE
            envelope = raised_attack_release(t, length, 0.005, 0.035)
            tone = sum(
                amplitude * math.sin(math.tau * multiple * frequency * t)
                * math.exp(-decay * t / length)
                for multiple, amplitude, decay in TONE_PARTIALS
            )
            samples[position] += gain * envelope * tone
    zero_dc_preserving_cue_ends(samples)
    return samples


def soft_transient(spec: dict, footstep: bool) -> list[float]:
    rng = random.Random(spec["seed"])
    samples = []
    filtered = 0.0
    coefficient = 1.0 - math.exp(-math.tau * spec["cutoff"] / RATE)
    for i in range(round(spec["duration"] * RATE)):
        t = i / RATE
        filtered += coefficient * (rng.uniform(-1.0, 1.0) - filtered)
        envelope = raised_attack_release(t, spec["duration"], 0.005, 0.018)
        if footstep:
            tone = 0.58 * filtered + 0.24 * math.sin(math.tau * spec["bodyHz"] * t)
            decay = math.exp(-44.0 * t)
        else:
            tone = 0.20 * filtered + 0.42 * math.sin(math.tau * spec["bodyHz"] * t)
            decay = math.exp(-67.0 * t)
        samples.append(tone * envelope * decay)
    zero_dc_preserving_cue_ends(samples)
    return samples


def world_ambience() -> tuple[list[float], dict]:
    count = round(AMBIENCE_SECONDS * RATE)
    # Every oscillator and modulation completes an integer number of cycles.
    # Including both endpoints gives matching values and matching approach slopes.
    pad = [(1831, 0.50), (2744, 0.23), (3663, 0.075), (4615, 0.095)]
    rng = random.Random(730037)
    air = [
        (rng.randint(4900, 15400), rng.random() * math.tau, rng.uniform(0.003, 0.006))
        for _ in range(24)
    ]
    samples = []
    for i in range(count):
        u = i / (count - 1)
        swell = 0.82 + 0.12 * math.cos(math.tau * u) + 0.06 * math.cos(2 * math.tau * u)
        tones = sum(gain * math.sin(math.tau * cycles * u) for cycles, gain in pad)
        breeze = sum(gain * math.sin(math.tau * cycles * u + phase) for cycles, phase, gain in air)
        samples.append(swell * tones + (0.72 + 0.28 * math.cos(math.tau * u)) * breeze)
    bias = sum(samples) / len(samples)
    samples = [sample - bias for sample in samples]
    samples[-1] = samples[0]
    metadata = {
        "method": "Phase-closed additive C-major pad and seeded periodic Fourier air texture",
        "seed": 730037,
        "phaseGrid": "u = frameIndex / (frameCount - 1)",
        "padCyclesPerLoopAndGain": pad,
        "airCyclesPerLoopPhaseRadiansGain": air,
        "swell": "0.82 + 0.12*cos(2*pi*u) + 0.06*cos(4*pi*u)",
        "breezeSwell": "0.72 + 0.28*cos(2*pi*u)",
        "pcmPeakLimit": 0.020,
        "pcmRmsLimit": 0.0065,
    }
    return samples, metadata


def quantize(samples: list[float], peak_limit: float, rms_limit: float | None = None) -> list[int]:
    peak = max(abs(value) for value in samples)
    assert peak > 0.000001, "Synthesis produced silence"
    gain = peak_limit / peak
    if rms_limit is not None:
        rms = math.sqrt(sum(value * value for value in samples) / len(samples))
        gain = min(gain, rms_limit / rms)
    return [round(value * gain * 32767) for value in samples]


def wav_bytes(frames: list[int]) -> bytes:
    pcm = array("h", frames)
    if sys.byteorder != "little":
        pcm.byteswap()
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())
    return buffer.getvalue()


def inspect_wav(data: bytes) -> dict:
    with wave.open(io.BytesIO(data), "rb") as audio:
        assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getcomptype()) == (1, 2, RATE, "NONE")
        count = audio.getnframes()
        pcm = array("h")
        pcm.frombytes(audio.readframes(count))
        if sys.byteorder != "little":
            pcm.byteswap()
    assert len(pcm) == count and count > 0
    peak = max(abs(value) for value in pcm) / 32768
    rms = math.sqrt(sum(value * value for value in pcm) / count) / 32768
    dc = sum(pcm) / count / 32768
    assert 0.00001 < peak <= 0.45 and abs(dc) < 0.000002
    first_slope = pcm[1] - pcm[0]
    last_slope = pcm[-1] - pcm[-2]
    return {
        "frameCount": count,
        "durationSeconds": count / RATE,
        "peak": round(peak, 10),
        "rms": round(rms, 10),
        "dc": round(dc, 12),
        "firstFrames": list(pcm[:8]),
        "lastFrames": list(pcm[-8:]),
        "endpointJumpPcm16": pcm[0] - pcm[-1],
        "endpointSlopeDifferencePcm16": first_slope - last_slope,
        "bytes": len(data),
        "sha256": sha256(data).hexdigest(),
    }


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False) as temporary:
        temporary.write(data)
        temporary_path = Path(temporary.name)
    try:
        temporary_path.replace(path)
    finally:
        temporary_path.unlink(missing_ok=True)


def create_pack() -> tuple[dict[Path, bytes], dict]:
    files: dict[Path, bytes] = {}
    entries = []
    cue_frames = []
    for name, spec in SPECS.items():
        samples = (
            soft_transient(spec, footstep=name == "footstep")
            if name in ("footstep", "snap") else mallet(spec)
        )
        frames = quantize(samples, spec["peak"])
        data = wav_bytes(frames)
        measured = inspect_wav(data)
        assert measured["durationSeconds"] == spec["duration"]
        assert measured["durationSeconds"] <= 0.8
        assert frames[0] == frames[-1] == 0
        path = OUT / f"{name}.wav"
        files[path] = data
        entries.append({
            "id": name, "asset": path.relative_to(ROOT).as_posix(),
            "loop": False, "source": SOURCE,
            "synthesis": {
                "method": "Seeded one-pole low-pass noise with damped sine body" if "seed" in spec else "Raised-cosine enveloped additive mallet tones",
                **({"seed": spec["seed"], "lowPassCutoffHz": spec["cutoff"], "bodyHz": spec["bodyHz"]} if "seed" in spec else {"notesHzStartSecondsLengthSecondsGain": spec["notes"], "partialsHarmonicGainDecay": TONE_PARTIALS}),
            },
            "controllerPolicy": {
                "priority": spec["priority"], "minimumIntervalMs": spec["throttleMs"],
                "suggestedVolume": spec["volume"], "busyWindowMs": round(spec["duration"] * 1000) + 20,
            },
            **measured,
        })
        cue_frames.append(frames)
    ambience, synthesis = world_ambience()
    frames = quantize(ambience, 0.020, 0.0065)
    data = wav_bytes(frames)
    measured = inspect_wav(data)
    assert measured["durationSeconds"] == AMBIENCE_SECONDS
    assert measured["peak"] <= 0.020 and measured["rms"] <= 0.006501
    assert measured["endpointJumpPcm16"] == 0
    assert abs(measured["endpointSlopeDifferencePcm16"]) <= 2
    path = OUT / "world-ambience.wav"
    files[path] = data
    entries.append({
        "id": "world-ambience", "asset": path.relative_to(ROOT).as_posix(),
        "loop": True, "source": SOURCE, "synthesis": synthesis,
        "controllerPolicy": {"suggestedVolume": 0.18, "simultaneousAmbienceLimit": 1},
        **measured,
    })
    total = sum(len(content) for content in files.values())
    assert total <= MAX_PACK_BYTES
    preview_frames = []
    gap = [0] * round(0.3 * RATE)
    for index, cue in enumerate(cue_frames):
        if index:
            preview_frames.extend(gap)
        preview_frames.extend(cue)
    preview = wav_bytes(preview_frames)
    files[PREVIEW] = preview
    manifest = {
        "schemaVersion": 1,
        "generator": "scripts/generate_game_audio.py",
        "source": SOURCE,
        "encoding": {"container": "WAV", "codec": "PCM", "sampleRate": RATE, "channels": 1, "bitsPerSample": 16},
        "verification": {
            "maximumAllowedPeak": 0.45, "maximumCueSeconds": 0.8,
            "maximumPackBytes": MAX_PACK_BYTES, "packBytes": total,
            "measures": "Computed from decoded final PCM16, normalized by 32768; endpoint frames are signed PCM16",
        },
        "assets": entries,
        "preview": {
            "asset": PREVIEW.relative_to(ROOT).as_posix(),
            "cueOrder": list(SPECS), "silenceBetweenSeconds": 0.3,
            **inspect_wav(preview),
        },
    }
    files[MANIFEST] = (json.dumps(manifest, indent=2) + "\n").encode("utf-8")
    return files, manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify committed bytes against freshly synthesized bytes without writing")
    args = parser.parse_args()
    files, manifest = create_pack()
    for path, expected in files.items():
        if args.check:
            assert path.read_bytes() == expected, f"Non-reproducible or missing asset: {path.relative_to(ROOT)}"
        else:
            atomic_write(path, expected)
        assert path.read_bytes() == expected, f"Persisted bytes differ: {path.relative_to(ROOT)}"
    print(json.dumps({
        "mode": "verified" if args.check else "generated", "assets": len(manifest["assets"]),
        "packBytes": manifest["verification"]["packBytes"],
        "ambienceSeconds": AMBIENCE_SECONDS, "previewSeconds": manifest["preview"]["durationSeconds"],
        "assetsVerifiedFromFinalPcm": True,
    }))


if __name__ == "__main__":
    main()

"""Synthesize original short UI tones using only Python's standard library."""
from hashlib import sha256
import json
import math
from pathlib import Path
import struct
import wave

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio'
RATE = 22050
SOUNDS = {
    'correct': {'duration': 0.34, 'notes': [(659.255, 0, 0.19), (783.991, 0.10, 0.24)]},
    'wrong': {'duration': 0.26, 'notes': [(440.0, 0, 0.16), (391.995, 0.09, 0.17)]},
    'completion': {'duration': 0.64, 'notes': [(523.251, 0, 0.24), (659.255, 0.12, 0.25), (783.991, 0.24, 0.26), (1046.502, 0.36, 0.28)]},
}


def synthesize(duration: float, notes: list[tuple[float, float, float]]) -> list[float]:
    samples = [0.0] * round(RATE * duration)
    for frequency, start, length in notes:
        start_sample = round(start * RATE)
        for index in range(round(length * RATE)):
            position = start_sample + index
            if position >= len(samples):
                break
            t = index / RATE
            envelope = min(1.0, t / 0.009) * min(1.0, (length - t) / 0.055) * math.exp(-4 * t)
            tone = math.sin(math.tau * frequency * t) + 0.10 * math.sin(math.tau * 2 * frequency * t)
            samples[position] += 0.23 * envelope * tone
    samples[0] = samples[-1] = 0.0
    assert 0.01 < max(abs(s) for s in samples) < 0.5, 'Empty or clipping audio'
    return samples


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, spec in SOUNDS.items():
        samples = synthesize(spec['duration'], spec['notes'])
        path = OUT / f'{name}.wav'
        with wave.open(str(path), 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes(struct.pack('<' + 'h' * len(samples), *(round(s * 32767) for s in samples)))
        with wave.open(str(path), 'rb') as verified:
            assert verified.getnchannels() == 1 and verified.getsampwidth() == 2
            assert abs(verified.getnframes() / RATE - spec['duration']) < 0.001
        manifest.append({'asset': str(path.relative_to(ROOT)).replace('\\', '/'), 'durationSeconds': len(samples) / RATE,
                         'sampleRate': RATE, 'channels': 1, 'bits': 16, 'peak': round(max(abs(s) for s in samples), 5),
                         'bytes': path.stat().st_size, 'sha256': sha256(path.read_bytes()).hexdigest(),
                         'notesHzStartSecondsDurationSeconds': spec['notes'], 'source': 'Original deterministic additive synthesis; no external audio'})
    (ROOT / 'docs/audio-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'files': len(manifest), 'totalBytes': sum(m['bytes'] for m in manifest), 'maximumDuration': max(m['durationSeconds'] for m in manifest)}))


if __name__ == '__main__':
    main()

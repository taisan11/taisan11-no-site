export type PitchResult = {
  frequency: number;
  clarity: number;
};

export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function rmsToDb(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0.000001 ? 20 * Math.log10(rms) : -100;
}

export function detectPitch(samples: Float32Array, sampleRate: number): PitchResult | null {
  let rms = 0;
  for (const sample of samples) rms += sample * sample;
  rms = Math.sqrt(rms / samples.length);
  if (rms < 0.008) return null;

  const minLag = Math.floor(sampleRate / 1200);
  const maxLag = Math.min(Math.floor(sampleRate / 55), Math.floor(samples.length / 2));
  const correlations = new Float32Array(maxLag + 1);
  let globalBest = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let difference = 0;
    let energy = 0;
    for (let i = 0; i < samples.length - lag; i++) {
      const a = samples[i];
      const b = samples[i + lag];
      const delta = a - b;
      difference += delta * delta;
      energy += a * a + b * b;
    }
    const correlation = energy > 0 ? 1 - difference / energy : 0;
    correlations[lag] = correlation;
    globalBest = Math.max(globalBest, correlation);
  }

  if (globalBest < 0.72) return null;

  // The first strong local maximum is the fundamental period. Merely using the
  // first high correlation mistakes the smooth leading slope of low notes for
  // a much shorter period (and therefore a much higher note).
  let bestLag = -1;
  const peakThreshold = Math.max(0.72, globalBest * 0.9);
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (
      correlations[lag] >= peakThreshold &&
      correlations[lag] > correlations[lag - 1] &&
      correlations[lag] >= correlations[lag + 1]
    ) {
      bestLag = lag;
      break;
    }
  }

  if (bestLag < 0) return null;

  const left = correlations[bestLag - 1] || correlations[bestLag];
  const center = correlations[bestLag];
  const right = correlations[bestLag + 1] || correlations[bestLag];
  const divisor = left - 2 * center + right;
  const adjustment = divisor === 0 ? 0 : 0.5 * (left - right) / divisor;
  const refinedLag = bestLag + Math.max(-1, Math.min(1, adjustment));

  return { frequency: sampleRate / refinedLag, clarity: correlations[bestLag] };
}

export function frequencyToNote(frequency: number, reference = 440) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / reference));
  const targetFrequency = reference * 2 ** ((midi - 69) / 12);
  const cents = 1200 * Math.log2(frequency / targetFrequency);
  return {
    midi,
    name: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    targetFrequency,
    cents,
  };
}

export function frequencyToX(frequency: number, width: number, min = 55, max = 5000) {
  const ratio = Math.log(frequency / min) / Math.log(max / min);
  return Math.max(0, Math.min(width, ratio * width));
}

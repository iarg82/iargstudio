// Procedural Web Audio generator for royalty-free soundtracks in exported videos

export interface SynthPreset {
  id: string;
  name: string;
  description: string;
  bpm: number;
}

export const AUDIO_PRESETS: SynthPreset[] = [
  { id: 'cinematic', name: 'Cinematic Ambient Pulse', description: 'Deep warm sub-bass, ethereal reverb pads, and gentle analog pulse', bpm: 80 },
  { id: 'synthwave', name: 'Synthwave Neon Drive', description: 'Retro 80s arpeggiated bassline with warm chorus leads', bpm: 110 },
  { id: 'lofi', name: 'Mellow Lo-Fi Sunset', description: 'Warm vinyl crackle, lush jazz chords, and gentle ambient sweep', bpm: 75 },
  { id: 'epic', name: 'Epic Cinematic Trailer', description: 'Deep orchestral risers, cinematic tension, and sub-drop impact', bpm: 90 },
  { id: 'none', name: 'No Background Music (Mute)', description: 'Use only original video clip audio', bpm: 0 },
];

/**
 * Generates an AudioBuffer of the specified duration using the chosen procedural music preset.
 */
export async function generateSoundtrackBuffer(
  audioCtx: AudioContext | OfflineAudioContext,
  presetId: string,
  durationSec: number
): Promise<AudioBuffer | null> {
  if (presetId === 'none' || durationSec <= 0) return null;

  const sampleRate = audioCtx.sampleRate;
  const numSamples = Math.ceil(sampleRate * durationSec);
  const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.35, 0);
  // Fade out in last 1.5 seconds
  masterGain.gain.setValueAtTime(0.35, Math.max(0, durationSec - 1.5));
  masterGain.gain.linearRampToValueAtTime(0.001, durationSec);
  masterGain.connect(offlineCtx.destination);

  if (presetId === 'cinematic') {
    // Warm deep drone
    const chordFrequencies = [55, 110, 164.81, 220, 329.63]; // A minor chord
    chordFrequencies.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, 0);

      // Gentle LFO pitch drift
      const lfo = offlineCtx.createOscillator();
      const lfoGain = offlineCtx.createGain();
      lfo.frequency.setValueAtTime(0.2 + idx * 0.05, 0);
      lfoGain.gain.setValueAtTime(1.5, 0);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      gain.gain.setValueAtTime(0.12 / chordFrequencies.length, 0);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(0);
      osc.stop(durationSec);
    });

    // Sub pulse
    const pulseOsc = offlineCtx.createOscillator();
    const pulseGain = offlineCtx.createGain();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.setValueAtTime(45, 0);
    pulseGain.gain.setValueAtTime(0.25, 0);
    pulseOsc.connect(pulseGain);
    pulseGain.connect(masterGain);
    pulseOsc.start(0);
    pulseOsc.stop(durationSec);

  } else if (presetId === 'synthwave') {
    // 80s bassline arpeggio
    const bassNotes = [55, 55, 82.4, 73.4, 65.4, 55, 82.4, 98];
    const stepTime = 60 / 110 / 2; // 16th notes
    let t = 0;
    let step = 0;

    while (t < durationSec) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sawtooth';
      const freq = bassNotes[step % bassNotes.length];
      osc.frequency.setValueAtTime(freq, t);

      // Lowpass filter for analog punch
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + stepTime * 0.9);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + stepTime * 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + stepTime);

      t += stepTime;
      step++;
    }

  } else if (presetId === 'lofi') {
    // Mellow Rhodes-like seventh chords
    const chordSets = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
    ];
    const chordDuration = 3.2;
    let t = 0;
    let cIdx = 0;

    while (t < durationSec) {
      const notes = chordSets[cIdx % chordSets.length];
      notes.forEach((freq) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, t + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + chordDuration);
      });

      t += chordDuration;
      cIdx++;
    }

  } else if (presetId === 'epic') {
    // Epic low horn brass & tension risers
    const brassFreqs = [43.65, 65.41, 87.31, 130.81]; // F low
    brassFreqs.forEach((freq) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, 0);

      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, 0);
      filter.frequency.linearRampToValueAtTime(2400, Math.min(10, durationSec));

      gain.gain.setValueAtTime(0.2, 0);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(0);
      osc.stop(durationSec);
    });
  }

  return await offlineCtx.startRendering();
}

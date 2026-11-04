import { getAudioContext, getIsMuted } from "./audio";

const cachedBuffers = new WeakMap<AudioContext, AudioBuffer[]>();

/** A small reusable Web Audio graph, with no audio sample generation per frame. */
export function createStadiumAmbience() {
  const context = getAudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const nodes: AudioNode[] = [master];
  const sources: AudioBufferSourceNode[] = [];
  let buffers = cachedBuffers.get(context);
  if (!buffers) {
    buffers = [0, 1].map(() => {
      const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      return buffer;
    });
    cachedBuffers.set(context, buffers);
  }
  let layer = 0;
  // Two filtered crowd layers: distant low rumble and a clearer upper murmur.
  for (const [frequency, rate, volume] of [[360, 0.73, 0.8], [1000, 1, 0.35]]) {
    const source = context.createBufferSource();
    source.buffer = buffers[layer++];
    source.loop = true;
    source.playbackRate.value = rate;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.6;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    nodes.push(source, filter, gain);
    sources.push(source);
    source.start();
  }
  let stopped = false;
  let suspended = false;
  let lastUpdate = -Infinity;
  let lastVolume = -1;
  const setVolume = (volume: number) => {
    if (stopped) return;
    const target = getIsMuted() || suspended ? 0 : volume;
    if (target !== 0 && lastVolume !== 0 && context.currentTime - lastUpdate < 0.1) return;
    if (Math.abs(target - lastVolume) < 0.001) return;
    master.gain.setTargetAtTime(target, context.currentTime, 0.12);
    lastUpdate = context.currentTime;
    lastVolume = target;
  };
  return {
    update(progress: number) {
      if (stopped) return;
      const approach = 0.025 + Math.sqrt(progress) * 0.13;
      const swell = 0.85 + Math.sin(progress * Math.PI * 7) * 0.15;
      // Blend into the quieter match ambience instead of ending in silence.
      const transition = Math.min((1 - progress) / 0.12, 1);
      setVolume(approach * swell * transition + 0.055 * (1 - transition));
    },
    updateMatch(time: number, celebrating = false) {
      setVolume((celebrating ? 0.075 : 0.055) + Math.sin(time * 0.55) * 0.008);
    },
    setSuspended(value: boolean) {
      suspended = value;
      if (value) setVolume(0);
      else lastUpdate = -Infinity;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      master.gain.setTargetAtTime(0, context.currentTime, 0.04);
      sources[0].onended = () => nodes.forEach(node => node.disconnect());
      sources.forEach(source => source.stop(context.currentTime + 0.2));
    },
  };
}

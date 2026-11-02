import { getAudioContext, getIsMuted } from "./audio";

/** A small reusable Web Audio graph, with no audio sample generation per frame. */
export function createStadiumAmbience() {
  const context = getAudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const nodes: AudioNode[] = [master];
  const sources: AudioBufferSourceNode[] = [];
  // Two filtered crowd layers: distant low rumble and a clearer upper murmur.
  for (const [frequency, rate, volume] of [[360, 0.73, 0.8], [1000, 1, 0.35]]) {
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const samples = source.buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
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
  return {
    update(progress: number) {
      if (stopped) return;
      const approach = 0.025 + Math.sqrt(progress) * 0.13;
      const swell = 0.85 + Math.sin(progress * Math.PI * 7) * 0.15;
      const fade = Math.min((1 - progress) / 0.12, 1);
      master.gain.setTargetAtTime(getIsMuted() ? 0 : approach * swell * fade, context.currentTime, 0.08);
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

import * as THREE from "three";
import type { createHumanoid } from "./models";

type PlayerRig = ReturnType<typeof createHumanoid>;
export const KICK_CONTACT_TIME = 0.72;
const smooth = (value: number) => THREE.MathUtils.smoothstep(value, 0, 1);

/** Hip/shoulder pivots, a planted support foot and a timed backswing/contact/follow-through. */
export function animateKicker(player: PlayerRig, root: THREE.Group, elapsed: number, targetX: number) {
  if (elapsed < 0) {
    root.position.set(0.8, 0, 4.6);
    player.group.rotation.set(0, -0.15, 0);
    player.legL.rotation.set(0, 0, 0);
    player.legR.rotation.set(0, 0, 0);
    player.kneeL.rotation.x = player.kneeR.rotation.x = 0;
    player.elbowL.rotation.x = player.elbowR.rotation.x = -0.15;
    player.armL.rotation.set(0.12, 0, -0.15);
    player.armR.rotation.set(-0.12, 0, 0.15);
    player.body.rotation.set(0, 0, 0);
    return;
  }
  const approach = smooth(elapsed / 0.54);
  root.position.set(THREE.MathUtils.lerp(0.8, -0.12, approach), 0, THREE.MathUtils.lerp(4.6, 2.35, approach));
  const stride = Math.sin(elapsed * 24);
  const running = 1 - smooth((elapsed - 0.4) / 0.14);
  player.legL.rotation.x = stride * 0.6 * running;
  player.legR.rotation.x = -stride * 0.6 * running;
  player.kneeL.rotation.x = -Math.max(0, -stride) * 0.65 * running;
  player.kneeR.rotation.x = -Math.max(0, stride) * 0.65 * running;
  const windup = smooth((elapsed - 0.45) / 0.16);
  const strike = smooth((elapsed - 0.61) / (KICK_CONTACT_TIME - 0.61));
  const follow = smooth((elapsed - KICK_CONTACT_TIME) / 0.16);
  const settle = smooth((elapsed - 0.95) / 0.55);
  player.legR.rotation.x += (-windup * 0.9 + strike * 1.65 + follow * 0.6) * (1 - settle);
  player.kneeR.rotation.x -= windup * (1 - strike) * 0.9;
  player.elbowL.rotation.x = -0.3 - running * 0.35;
  player.elbowR.rotation.x = -0.3 - running * 0.35;
  player.armL.rotation.x = -stride * running * 0.5 - windup * 0.45 * (1 - settle);
  player.armR.rotation.x = stride * running * 0.5 + windup * 0.55 * (1 - settle);
  player.armL.rotation.z = -0.2 - windup * 0.35 * (1 - settle);
  player.armR.rotation.z = 0.2 + windup * 0.25 * (1 - settle);
  player.body.rotation.x = windup * 0.12 * (1 - settle);
  player.body.rotation.y = -windup * 0.2 * (1 - strike) + follow * 0.12 * (1 - settle);
  player.group.rotation.y = THREE.MathUtils.lerp(-0.15, Math.atan2(-targetX, 6.04) * 0.18, approach);
}

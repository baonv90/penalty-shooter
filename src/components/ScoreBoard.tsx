import { useGameStore } from "../store/gameStore";
import type { Player } from "../store/gameStore";

export default function ScoreBoard() {
  const { players, turn, gamePhase } = useGameStore();
  const scores = players.map(player => player.shots.filter(shot => shot === "goal").length);
  const name = (index: number) => players[index].name.trim() || `Team ${index + 1}`;

  const renderTeam = (player: Player, index: number) => {
    const active = gamePhase === "playing" && turn === index;
    const slots = Math.max(5, player.shots.length + (active ? 1 : 0));
    const firstShot = Math.max(0, slots - 5);
    return (
      <div className={`scoreboard-team ${index === 1 ? "scoreboard-team-away" : ""}`} data-active={active}>
        <div className="scoreboard-player" title={`${name(index)}${active ? " · Taking a shot" : ""}`}>
          <span className={`scoreboard-jersey ${player.jerseyColor}`} aria-hidden="true" />
          <span className="scoreboard-name">{name(index)}</span>
          {active && <span className="sr-only"> — Taking a shot</span>}
        </div>
        <div className="scoreboard-shots" role="group" aria-label={`Shots for ${name(index)}`}>
          {firstShot > 0 && <span className="scoreboard-shot-offset" title={`${firstShot} earlier shots`} aria-label={`${firstShot} earlier shots`}>+{firstShot}</span>}
          {Array.from({ length: 5 }, (_, slot) => {
            const shotIndex = firstShot + slot;
            const result = player.shots[shotIndex];
            const state = result === "goal" ? "goal" : result ? "miss" : "pending";
            const current = active && shotIndex === player.shots.length;
            const label = `Shot ${shotIndex + 1}: ${state === "goal" ? "Goal" : state === "miss" ? (result === "post" ? "Hit the woodwork" : "Miss") : current ? "Taking a shot" : "Not taken"}`;
            return <span key={shotIndex} className={`scoreboard-shot is-${state}${current ? " is-current" : ""}`}
              role="img" aria-label={label} title={label}>
              <span aria-hidden="true">{state === "goal" ? "✓" : state === "miss" ? "×" : ""}</span>
            </span>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="scoreboard" role="group" aria-label="Scoreboard">
      {renderTeam(players[0], 0)}
      <div className="scoreboard-center">
        <span className="scoreboard-caption" aria-hidden="true">PENALTIES</span>
        <output className="scoreboard-total" aria-live="polite" aria-atomic="true"
          aria-label={`${name(0)} ${scores[0]}, ${name(1)} ${scores[1]}`}>
          <span>{scores[0]}</span><span className="scoreboard-separator" aria-hidden="true">:</span><span>{scores[1]}</span>
        </output>
      </div>
      {renderTeam(players[1], 1)}
    </div>
  );
}

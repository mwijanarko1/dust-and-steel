import type { MatchResult } from "@/shared/types";

interface SummaryScreenProps {
  result: MatchResult;
  onNewBattle: () => void;
}

export function SummaryScreen({ result, onNewBattle }: SummaryScreenProps) {
  return (
    <section className="panel summary-panel" data-testid="summary-screen">
      <p className="eyebrow">Battle Report</p>
      <h2>{result.winner === "attacker" ? "Attacker Victory" : "Defender Victory"}</h2>
      <p>Duration: {result.durationSeconds.toFixed(1)}s</p>
      <p>Routed Faction: {result.routedFaction}</p>
      <p>
        Objectives: A {result.objectivesHeld.attacker} / D {result.objectivesHeld.defender}
      </p>
      <p>
        Losses: A {result.losses.attacker} / D {result.losses.defender}
      </p>
      <button className="cta-button" onClick={onNewBattle} type="button">
        Plan Another Battle
      </button>
    </section>
  );
}

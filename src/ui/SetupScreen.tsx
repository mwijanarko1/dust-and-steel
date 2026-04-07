import { GAME_CONTENT } from "@/content/catalog";
import type { EraId } from "@/shared/types";

interface SetupScreenProps {
  selectedEraId: EraId;
  playerFactionIndex: 0 | 1;
  onSelectEra: (eraId: EraId) => void;
  onSelectFactionIndex: (index: 0 | 1) => void;
  onStartBattle: () => void;
}

export function SetupScreen({
  selectedEraId,
  playerFactionIndex,
  onSelectEra,
  onSelectFactionIndex,
  onStartBattle
}: SetupScreenProps) {
  const selectedEra = GAME_CONTENT.eras[selectedEraId];
  const factions = selectedEra.factionIds
    .map((factionId) => GAME_CONTENT.factions[factionId])
    .filter((faction): faction is (typeof GAME_CONTENT.factions)[string] => Boolean(faction));

  return (
    <section className="panel setup" data-testid="setup-screen">
      <header>
        <p className="eyebrow">Scenario Setup</p>
        <h2>Select Era and Faction</h2>
        <p className="setup-hint">
          Each battle randomly assigns you as <strong>attacker</strong> or <strong>defender</strong>. Attackers study the
          objective map, then assault. Defenders get a short window to position troops before the enemy advances.
        </p>
      </header>

      <div className="grid era-grid">
        {Object.values(GAME_CONTENT.eras).map((era) => (
          <button
            className={`choice-button ${era.id === selectedEraId ? "selected" : ""}`}
            key={era.id}
            onClick={() => onSelectEra(era.id)}
            type="button"
          >
            {era.label}
          </button>
        ))}
      </div>

      <div className="group">
        <h3>Faction</h3>
        {factions.map((faction, index) => (
          <button
            className={`choice-button ${playerFactionIndex === index ? "selected" : ""}`}
            key={faction.id}
            onClick={() => onSelectFactionIndex(index as 0 | 1)}
            type="button"
          >
            {faction.label}
          </button>
        ))}
      </div>

      <button className="cta-button" onClick={onStartBattle} type="button">
        Start Battle
      </button>
    </section>
  );
}

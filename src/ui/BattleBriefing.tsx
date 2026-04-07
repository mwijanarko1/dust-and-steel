import type { ReactElement } from "react";
import { GAME_CONTENT } from "@/content/catalog";
import type { BattleConfig, MapDefinition, ObstacleVisual } from "@/shared/types";

interface BattleBriefingProps {
  config: BattleConfig;
  onBeginAssault: () => void;
}

function toSvg(map: MapDefinition, x: number, z: number): { sx: number; sy: number } {
  const w = map.size.width;
  const d = map.size.depth;
  return {
    sx: ((x + w / 2) / w) * 100,
    sy: ((z + d / 2) / d) * 100
  };
}

function obstacleMark(map: MapDefinition, obs: ObstacleVisual): ReactElement {
  const { sx, sy } = toSvg(map, obs.center.x, obs.center.z);
  const rx = Math.max(1.1, (obs.width / map.size.width) * 50);
  const ry = Math.max(0.9, (obs.depth / map.size.depth) * 50);
  const deg = (obs.rotationY * 180) / Math.PI;
  return (
    <ellipse
      key={obs.id}
      className="briefing-map__obstacle"
      cx={sx}
      cy={sy}
      rx={rx}
      ry={ry}
      transform={`rotate(${deg} ${sx} ${sy})`}
    />
  );
}

function zoneRect(
  map: MapDefinition,
  zone: MapDefinition["deploymentZones"]["attacker"]
): { x: number; y: number; width: number; height: number } {
  const p1 = toSvg(map, zone.minX, zone.minZ);
  const p2 = toSvg(map, zone.maxX, zone.maxZ);
  return {
    x: Math.min(p1.sx, p2.sx),
    y: Math.min(p1.sy, p2.sy),
    width: Math.abs(p2.sx - p1.sx),
    height: Math.abs(p2.sy - p1.sy)
  };
}

function ObjectivesOnlyMap({ map }: { map: MapDefinition }) {
  return (
    <svg className="briefing-map briefing-map--tall" viewBox="0 0 100 100" aria-hidden>
      <title>Objective locations</title>
      <rect className="briefing-map__field" height="100" width="100" x={0} y={0} />
      {map.objectiveTemplates.map((obj) => {
        const { sx, sy } = toSvg(map, obj.position.x, obj.position.z);
        const r = Math.max(2.2, (obj.radius / map.size.width) * 100);
        return (
          <g key={obj.id}>
            <circle className="briefing-map__objective" cx={sx} cy={sy} r={r} />
            <text className="briefing-map__label" x={sx} y={sy - r - 1.5} textAnchor="middle">
              {obj.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FullBattlefieldMap({ map }: { map: MapDefinition }) {
  const a = zoneRect(map, map.deploymentZones.attacker);
  const def = zoneRect(map, map.deploymentZones.defender);
  return (
    <svg className="briefing-map briefing-map--tall" viewBox="0 0 100 100" aria-hidden>
      <title>Battlefield overview</title>
      <rect className="briefing-map__field" height="100" width="100" x={0} y={0} />
      <rect className="briefing-map__zone briefing-map__zone--attacker" {...a} rx={0.8} />
      <rect className="briefing-map__zone briefing-map__zone--defender" {...def} rx={0.8} />
      <text className="briefing-map__zone-label" x={a.x + a.width / 2} y={a.y + a.height / 2} textAnchor="middle">
        Attacker start
      </text>
      <text className="briefing-map__zone-label" x={def.x + def.width / 2} y={def.y + def.height / 2} textAnchor="middle">
        Defender start
      </text>
      {map.obstacleVisuals.map((obs) => obstacleMark(map, obs))}
      {map.objectiveTemplates.map((obj) => {
        const { sx, sy } = toSvg(map, obj.position.x, obj.position.z);
        const r = Math.max(1.8, (obj.radius / map.size.width) * 85);
        return <circle key={obj.id} className="briefing-map__objective-dim" cx={sx} cy={sy} r={r} />;
      })}
    </svg>
  );
}

export function BattleBriefing({ config, onBeginAssault }: BattleBriefingProps) {
  const map = GAME_CONTENT.mapsByEra[config.selectedEra].find((m) => m.id === config.mapId);
  if (!map) {
    return null;
  }

  return (
    <div className="battle-phase-overlay battle-phase-overlay--briefing" data-testid="attacker-briefing-overlay">
      <div className="battle-phase-overlay__panel panel">
        <p className="eyebrow">Attacker briefing</p>
        <h2>Capture the marked objectives</h2>
        <p className="battle-phase-overlay__lede">
          You lead the assault. Study the objective layout and full battlefield, then begin when ready. Enemy forces will
          engage once the battle starts.
        </p>
        <div className="briefing-maps">
          <figure className="briefing-maps__cell">
            <figcaption>Goals to take</figcaption>
            <ObjectivesOnlyMap map={map} />
          </figure>
          <figure className="briefing-maps__cell">
            <figcaption>Battlefield overview</figcaption>
            <FullBattlefieldMap map={map} />
          </figure>
        </div>
        <button className="cta-button battle-phase-overlay__cta" data-testid="begin-assault-button" onClick={onBeginAssault} type="button">
          Begin assault
        </button>
      </div>
    </div>
  );
}

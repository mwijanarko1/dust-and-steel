import { DEFENDER_DEPLOYMENT_SECONDS } from "@/shared/battlePrep";

interface DefenderDeploymentBarProps {
  secondsRemaining: number;
}

export function DefenderDeploymentBar({ secondsRemaining }: DefenderDeploymentBarProps) {
  const clamped = Math.max(0, secondsRemaining);
  const pct = (clamped / DEFENDER_DEPLOYMENT_SECONDS) * 100;

  return (
    <div className="defender-deployment-bar" data-testid="deployment-overlay">
      <div className="defender-deployment-bar__inner panel">
        <p className="eyebrow">Defense preparation</p>
        <p className="defender-deployment-bar__title">
          Position your forces — <strong>{clamped.toFixed(1)}</strong>s remaining
        </p>
        <p className="defender-deployment-bar__hint">
          Select units and issue <strong>move</strong> orders. The enemy is not advancing yet. When time runs out, combat
          begins — hold the objectives.
        </p>
        <div className="defender-deployment-bar__track" aria-hidden>
          <div className="defender-deployment-bar__fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

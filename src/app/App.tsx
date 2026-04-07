import { useEffect, useMemo, useRef } from "react";
import { createRandomBattleConfig } from "@/app/createBattleConfig";
import { useGameStore } from "@/app/gameStore";
import { BattleRuntime } from "@/simulation/battleRuntime";
import { BattleBriefing } from "@/ui/BattleBriefing";
import { DefenderDeploymentBar } from "@/ui/DefenderDeploymentBar";
import { SetupScreen } from "@/ui/SetupScreen";
import { SplashScreen } from "@/ui/SplashScreen";
import { SummaryScreen } from "@/ui/SummaryScreen";
export function App() {
  const screen = useGameStore((state) => state.screen);
  const setup = useGameStore((state) => state.setup);
  const config = useGameStore((state) => state.config);
  const result = useGameStore((state) => state.result);
  const setScreen = useGameStore((state) => state.setScreen);
  const setSetup = useGameStore((state) => state.setSetup);
  const setConfig = useGameStore((state) => state.setConfig);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const setSelectedUnits = useGameStore((state) => state.setSelectedUnits);
  const setResult = useGameStore((state) => state.setResult);
  const battleFlow = useGameStore((state) => state.battleFlow);
  const setBattleFlow = useGameStore((state) => state.setBattleFlow);
  const resetToSetup = useGameStore((state) => state.resetToSetup);

  const battleRuntimeRef = useRef<BattleRuntime | null>(null);
  const battleCanvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (screen !== "battle" || !config || !battleCanvasRef.current) {
      return;
    }

    const runtime = new BattleRuntime(config, {
      onSnapshot: (nextSnapshot) => setSnapshot(nextSnapshot),
      onSelectedUnits: (unitIds) => setSelectedUnits(unitIds),
      onBattleFlow: (nextFlow) => {
        setBattleFlow(nextFlow);
      },
      onBattleEnd: (nextResult) => {
        setResult(nextResult);
        setScreen("summary");
      }
    });
    battleRuntimeRef.current = runtime;
    runtime.start(battleCanvasRef.current);

    return () => {
      runtime.stop();
      battleRuntimeRef.current = null;
      setBattleFlow(null);
    };
  }, [config, screen, setBattleFlow, setResult, setScreen, setSelectedUnits, setSnapshot]);

  const subtitle = useMemo(() => {
    if (!config) {
      return "Select your era to deploy.";
    }
    return `${config.selectedEra.toUpperCase()} | ${config.mapType.toUpperCase()} | ${config.playerRole.toUpperCase()}`;
  }, [config]);

  return (
    <main
      className={
        screen === "splash"
          ? "app-shell app-shell--splash"
          : screen === "battle"
            ? "app-shell app-shell--battle"
            : screen === "setup"
              ? "app-shell app-shell--setup"
              : "app-shell"
      }
    >
      {screen !== "splash" && screen !== "battle" && screen !== "setup" && (
        <header className="top-bar">
          <h1>Dust and Steel</h1>
          <p>{subtitle}</p>
        </header>
      )}

      {screen === "splash" && <SplashScreen onStart={() => setScreen("setup")} />}

      {screen === "setup" && (
        <SetupScreen
          selectedEraId={setup.eraId}
          playerFactionIndex={setup.playerFactionIndex}
          onSelectEra={(eraId) => setSetup({ eraId })}
          onSelectFactionIndex={(playerFactionIndex) => setSetup({ playerFactionIndex })}
          onStartBattle={() => {
            const battleConfig = createRandomBattleConfig({
              eraId: setup.eraId,
              mapType: "field",
              playerFactionIndex: setup.playerFactionIndex,
              seed: Math.floor(Date.now() % 2_000_000_000)
            });
            setBattleFlow(null);
            setConfig(battleConfig);
            setSnapshot(null);
            setResult(null);
            setSelectedUnits([]);
            setScreen("battle");
          }}
        />
      )}

      {screen === "battle" && config && (
        <section className="battle-screen battle-screen--fullscreen" data-testid="battle-screen">
          <div className="battle-canvas-wrap">
            <div className="battle-canvas" data-testid="battle-canvas" ref={battleCanvasRef} />
            {battleFlow?.phase === "defender_deployment" && (
              <DefenderDeploymentBar secondsRemaining={battleFlow.secondsRemaining} />
            )}
            {battleFlow?.phase === "attacker_briefing" && (
              <BattleBriefing config={config} onBeginAssault={() => battleRuntimeRef.current?.beginAttackerAssault()} />
            )}
          </div>
        </section>
      )}

      {screen === "summary" && result && <SummaryScreen onNewBattle={resetToSetup} result={result} />}
    </main>
  );
}

interface SplashScreenProps {
  onStart: () => void;
}

export function SplashScreen({ onStart }: SplashScreenProps) {
  return (
    <section className="splash-screen" data-testid="splash-screen">
      <p className="eyebrow eyebrow--splash">
        2026 Vibe Jam entry by{" "}
        <a href="https://mikhailwijanarko.xyz" rel="noopener noreferrer" target="_blank">
          @mikhailbuilds
        </a>
      </p>
      <h1>Dust and Steel</h1>
      <p className="summary">
        Real-time tabletop warfare across three eras — Crusades, American Civil War, and Modern Conflict.
      </p>
      <div className="splash-actions">
        <button className="cta-button" onClick={onStart} type="button">
          Single player
        </button>
        <button className="cta-button" disabled title="Coming soon" type="button">
          Multiplayer
        </button>
      </div>
    </section>
  );
}

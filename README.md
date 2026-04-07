# Dust and Steel

Browser tactics game prototype: desktop-first UI in **React**, battlefield rendering in **Three.js**, and a deterministic fixed-step simulation in TypeScript. Content (eras, factions, units, maps) lives under `src/content`.

## Requirements

- [Bun](https://bun.sh) (see `packageManager` in `package.json` for the pinned version)

## Scripts

| Command | Description |
|--------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Vite dev server (default port **5173**) |
| `bun run build` | TypeScript project build + production bundle |
| `bun run preview` | Preview the production build locally |
| `bun run test` | Vitest (simulation and unit-style tests) |
| `bun run test:watch` | Vitest in watch mode |
| `bun run test:e2e` | Playwright smoke tests |

## Project layout

For module boundaries, data flow, and where to change gameplay vs. rendering vs. UI, see **[docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md)**.

## License

MIT — see `package.json`.

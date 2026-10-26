<p align="center">
  <img src="public/brand/flop-lockup-on-dark.png" alt="FLOP" width="320" />
</p>

<h1 align="center">Technocore City</h1>

<p align="center">
  Explore public Technocore rooms as an interactive 3D city.
</p>

<p align="center">
  <a href="https://technocore-pulse-hazel.vercel.app/">Explore the city</a>
  · <a href="https://asadlee.bond">Built by Asad Lee</a>
  · <a href="https://x.com/asadleo416">Follow the build</a>
</p>

---

Technocore City turns the public room index into a city you can explore, from its waterfront and streets to rooftop gardens and office interiors. Each room building links back to its public Technocore source.

Built with **Three.js, React and TypeScript**, this is an independent community project inspired by the FLOP Lab ecosystem. The repository retains its original name, **technocore-pulse**, and its public-data observation tools.

## Explore the city

- **Room buildings:** discover up to 48 indexed rooms through named buildings and a searchable directory.
- **City, building and interior views:** move from the skyline into a selected building and its furnished office cutaway.
- **Guided tour:** take a 32-second route through the waterfront, FLOP Plaza, a room building, an office interior and the skyline.
- **Day and night:** switch between a sunlit sky and a moonlit city with stars, or turn on rain.
- **Waterfront life:** animated water, promenades, a ferry, a tram, parks, a plaza fountain and rooftop gardens.
- **Street scenery:** moving vehicles and walking characters bring the blocks to life.
- **Saved rooms:** bookmark rooms and filter the directory; bookmarks stay on your device.
- **Public message journeys:** select a sampled record, visit its room building and open the original public source.
- **Responsive browsing:** touch-friendly controls and a directory that remains available if WebGL cannot start.

## Public data and illustrative scenery

The city combines public observations with designed scenery. They have different meanings:

| Element | What it represents |
| --- | --- |
| Room building | An entry from the public room index |
| Sampled message | A record retrieved from a public room, with a source link |
| Signature status | The result of checking the sampled record's available signature |
| Architectural style | An illustrative visual assignment, not a protocol classification |
| Office workers and terminals | A fixed illustrative crew, not a measured agent population |
| Cars, pedestrians, ferry, tram, weather and parks | Animated scenery |

**LIVE** observation starts empty and uses public read-only endpoints. If requests fail or are rate limited, the interface reports that state. Missing identity counts remain unknown.

**Captured public index** is an explicitly selected, timestamped snapshot for exploring the city when live access is unavailable. It contains original room-index entries, not fabricated messages or identities, and never seeds the live provider.

The underlying observation tools also retain separately labelled demo/replay datasets. These are not live Technocore results. Visual pulses indicate newly sampled local records; the project does not infer cross-room message routes.

### Sources and observation limits

Public reads use:

- `https://technocore.chat/rooms?format=json`
- `https://technocore.chat/r/<room>?format=json`

The adapter supports caching, bounded request concurrency, incremental reads and rate-limit backoff. The Vercel deployment includes a read-only API proxy.

Probe analysis recognizes `probe v1 | <run>.<n> | <arm> | <payload>` and measures subsequent activity within a 120-second observation window. Subsequent activity alone does not establish causation. Public room history is ephemeral; unavailable history is not reconstructed.

## Run locally

Use **Node.js 24** and npm.

```bash
git clone https://github.com/Asadlee24/technocore-pulse.git
cd technocore-pulse
npm ci
npm run dev
```

Open the local URL printed by Vite. No account or API key is required for the public read-only experience. Live data depends on upstream availability and browser access; the captured index remains a separate browsing option.

```bash
npm run build
npm run preview
npm run lint
```

The production build is written to `dist/`. Vite preview serves the frontend; Vercel serves the included serverless API routes in deployment.

## Validation

Run the focused checks from the repository root:

```bash
node test_data_modes.js
node test_crypto_verification.js
node test_api_proxy.mjs
node test_city_layout.mjs
node test_city_scene.mjs
node test_office_interiors.mjs
node test_city_life.mjs
```

These cover data separation, signature verification, the read-only proxy, building spacing, scene structure, interior behavior and animated civic scenery. Visual quality and performance should also be checked in a WebGL-capable browser.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/components/agent-city/` | Three.js city, buildings, interiors, sky, transport and scenery |
| `src/data/` | Public API adapter, captured index, parsing and signature verification |
| `src/context/DataContext.tsx` | Observation state and data-mode separation |
| `src/App.tsx` | Room directory, saved rooms, source journeys and city controls |
| `api/` | Vercel read-only public API proxy |
| `public/brand/` | Original FLOP logo exports and source attribution |

## Credits

Designed and built by **[Asad Lee](https://asadlee.bond)**.

[Portfolio](https://asadlee.bond) · [X / @asadleo416](https://x.com/asadleo416) · [GitHub](https://github.com/Asadlee24)

Original FLOP logo exports are preserved unchanged, with sources documented in [public/brand/README.md](public/brand/README.md).

Technocore City is an independent community contribution and is not an official FLOP Labs product.

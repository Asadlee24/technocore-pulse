# Technocore Pulse  Probe v1 Observatory
> **Visualizing agent communication in the wild**  
> *Community-built by Asad Lee · Not an official FLOP Labs product*

[![Built by Asad Lee](https://img.shields.io/badge/Builder-Asad%20Lee-36D7E7?style=flat-square)](https://asad-lee-portfolio.vercel.app/)
[![X @asadleo416](https://img.shields.io/badge/X-@asadleo416-4DA3FF?style=flat-square)](https://x.com/asadleo416)
[![GitHub Asadlee24](https://img.shields.io/badge/GitHub-Asadlee24-white?style=flat-square)](https://github.com/Asadlee24)
[![Protocol](https://img.shields.io/badge/Protocol-Technocore%20Probe%20v1-2FD27F?style=flat-square)](https://technocore.chat)

---

## Overview

**Technocore Pulse** is a standalone public data observatory and experimental intelligence atlas dedicated to Technocore’s labelled **`probe v1`** experiment.

Unlike standard explorers, **Pulse** measures subsequent autonomous AI agent activity across HTTP-native, zero-auth chat rooms under strict **120-second observation windows**.

---

## Data Honesty & Dual-Mode Architecture

To prevent presenting simulated baseline metrics as empirical findings, Technocore Pulse implements a global **LIVE vs DEMO** data engine:

### 1. DEMO Mode (Illustrative Benchmark)
- Explicitly labeled: *"Demo dataset — illustrative data, not live Technocore experiment results."*
- Uses calibrated reference values for user interface testing and architectural demonstrations.
- Uses strict non-causal terminology: *"120s window activity rate"* and *"median subsequent message latency"*.

### 2. LIVE Mode (Real-Time Technocore Ingestion)
- Connects directly to documented public read-only endpoints:
  - `GET /rooms?format=json` (sampling currently observed active rooms from the public index)
  - `GET /r/<room>?format=json` (inspecting chronological message sequences, Ed25519 signatures, and signed DIDs)
- Detects documented probe format:
  ```text
  probe v1 | <run>.<n> | <arm> | <payload>
  ```
- If zero probe posts are active in the recent ephemeral buffer, displays an honest collector status:
  `Observation began <timestamp> · 0 probe v1 events detected in recent ephemeral window`

---

## Architectural Positioning: The FLOP Model

Technocore coordinates agents prior to economic settlement:

$$\text{Coordinate (Technocore)} \longrightarrow \text{Agree} \longrightarrow \text{Settle} \longrightarrow \text{Verify}$$

1. **Coordinate (Technocore)**: HTTP-native, zero-auth chat and shared notes. Agents discover peers, exchange quotes, and calibrate parameters without transaction fees or gas latency.
2. **Agree**: Multi-party intent schemas and mutual cryptographic signatures.
3. **Settle**: On-chain smart contracts and atomic escrow release.
4. **Verify**: Zero-knowledge state transition proofs and verification nodes.

---

## Scientific Methodology & Non-Causality Caveats

- **120-Second Window Rule**: Events occurring after 120s from the probe drop are excluded from windowed calculations.
- **Non-Causality Attribution**: We measure *observed subsequent activity* and *participating signed identities*, avoiding ungrounded claims of universal mechanical causality unless an agent explicitly cites the probe sequence hash.
- **Cryptographic Verification**: Only valid W3C DIDs (`did:key:...`) with verified Ed25519 signature digests are counted.
- **Room Ephemerality**: Technocore room messages are ephemeral and purge regularly; historical events prior to server restarts are never fabricated.

---

## Tech Stack & Launch Assets

- **Framework**: React 19 + TypeScript + Vite
- **3D Engine**: Three.js WebGL (Hero constellation + Signature 3D Signal Map)
- **Styling**: Tailwind CSS v4 + Dark Obsidian Glass System
- **Icons**: Lucide React + Clean Vector SVG Social Icons
- **SEO & Social**: Custom 1200x630 Social Preview Card (`/og-image.png` with `/og-image.svg` source), robots.txt, sitemap.xml, custom brand favicon (`/favicon.svg`), canonical tags.

---

## Deployment to Vercel

```bash
# Clone the repository
git clone https://github.com/Asadlee24/technocore-pulse.git
cd technocore-pulse

# Install dependencies
npm install

# Test build
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 👤 Builder Identity & Attribution

- **Builder**: [Asad Lee](https://asad-lee-portfolio.vercel.app/)
- **X / Twitter**: [@asadleo416](https://x.com/asadleo416)
- **GitHub**: [Asadlee24](https://github.com/Asadlee24)
- **Portfolio**: [https://asad-lee-portfolio.vercel.app/](https://asad-lee-portfolio.vercel.app/)

> **Disclaimer**: *Technocore Pulse is an independent community contribution by Asad Lee. It is not an official FLOP Labs product.*

## Community City redesign

The primary experience is now a city atlas with a room directory, building/interior controls, source links, and an observation status bar. Up to 48 indexed rooms are visualized, while up to 8 rooms are sampled. Every room building maps to an actual index entry; an empty source produces no room buildings. The coordination monument, parks and transport are explicitly scenery. No cross-room message trajectories are inferred.

New sampled records trigger local visual pulses. Workers are a fixed illustrative crew, independent of observed identity counts and not a measured agent population. Missing counts remain unknown. A WebGL error boundary preserves the directory and record views if 3D is unavailable.

Validation (Node 24):

```bash
npm ci
npm run build
npm run lint
node test_data_modes.js
node --experimental-strip-types test_city_layout.mjs
node --experimental-strip-types test_crypto_verification.js
```

The browser used during development has WebGL disabled, so hardware-accelerated 3D visual quality and frame rate require a separate desktop verification.

### Detailed office interiors

Opening a building now creates a representative three-floor office with six designed robot workers per floor, full desktop monitors, keyboards, mice, task lights and chairs. This fixed crew is labelled illustrative and remains visible when identity counts are unknown. The interior camera approaches the open facade and hides upper floors to keep the ground-floor workstations visible. Office resources are allocated on selection and released on exit. Terminal textures are explicitly illustrative; the room command display retains observed values and shows UNKNOWN for missing identity counts.

Run `node test_office_interiors.mjs` for scene-graph, animation, camera-facing workstation and resource-lifecycle checks.

## FLOP computational city

Official logo exports from flop.finance/brand/ are preserved byte-for-byte in `public/brand/`. The interface follows the published Base, Ice White, Cyan and Space Mono direction. The old ornamental towers, water tanks, animated Times Square billboards and elevated pseudo-data rails have been replaced by stepped glass-and-concrete room buildings, roof terraces, a branded community pavilion, waterfront promenades, crosswalks and instanced street vehicles. Transport and architecture remain explicitly scenery.

When live requests are unavailable, visitors can explicitly choose the timestamped **captured public index**. `src/data/publicCitySnapshot.ts` records the public source URL, retrieval time and 48 original room-index entries. Captured mode has no sampled messages or identities, triggers no fabricated record pulses, and is labelled separately from live observation. It never seeds the LIVE provider.

### Walkable blocks update

The repeated radial tower rows have been replaced by a seven-by-seven street grid, keeping the central block for the scaled community pavilion. Most buildings are now low-rise, with selected mid-rise blocks and sparse taller anchors. Facades have fewer, softer lit windows and lighter structural detailing. Street scenery includes 64 moving cars/buses, 144 walking characters, crosswalks, traffic-light poles and pavement cafe furniture. These figures are fixed scene budgets and never presented as observed agent counts. Daylight is the initial scene setting, and the mobile camera pulls back to show more of the city.

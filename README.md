# Technocore Pulse — Probe v1 Observatory
> **Visualizing agent communication in the wild**  
> *Community-built by Asad Lee · Not an official FLOP Labs product*

[![Built by Asad Lee](https://img.shields.io/badge/Builder-Asad%20Lee-36D7E7?style=flat-square)](https://asad-lee-portfolio.vercel.app/)
[![X @asadleo416](https://img.shields.io/badge/X-@asadleo416-4DA3FF?style=flat-square)](https://x.com/asadleo416)
[![GitHub Asadlee24](https://img.shields.io/badge/GitHub-Asadlee24-white?style=flat-square)](https://github.com/Asadlee24)
[![Protocol](https://img.shields.io/badge/Protocol-Technocore%20Probe%20v1-2FD27F?style=flat-square)](https://technocore.chat)

---

## Overview

**Technocore Pulse** is an interactive 3D agent communication observatory and living metropolis dedicated to Technocore’s labelled **`probe v1`** experiment.

Featuring a procedural rectilinear diamond-grid city inspired by autonomous agent civilization simulations, Pulse combines empirical observation of real agent networks with a high-fidelity 50-citizen simulation environment:

- **Rectilinear Diamond-Grid Metropolis**: 13 cuboid structures positioned on a 45° rotated street grid with glowing neon wireframes, 3D text roof signs, inset windows, and street entrance doorways.
- **4 Open Stage Office Interiors**: Tower Control Room (triple video monitors, dual operator desks), Institute Classroom (presentation screen, scholar desks), Engineering Bay (tall server racks with blinking multicolored LED matrices, blue workstations), and Compute Foundry (compute cabinets, coolant pipes).
- **50 Persistent Simulated Citizens**: Calibrated in DEMO mode across 4 mutually exclusive states (`acting`: 25, `learning`: 21, `idle`: 4, `offline`: 0 = 50 total). Features sidewalk graph pedestrian walking and a repeatable RIVET scholar graduation sequence.
- **Cinematic Camera Director**: 58-second continuous directed tour with narrative caption banners, smooth isometric framing (60–75% viewport fill), building focus, interior cutaways, and agent tracking.
- **Minimal Reference HUD**: Restrained 5-button bottom dock (`[ EXPLORE ]`, `[ AGENTS ]`, `[ ACTIVITY ]`, `[ TOUR ]`, `[ MENU ]`), floating event ticker strip, and live status diagnostics.

---

## Data Honesty & Dual-Mode Architecture

To prevent presenting simulated baseline metrics as empirical findings, Technocore Pulse implements a global **LIVE vs DEMO vs REPLAY** data engine:

### 1. DEMO Mode (50 Simulated Citizens Benchmark)
- Explicitly labeled: *"Agent City · 50 Simulated Citizens (Demo mode simulation)"*
- Reconciles 50 persistent citizens across four mutually exclusive states with sidewalk wayfinding and graduation storyline.
- Uses strict non-causal terminology and provides interactive inspection of citizen roles, states, and action logs.

### 2. LIVE Mode (Real-Time Technocore Ingestion)
- Connects directly to documented public read-only endpoints:
  - `GET /rooms?format=json` (sampling currently observed active rooms from the public index)
  - `GET /r/<room>?format=json` (inspecting chronological message sequences, Ed25519 signatures, and signed DIDs)
- Strict cryptographic truthfulness: distinct verified signing DID deduplication (`new Set(liveSignedRecords.filter(r => r.verificationStatus === 'VERIFIED').map(r => r.did)).size`).
- Detects documented probe format:
  ```text
  probe v1 | <run>.<n> | <arm> | <payload>
  ```
- If zero probe posts are active in the recent ephemeral buffer, displays an honest collector status:
  `Observation began <timestamp> · 0 probe v1 events detected in recent ephemeral window`

### 3. REPLAY Mode (Captured Session Playback)
- Plays back messages captured in the current user session. If no session data has been recorded yet, honestly displays an empty capture state rather than mocking synthetic historical events.

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

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  CloudRain,
  Bookmark,
  ArrowDown,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Compass,
  Eye,
  Footprints,
  Layers3,
  Maximize2,
  RefreshCw,
  Search,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { DataProvider, useData } from "./context/DataContext";
import { CityBoundary } from "./components/CityBoundary";
const AgentCity3D = lazy(() =>
  import("./components/agent-city/AgentCity3D").then((m) => ({
    default: m.AgentCity3D,
  })),
);
import type { CameraViewLevel } from "./components/agent-city/CityLODManager";
import type { SignedRecord, RoomCluster } from "./types/probe";
import "./App.css";
import { PUBLIC_CITY_SNAPSHOT } from "./data/publicCitySnapshot";
const capturedRooms: RoomCluster[] = PUBLIC_CITY_SNAPSHOT.rooms.map(
  (room, index) => ({
    id: `captured-room-${room.room}`,
    name: room.room,
    displayName: `#${room.room}`,
    category: "unclassified",
    signedIdentitiesObserved: null,
    activeAgentsCount: null,
    totalProbesReceived: 0,
    medianSubsequentLatencySeconds: null,
    status: room.idle_seconds < 30 ? "active" : "nominal",
    color: "#00B4D8",
    coordinates: [index, 0, 0],
    topic: room.topic,
  }),
);

function Metropolis() {
  const {
    activeRoomClusters: liveClusters,
    signedRecords: liveSignedRecords,
    observerHealth,
    isLiveLoading,
    liveError,
    refreshLiveData,
    activeStats,
    liveRooms,
  } = useData();
  const [snapshotMode, setSnapshotMode] = useState(false);
  const sourceRooms = snapshotMode ? capturedRooms : liveClusters;
  const rooms = useMemo(() => {
    const landmarks = ["technocore", "lobby", "kibble", "tclk-offers", "announcements", "flop-network", "flop_governance", "meta", "pin", "general"];
    const rank = (name: string) => {
      const i = landmarks.indexOf(name);
      return i < 0 ? landmarks.length : i;
    };
    return [...sourceRooms].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  }, [sourceRooms]);
  const signedRecords = snapshotMode ? [] : liveSignedRecords;
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<CameraViewLevel>("city");
  const [perspective, setPerspective] = useState<
    "orbit" | "drone" | "plaza" | "walk" | "building"
  >("orbit");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showInfo, setShowInfo] = useState(false);
  const [rainy, setRainy] = useState(false);
  const [tour, setTour] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [focusedRecord, setFocusedRecord] = useState<SignedRecord | null>(null);
  const [savedRooms, setSavedRooms] = useState<string[]>(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem("technocore-city:saved-rooms:v1") ?? "[]"); return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))].slice(0, 200) : []; }
    catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("technocore-city:saved-rooms:v1", JSON.stringify(savedRooms)); } catch { /* Browsing remains available when storage is disabled. */ } }, [savedRooms]);
  const stopTour = () => { setTour(false); setView("city"); setPerspective("orbit"); };

  const [showDirectory, setShowDirectory] = useState(false);
  const [cityUnavailable, setCityUnavailable] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const guideTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!showInfo) return;
    guideTrigger.current = document.activeElement as HTMLElement;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInfo(false);
      if (e.key !== "Tab") return;
      const nodes =
        dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]");
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      guideTrigger.current?.focus();
    };
  }, [showInfo]);
  const selected = rooms.find((r) => r.id === selectedId) ?? rooms[0];
  const filtered = useMemo(
    () =>
      rooms.filter((r) =>
        (!savedOnly || savedRooms.includes(r.name)) && `${r.name} ${r.topic ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [rooms, query, savedOnly, savedRooms],
  );
  const selectRoom = (room: RoomCluster) => {
    setTour(false);
    setFocusedRecord(null);
    setSelectedId(room.id);
    setView("building");
    setPerspective("orbit");
    setShowDirectory(false);
  };
  const records = signedRecords.filter((r) => r.room === selected?.name);
  const healthy = !snapshotMode && observerHealth === "LIVE" && !isLiveLoading;
  const verified = new Set(
    signedRecords
      .filter((r) => r.verificationStatus === "VERIFIED")
      .map((r) => r.did),
  ).size;

  return (
    <div className="metropolis">
      <header className="masthead">
        <a
          className="flop-brand"
          href="https://flop.finance"
          target="_blank"
          rel="noreferrer"
          aria-label="FLOP Network official website"
        >
          <img
            src="/brand/flop-lockup-on-dark.png"
            alt="FLOP"
            width="270"
            height="135"
          />
        </a>
        <a className="project-identity" href="#city">
          <strong>TECHNOCORE CITY</strong>
          <span>COMMUNITY OBSERVATORY</span>
        </a>
        <span className="edition">INDEPENDENT COMMUNITY BUILD · ASAD LEE</span>
        <nav>
          <button onClick={() => setShowInfo(true)}>
            About the city <ArrowUpRight size={14} />
          </button>
          <a
            href="https://github.com/Asadlee24/technocore-pulse"
            target="_blank"
            rel="noreferrer"
          >
            Source <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>

      <main id="city" className={`city-stage scene-${theme}`}>
        <div className="stage-heading">
          <div>
            <span className="eyebrow">
              FLOP ECOSYSTEM / PUBLIC COORDINATION
            </span>
            <h1>
              Explore <em>the city.</em>
            </h1>
            <p>
              Real rooms. A living streetscape.
              <br />
              Open a building. Meet its illustrative crew.
            </p>
          </div>
          <span className="vertical-caption">
            PROCEDURAL ARCHITECTURE · THREE.JS
          </span>
        </div>
        <div className="scene-area">
          <CityBoundary rooms={rooms} onSelect={selectRoom} onUnavailable={() => setCityUnavailable(true)}>
            <Suspense
              fallback={<div className="city-loading">Preparing the city…</div>}
            >
              <AgentCity3D
                activeRoomClusters={rooms}
                selectedRoom={selected}
                onSelectRoom={selectRoom}
                onOpenBuildingSheet={selectRoom}
                viewLevel={view}
                onViewLevelChange={setView}
                cameraPerspective={perspective}
                onPerspectiveChange={setPerspective}
                theme={theme}
                observedRecords={signedRecords}
                rainy={rainy}
                isShowcase={tour}
                onExitShowcase={stopTour}
                compactControls
              />
            </Suspense>
          </CityBoundary>
        </div>
        <div className="scene-vignette" />
        {view === "interior" && !cityUnavailable && (
          <div className="office-caption">
            <span>INSIDE THE WORKSPACE</span>
            <strong>#{selected?.name}</strong>
            <p>
              Illustrative crew · animated workstations
              <br />
              Public room observations remain in the directory.
            </p>
          </div>
        )}
        <div className="scene-label">
          <span className="crosshair">+</span>
          <span>
            TECHNOCORE
            <br />
            <small>Independent community atlas</small>
          </span>
        </div>
        <div className="city-experiences" role="group" aria-label="City experiences">
          <button disabled={cityUnavailable} aria-pressed={tour} onClick={() => { if (tour) stopTour(); else { setView("city"); setPerspective("orbit"); setFocusedRecord(null); setTour(true); } }}><Play size={14} />{tour ? "Stop tour" : "Take a tour"}</button>
          <button disabled={cityUnavailable} aria-pressed={rainy} onClick={() => setRainy(!rainy)}><CloudRain size={14} />{rainy ? "Rain on" : "Rain"}</button>
        </div>
        {focusedRecord && <section className="message-caption" aria-label="Selected public message">
          <button className="message-close" aria-label="Close selected message" onClick={() => setFocusedRecord(null)}><X size={15}/></button>
          <span className="eyebrow">FROM THE PUBLIC RECORD</span><strong>#{focusedRecord.room}</strong>
          {!rooms.some(room => room.name === focusedRecord.room) && <small>This room is outside the current city index.</small>}
          <p>{focusedRecord.message.slice(0, 420)}</p><small>{focusedRecord.verificationStatus.replaceAll("_", " ").toLowerCase()}</small>
          <a href={`https://technocore.chat/r/${encodeURIComponent(focusedRecord.room)}?format=json`} target="_blank" rel="noreferrer">Read original source <ArrowUpRight size={13}/></a>
        </section>}
        <div className="scene-tools">
          <button
            title="Change scene lighting"
            aria-label="Change scene lighting"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            title="Toggle aerial tour"
            aria-label="Toggle aerial tour"
            aria-pressed={perspective === "drone"}
            onClick={() => {
              setPerspective(perspective === "drone" ? "orbit" : "drone");
              setView("city");
            }}
          >
            <Compass size={18} />
          </button>
          <button
            title="Explore the streets"
            aria-label="Explore the streets"
            aria-pressed={perspective === "walk"}
            disabled={cityUnavailable}
            onClick={() => {
              setView("city");
              setPerspective(perspective === "walk" ? "orbit" : "walk");
            }}
          >
            <Footprints size={18} />
          </button>
          <button
            title="Full screen"
            aria-label="Full screen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void document.documentElement
                  .requestFullscreen?.()
                  .catch(() => {});
            }}
          >
            <Maximize2 size={18} />
          </button>
        </div>

        <aside
          className={`city-directory ${showDirectory ? "directory-open" : ""}`}
        >
          <div className="directory-top">
            <span className="eyebrow">THE NEIGHBOURHOOD</span>
            <button
              className="directory-close"
              aria-label="Close room directory"
              onClick={() => setShowDirectory(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="directory-title">
            <h2>Room directory</h2>
            <span>{rooms.length.toString().padStart(2, "0")}</span>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Find a room"
              placeholder="Find a room…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span>/</span>
          </label>
          <button className="saved-filter" aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)}><Bookmark size={13}/>{savedOnly ? "Show all rooms" : `Saved rooms (${savedRooms.length})`}</button>
          <div className="room-list">
            {filtered.map((room, index) => (
              <button
                key={room.id}
                className={`room-row ${selected?.id === room.id ? "selected" : ""}`}
                onClick={() => selectRoom(room)}
              >
                <span className="room-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="room-name">
                  {room.name}
                  <small>{room.topic || "Public coordination room"}</small>
                </span>
                <span
                  className={`room-dot ${room.status === "active" ? "active" : ""}`}
                />
                <ChevronRight size={14} />
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="directory-empty">
                {isLiveLoading
                  ? "Reading the public room index…"
                  : rooms.length
                    ? savedOnly ? "No saved rooms match. Open a room and choose Save room." : "No matching room."
                    : "No rooms available from the public source."}
              </div>
            )}
          </div>
          <div className="directory-caption">
            Buildings map to indexed rooms.
            <br />
            Architecture and district placement are illustrative.
          </div>
          {selected && (
            <div className="room-detail">
              <span className="eyebrow">SELECTED BUILDING</span>
              <h3>#{selected.name}</h3>
              <button className="save-room" aria-pressed={savedRooms.includes(selected.name)} onClick={() => setSavedRooms(previous => previous.includes(selected.name) ? previous.filter(name => name !== selected.name) : [...previous, selected.name])}><Bookmark size={13}/>{savedRooms.includes(selected.name) ? "Saved on this device" : "Save room"}</button>
              <p>{selected.topic || "No topic published for this room."}</p>
              <dl>
                <div>
                  <dt>Observed DIDs</dt>
                  <dd>{selected.signedIdentitiesObserved ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Verified signing DIDs</dt>
                  <dd>{selected.verifiedSigningDids ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Probe v1 posts</dt>
                  <dd>
                    {snapshotMode
                      ? "Not sampled"
                      : selected.totalProbesReceived}
                  </dd>
                </div>
              </dl>
              <button
                className="interior-link"
                disabled={cityUnavailable}
                onClick={() => {
                  setView("interior");
                  setPerspective("orbit");
                  setShowDirectory(false);
                }}
              >
                {cityUnavailable ? "3D requires WebGL" : "Look inside the office"} <ArrowUpRight size={16} />
              </button>
              <a
                className="source-link"
                href={`https://technocore.chat/r/${encodeURIComponent(selected.name)}?format=json`}
                target="_blank"
                rel="noreferrer"
              >
                Read original room data <ArrowUpRight size={13} />
              </a>
            </div>
          )}
        </aside>

        <div className="city-toolbar">
          <div className="view-switch" role="group" aria-label="City view">
            {(
              [
                { key: "city", label: "City", icon: Compass },
                { key: "building", label: "Building", icon: Building2 },
                { key: "interior", label: "Interior", icon: Layers3 },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                disabled={key !== "city" && (!selected || cityUnavailable)}
                aria-pressed={view === key}
                className={view === key ? "current" : ""}
                onClick={() => {
                  setView(key);
                  setPerspective("orbit");
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <span className="interaction-hint">
            Drag to orbit <span>·</span> Scroll to explore
          </span>
          <button
            className="mobile-directory"
            onClick={() => setShowDirectory(true)}
          >
            <Building2 size={16} /> Rooms
          </button>
        </div>
        {rooms.length === 0 && (
          <div className="city-empty">
            <Eye size={25} />
            <h2>
              {isLiveLoading
                ? "Looking for signs of life."
                : "The observer is quiet."}
            </h2>
            <p>
              {isLiveLoading
                ? "Reading Technocore’s public room index."
                : "Live rooms could not be loaded. The city stays empty until the source returns."}
            </p>
            {!isLiveLoading && (
              <>
                <button onClick={() => void refreshLiveData()}>
                  Retry public source <RefreshCw size={14} />
                </button>
                <button
                  className="snapshot-entry"
                  onClick={() => setSnapshotMode(true)}
                >
                  Explore captured public city <ArrowUpRight size={14} />
                </button>
              </>
            )}
          </div>
        )}
        {snapshotMode && (
          <div className="capture-ribbon">
            <strong>CAPTURED PUBLIC INDEX · NOT LIVE</strong>
            <span>
              {new Date(PUBLIC_CITY_SNAPSHOT.capturedAt).toLocaleString()} ·{" "}
              {rooms.length} real rooms. Identities and messages were not
              sampled.
            </span>
            <br />
            <button
              onClick={() => {
                setSnapshotMode(false);
                void refreshLiveData();
              }}
            >
              Return to live observer →
            </button>
          </div>
        )}
        <div className="scene-footnote">
          Architecture is generated in code. Office crews and urban transport
          are illustrative.
        </div>
      </main>

      <div className="observation-bar">
        <div className="observer-state">
          <span className={`status-dot ${healthy ? "connected" : ""}`} />
          <strong>
            {snapshotMode
              ? "CAPTURED INDEX"
              : isLiveLoading
                ? "SYNCING"
                : observerHealth}
          </strong>
          <span>
            {snapshotMode
              ? "Timestamped public source"
              : "Public read-only observer"}
          </span>
          <button
            aria-label="Refresh public observations"
            disabled={isLiveLoading}
            onClick={() => void refreshLiveData()}
          >
            <RefreshCw
              size={14}
              className={isLiveLoading ? "refreshing" : ""}
            />
          </button>
        </div>
        <div className="observation-stats">
          <span>
            <b>{snapshotMode ? rooms.length : liveRooms.length}</b>{" "}
            {snapshotMode ? "captured rooms" : "indexed rooms"}
          </span>
          <span>
            <b>{snapshotMode ? "—" : activeStats.ephemeralMessageDepth}</b>{" "}
            sampled messages
          </span>
          <span>
            <b>{snapshotMode ? "—" : verified}</b> verified DIDs
          </span>
        </div>
        <button className="method-link" onClick={() => setShowInfo(true)}>
          How to read this <ArrowDown size={14} />
        </button>
      </div>
      {liveError && !snapshotMode && (
        <div className="source-error">
          Source unavailable: {liveError.slice(0, 180)}. Previous observations
          may be stale.
        </div>
      )}
      <section className="field-notes">
        <div>
          <span className="eyebrow">FROM THE PUBLIC RECORD</span>
          <h2>Signals, with their sources.</h2>
          <p>
            The city maps public Technocore rooms. FLOP branding follows the
            official published assets; this remains an independent community
            contribution. It does not infer private agent work, compute jobs or
            on-chain settlement.
          </p>
        </div>
        <div className="event-records">
          {(selected ? records : signedRecords).slice(0, 3).map((record, i) => (
            <button
              className="record-journey"
              onClick={() => {
                const room = rooms.find(room => room.name === record.room);
                if (room) selectRoom(room);
                setFocusedRecord(record);
                document.getElementById("city")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              }}
              key={`${record.did}-${record.sequence}-${i}`}
            >
              <span>
                {new Date(record.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div>
                <strong>#{record.room}</strong>
                <p>{record.message.slice(0, 140)}</p>
                <small>
                  {record.verificationStatus.replaceAll("_", " ").toLowerCase()} · Visit this room
                </small>
              </div>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {(selected ? records : signedRecords).length === 0 && (
            <div className="no-records">
              No sampled signed records for{" "}
              {selected ? `#${selected.name}` : "this observation window"}.
              <br />
              <small>Unknown activity stays unknown.</small>
            </div>
          )}
        </div>
      </section>
      <footer className="metro-footer">
        <span>
          FLOP ecosystem · Independent community contribution, not an official
          FLOP Labs product.
        </span>
        <a href="https://asadlee.bond" target="_blank" rel="noreferrer">
          Built by Asad Lee <ArrowUpRight size={14} />
        </a>
        <a href="https://x.com/flop_labs" target="_blank" rel="noreferrer">
          FLOP Labs <ArrowUpRight size={14} />
        </a>
      </footer>
      {showInfo && (
        <div className="info-scrim" onClick={() => setShowInfo(false)}>
          <section
            ref={dialogRef}
            className="info-panel"
            role="dialog"
            aria-modal="true"
            aria-label="How to read the city"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="info-close"
              aria-label="Close city guide"
              onClick={() => setShowInfo(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">A NOTE ON THE MAP</span>
            <h2>
              Observation,
              <br />
              with context.
            </h2>
            <p>
              Each building represents a room returned by Technocore’s public
              index. Up to 48 rooms are visualized; recent messages are sampled
              from up to 8 rooms with bounded read-only requests.
            </p>
            <p>
              Building height and district placement are architectural choices.
              Lit windows indicate recent room activity. New sampled signed
              records trigger local visual pulses; these are not evidence of
              causal links between rooms.
            </p>
            <p>
              Office workers are a fixed illustrative crew, independent of
              observed DIDs. They are not a verified count of autonomous agents.
              Cars, the ferry, tram, fountain, gardens and weather are scenery. No compute,
              settlement or token metrics are inferred.
            </p>
            <p>
              Ed25519 verification status is shown per sampled record. Missing
              records, offline sources and unknown values remain explicit. This
              is an independent community project, not an official FLOP Labs
              product.
            </p>
            <p>Take a tour follows a 32-second route from the waterfront to an illustrative office. Drag to stop the tour. Rain is optional. Saved rooms stay in this browser on this device. Click a public record to visit its room and read the original source.</p>
            <a
              href="https://technocore.chat/rooms?format=json"
              target="_blank"
              rel="noreferrer"
            >
              Open the public source <ArrowUpRight size={16} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
export default function App() {
  return (
    <DataProvider>
      <Metropolis />
    </DataProvider>
  );
}

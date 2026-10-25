import { Component, type ReactNode } from "react";
import type { RoomCluster } from "../types/probe";

export class CityBoundary extends Component<
  {
    children: ReactNode;
    rooms: RoomCluster[];
    onSelect: (room: RoomCluster) => void;
    onUnavailable?: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable?.();
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="city-plan">
        <div className="plan-grid" aria-label="Room map fallback">
          {this.props.rooms.map((room, i) => (
            <button
              key={room.id}
              className="plan-building"
              title={`Open #${room.name}`}
              onClick={() => this.props.onSelect(room)}
            >
              <small>{String(i + 1).padStart(2, "0")}</small><span>#{room.name}</span>
            </button>
          ))}
        </div>
        <div className="webgl-notice">
          <strong>Room directory · 3D unavailable in this browser</strong>
          <p>
            This browser could not start WebGL. The room directory and public
            records remain available. Use a browser with hardware acceleration
            for the 3D city.
          </p>
        </div>
      </div>
    );
  }
}

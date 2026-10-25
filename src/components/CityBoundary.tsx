import { Component, type ReactNode } from "react";
import type { RoomCluster } from "../types/probe";

export class CityBoundary extends Component<
  {
    children: ReactNode;
    rooms: RoomCluster[];
    onSelect: (room: RoomCluster) => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
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
              style={{ height: `${35 + (i % 5) * 12}px` }}
              title={`Open #${room.name}`}
              onClick={() => this.props.onSelect(room)}
            >
              <span>{room.name}</span>
            </button>
          ))}
        </div>
        <div className="webgl-notice">
          <strong>Room map · 3D unavailable</strong>
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

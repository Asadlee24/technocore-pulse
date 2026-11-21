import { useMemo, type Ref } from "react";
import { X } from "lucide-react";
import type { RoomCluster } from "../../types/probe";
import { CITY_GRID, CIVIC_SPACES, QUAY_WALK, generateCityLayout } from "./cityLayout";

interface CityMapProps {
  dialogRef: Ref<HTMLDialogElement>;
  rooms: RoomCluster[];
  selectedName?: string;
  onSelectRoom: (room: RoomCluster) => void;
}

const position = (metres: number) => `${(metres / CITY_GRID.shore + 1) * 50}%`;

export function CityMap({ dialogRef, rooms, selectedName, onSelectRoom }: CityMapProps) {
  const { buildings } = useMemo(() => generateCityLayout(rooms), [rooms]);
  const { streetXs, streetZs, quaysideGardens, quayTram } = CITY_GRID;

  return (
    <dialog ref={dialogRef} className="city-map-dialog" aria-labelledby="city-map-title">
      <div className="city-map-heading">
        <h2 id="city-map-title">City map</h2>
        <form method="dialog"><button aria-label="Close city map"><X size={19} /></button></form>
      </div>
      <div className="city-map-plan">
        <div className="city-map-land" />
        <span className="city-map-north" aria-label="North">↑ N</span>
        <span className="city-map-harbor">North Quay</span>
        <span className="city-map-boardwalk" title="North Quay boardwalk" style={{
          top: position(QUAY_WALK.z), left: position(-QUAY_WALK.length / 2), right: position(-QUAY_WALK.length / 2),
        }} />
        <span className="city-map-boardwalk-crossing" title="Pedestrian crossing" style={{
          left: position(QUAY_WALK.crossingX), top: position(QUAY_WALK.z), height: "7%",
        }} />
        <span className="city-map-tram" style={{ top: position(quayTram.z), left: position(-quayTram.halfLength), right: position(-quayTram.halfLength) }} />
        {quayTram.stopXs.map(x => <span key={x} className="city-map-tram-stop" title="Tram stop" style={{ left: position(x), top: position(quayTram.z) }} />)}
        {quaysideGardens.map(([x, z]) => (
          <span key={`${x}-${z}`} className="city-map-quay-garden" title="Waterfront garden" style={{ left: position(x), top: position(z) }} />
        ))}
        {streetXs.map(x => (
          <span key={x} className={`city-map-street vertical ${Math.abs(x) === 9 ? "avenue" : ""}`} style={{ left: position(x) }} />
        ))}
        {streetZs.map(z => (
          <span key={z} className={`city-map-street horizontal ${Math.abs(z) === 9 ? "avenue" : ""}`} style={{ top: position(z) }} />
        ))}
        {CIVIC_SPACES.map(space => (
          <span key={space.name} title={space.name} className={`city-map-place ${space.kind}`} style={{ left: position(space.x), top: position(space.z) }} />
        ))}
        {buildings.map(({ room, position: [x, , z], height }) => (
          <button
            type="button"
            className={`city-map-room${height > 19 ? " tower" : ""}`}
            key={room.id}
            style={{ left: position(x), top: position(z) }}
            aria-label={`Visit #${room.name}`}
            aria-current={room.name === selectedName ? "location" : undefined}
            title={`#${room.name}`}
            onClick={event => {
              event.currentTarget.closest("dialog")?.close();
              onSelectRoom(room);
            }}
          />
        ))}
      </div>
      <div className="city-map-legend">
        <span><i className="legend-room" />Public room</span>
        <span><i className="legend-park" />Park</span>
        <span><i className="legend-market" />Market or station</span>
        <span><i className="legend-tram" />Tram</span>
        <span><i className="legend-plaza" />FLOP Plaza</span>
      </div>
    </dialog>
  );
}

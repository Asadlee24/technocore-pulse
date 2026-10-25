import * as THREE from "three";
import type { RoomCluster } from "../../types/probe";
import type { BuildingLayout } from "./cityLayout";
import { AgentDeskFactory } from "./AgentDesk";
import { AgentOfficeFloor } from "./AgentOfficeFloor";

export class OfficeInterior {
  public group: THREE.Group;
  public layout: BuildingLayout;
  private floors: AgentOfficeFloor[] = [];
  private interiorLight: THREE.PointLight;

  constructor(layout: BuildingLayout) {
    this.layout = layout;
    this.group = new THREE.Group();
    this.group.name = `interior-${layout.room.id}`;
    this.group.visible = false; // Hidden by default (LOD City Overview)

    // Interior Warm Cyan Illumination
    this.interiorLight = new THREE.PointLight(0xffe5bb, 5, layout.width * 2.5);
    this.interiorLight.position.set(0, 2.0, 0);
    this.group.add(this.interiorLight);

    // Floors are allocated only while a building is open.
  }

  private buildFloors() {
    const floorHeight = 2.4;
    // Show 2-3 representative active floors
    const numFloors = Math.min(
      3,
      Math.max(1, Math.floor((this.layout.height - 2) / floorHeight)),
    );

    for (let f = 0; f < numFloors; f++) {
      const isCommandFloor = f === 0;
      const floor = new AgentOfficeFloor({
        floorIndex: f,
        floorHeight: floorHeight,
        width: this.layout.width,
        depth: this.layout.depth,
        room: this.layout.room,
        isCommandFloor,
      });
      this.floors.push(floor);
      this.group.add(floor.group);
    }
  }

  public setCutawayVisible(visible: boolean) {
    this.group.visible = visible;
    if (visible && this.floors.length === 0) this.buildFloors();
    if (!visible && this.floors.length) {
      this.floors.forEach((f) => {
        this.group.remove(f.group);
        f.dispose();
      });
      this.floors = [];
    }
  }

  public setFocusedFloor(floor: number | null) {
    this.floors.forEach((item, index) => {
      item.group.visible = floor === null || index === floor;
    });
  }

  public update(time: number) {
    if (!this.group.visible) return;
    AgentDeskFactory.updateScreens(time);
    this.floors.forEach((f) => {
      if (f.group.visible) f.update(time);
    });

    // Subtle interior light breathing
    this.interiorLight.intensity = 4.5 + Math.sin(time * 0.6) * 0.15;
  }

  public updateRoomData(room: RoomCluster) {
    this.layout.room = room;
    this.floors.forEach((f) => f.updateRoomData(room));
  }

  public dispose() {
    this.floors.forEach((f) => f.dispose());
    this.floors = [];
  }
}

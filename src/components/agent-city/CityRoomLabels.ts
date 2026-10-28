import * as THREE from 'three';
import type { CityBuilding } from './CityBuilding';

/** Native text stays sharp at any device pixel ratio; geometry still owns room selection. */
export class CityRoomLabels {
  private layer = document.createElement('div');
  private labels = new Map<string, HTMLDivElement>();
  private projected = new THREE.Vector3();
  private lastUpdate = -Infinity;
  constructor(container: HTMLElement) {
    this.layer.className = 'city-room-labels';
    this.layer.setAttribute('aria-hidden', 'true');
    container.appendChild(this.layer);
  }
  update(buildings: Map<string, CityBuilding>, camera: THREE.PerspectiveCamera, width: number, height: number, selectedId: string, now: number) {
    // Layout at 20 Hz keeps text synchronized without laying out every render frame.
    if (now-this.lastUpdate < .05) return;
    this.lastUpdate=now;
    const candidates: {id:string;name:string;x:number;y:number;distance:number;selected:boolean}[]=[];
    for(const [id,b] of buildings) {
      if(b.isCutaway) continue;
      this.projected.set(b.layout.position[0],b.layout.height+4.2,b.layout.position[2]);
      const distance=this.projected.distanceToSquared(camera.position);
      this.projected.project(camera);
      if(this.projected.z < -1 || this.projected.z > 1) continue;
      const x=(this.projected.x*.5+.5)*width, y=(-this.projected.y*.5+.5)*height;
      if(x<55||x>width-70||y<100||y>height-90) continue;
      if(x<Math.min(width*.72,340)&&y<200) continue;
      candidates.push({id,name:b.layout.room.name,x,y,distance,selected:id===selectedId});
    }
    candidates.sort((a,b)=>Number(b.selected)-Number(a.selected)||a.distance-b.distance);
    const occupied:{left:number;right:number;top:number;bottom:number}[]=[];
    const visible=new Set<string>();
    for(const c of candidates) {
      if(visible.size >= (width<600?6:12)) break;
      const name=c.name.length>23?c.name.slice(0,21)+'…':c.name;
      const labelWidth=Math.min(width-30,Math.max(78,name.length*6.7+28));
      const rect={left:c.x-labelWidth/2,right:c.x+labelWidth/2,top:c.y-27,bottom:c.y+9};
      if(occupied.some(r=>rect.left<r.right+8&&rect.right>r.left-8&&rect.top<r.bottom+7&&rect.bottom>r.top-7)) continue;
      occupied.push(rect);visible.add(c.id);
      let label=this.labels.get(c.id);
      if(!label){label=document.createElement('div');this.labels.set(c.id,label);this.layer.appendChild(label);}
      label.className=`city-room-label${c.selected?' is-selected':''}`;
      label.textContent='#'+name;label.title='#'+c.name;
      label.style.width=`${labelWidth}px`;
      label.style.transform=`translate(${Math.round(rect.left)}px,${Math.round(c.y-25)}px)`;
      label.hidden=false;
    }
    for(const [id,label] of this.labels) {
      label.hidden=!visible.has(id);
      if(!buildings.has(id)){label.remove();this.labels.delete(id);}
    }
  }
  dispose(){this.layer.remove();this.labels.clear();}
}

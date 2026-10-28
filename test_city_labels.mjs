import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CityRoomLabels} from './src/components/agent-city/CityRoomLabels.ts';
const old=globalThis.document;
const element=()=>({children:[],style:{},hidden:false,appendChild(c){this.children.push(c);c.parent=this;},setAttribute(){},remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}});
globalThis.document={createElement:element};
try{
 const parent=element(),labels=new CityRoomLabels(parent),camera=new THREE.PerspectiveCamera(45,390/700,.5,2000);
 camera.position.set(0,40,90);camera.lookAt(0,8,0);camera.updateMatrixWorld(true);
 const buildings=new Map(Array.from({length:20},(_,i)=>[String(i),{isCutaway:false,layout:{position:[(i-10)*3,0,0],height:10,room:{name:i===10?'<untrusted-room>':'room-'+i}}}]));
 labels.update(buildings,camera,390,700,'10',0);
 const shown=parent.children[0].children.filter(c=>!c.hidden);
 assert.ok(shown.length>0&&shown.length<=6,'Mobile label count stays bounded');
 const selected=shown.find(c=>c.className.includes('is-selected'));
 assert.equal(selected.textContent,'#<untrusted-room>','Untrusted names use textContent');
 for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++){
  const pos=c=>c.style.transform.match(/-?\d+/g).map(Number);
  const [ax,ay]=pos(shown[i]),[bx,by]=pos(shown[j]);
  assert.ok(ax+parseFloat(shown[i].style.width)+7<=bx||bx+parseFloat(shown[j].style.width)+7<=ax||Math.abs(ay-by)>=42,'Labels do not overlap');
 }
 labels.update(new Map(),camera,390,700,'',1);
 assert.equal(parent.children[0].children.length,0,'Removed rooms leave no old labels');
 labels.dispose();assert.equal(parent.children.length,0,'Overlay is removed on scene disposal');
 console.log('Crisp labels: mobile limit, selected priority, literal untrusted names, collision avoidance, stale-room removal and disposal passed.');
}finally{globalThis.document=old;}

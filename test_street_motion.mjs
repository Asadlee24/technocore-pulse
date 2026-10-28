import assert from 'node:assert/strict';
import {roundedBlockPose,streetVehiclePose} from './src/components/agent-city/streetMotion.ts';
const perimeter=4*(2*(8.3-1.1)+Math.PI*1.1/2);
for(let d=0;d<perimeter;d+=.01){
  const p=roundedBlockPose(d),next=roundedBlockPose(d+.001);
  assert.ok(Math.abs(p.x)<=8.300001&&Math.abs(p.z)<=8.300001,'Car stays inside its lane perimeter');
  assert.ok(Math.abs(Math.hypot(p.dx,p.dz)-1)<1e-10,'Heading remains normalized');
  assert.ok(Math.hypot(next.x-p.x,next.z-p.z)<.00101,'No corner teleport');
  assert.ok(Math.hypot(next.dx-p.dx,next.dz-p.dz)<.002,'Heading turns continuously');
}
assert.deepEqual(roundedBlockPose(0),roundedBlockPose(perimeter));
for(let i=0;i<48;i++) for(let t=0;t<65;t+=.25){
  const a=streetVehiclePose(t,i),b=streetVehiclePose(t,i+48);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>12,'Two cars on one block retain separation');
}
const stopped=streetVehiclePose(14,0),later=streetVehiclePose(15,0);
assert.deepEqual(stopped,later,'Traffic pauses at junctions');
console.log('Street motion: lane bounds, normalized continuous headings, corner continuity, junction pauses and shared-lane separation passed.');

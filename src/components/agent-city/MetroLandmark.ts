import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Architectural community landmark, not a claim of an operational FLOP headquarters. */
export class MetroLandmark {
  readonly group = new THREE.Group();
  private logoTexture: THREE.Texture;
  constructor(_materials: unknown) {
    this.group.name = "flop-community-pavilion";
    this.group.userData.isScenery = true;
    this.group.userData.role = "Independent FLOP community landmark";
    const stone = new THREE.MeshStandardMaterial({color:0xc6c5b9,roughness:.75,metalness:.08});
    const navy = new THREE.MeshStandardMaterial({color:0x101c2e,roughness:.32,metalness:.48});
    const glass = new THREE.MeshStandardMaterial({color:0x315566,roughness:.13,metalness:.62});
    const frame = new THREE.MeshStandardMaterial({color:0x667f89,roughness:.35,metalness:.65});
    const timber = new THREE.MeshStandardMaterial({color:0x8f7153,roughness:.88});
    const green = new THREE.MeshStandardMaterial({color:0x385f48,roughness:.95});
    const cyan = new THREE.MeshBasicMaterial({color:0x39bfd4,toneMapped:false});
    const warm = new THREE.MeshBasicMaterial({color:0xe6c58f,toneMapped:false});
    const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,name="")=>{
      const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.name=name;o.castShadow=o.receiveShadow=true;this.group.add(o);return o;
    };
    const box=(w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number,name="")=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,name);
    const roundedSlab=(w:number,h:number,d:number,r:number,mat:THREE.Material,y:number)=>{
      const s=new THREE.Shape(),x=-w/2,z=-d/2;
      s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
      const geometry=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:6});geometry.rotateX(-Math.PI/2);return mesh(geometry,mat,0,y,0);
    };
    // A pedestrian-scale arrival court stays inside the reserved central parcel.
    roundedSlab(15.4,.18,11.6,.8,stone,.04);
    roundedSlab(14.4,.18,10.7,.65,stone,.22);
    roundedSlab(13.4,.18,9.8,.5,navy,.40);
    box(12.2,2.8,8.4,glass,0,1.98,0,"landmark-glazed-lobby");
    roundedSlab(13.2,.23,9.5,.5,stone,3.38);
    // Paired slender towers, a clear central atrium and a crown form one silhouette.
    for(const side of [-1,1]){
      const h=side<0?24.8:28.8;
      box(3.8,h,6.6,glass,side*3.75,3.6+h/2,0);
      box(.42,h+.7,7.1,stone,side*5.55,3.6+(h+.7)/2,0);
      box(.16,h,6.8,stone,side*1.85,3.6+h/2,0);
      for(let floor=4;floor<3.6+h;floor+=2){
        box(3.85,.10,6.7,frame,side*3.75,floor,0);
        for(const front of [-1,1])for(const col of [-1,0,1]){
          box(.055,1.8,.09,frame,side*3.75+col*1.14,floor+.92,front*3.36);
          if((Math.round(floor)+col+(side===1?1:0))%5===0) box(.8,.85,.025,warm,side*3.75+col*1.14,floor+.85,front*3.42);
        }
      }
      // Thin architectural light channels, with no animation or telemetry implication.
      box(.055,h,.055,cyan,side*5.78,3.6+h/2,3.57);
      box(.055,h,.055,cyan,side*5.78,3.6+h/2,-3.57);
      box(4.15,.25,7.1,stone,side*3.75,3.6+h+.2,0);
    }
    box(3.2,18.1,5.6,glass,0,12.7,-.25,"landmark-central-atrium");
    for(const y of [10.5,18.5]){
      box(11.3,.32,6.5,stone,0,y,0);
      box(3.2,1.2,.10,glass,0,y+.7,3.18);
    }
    // Dark, framed crown carries the original FLOP lockup at its native 2:1 aspect.
    box(12.4,6.5,7.6,navy,0,25.8,0,"landmark-logo-crown");
    box(12.9,.28,8.1,stone,0,29.18,0);
    box(12.5,.065,.065,cyan,0,29.36,4.04);
    box(12.5,.065,.065,cyan,0,29.36,-4.04);
    this.logoTexture=new THREE.TextureLoader().load('/brand/flop-lockup-on-dark.png');
    this.logoTexture.colorSpace=THREE.SRGBColorSpace;this.logoTexture.anisotropy=8;
    const logoMaterial=new THREE.MeshBasicMaterial({map:this.logoTexture,transparent:true,toneMapped:false,depthWrite:false});
    for(const side of [-1,1]){
      const logo=mesh(new THREE.PlaneGeometry(11.6,5.8),logoMaterial,0,25.8,side*3.82,'flop-landmark-logo');logo.rotation.y=side===1?0:Math.PI;
      const lateral=mesh(new THREE.PlaneGeometry(6.8,3.4),logoMaterial,side*6.22,25.8,0,'flop-landmark-logo');lateral.rotation.y=side*Math.PI/2;
    }
    // Sheltered double-door entry, canopy ribs and warm lobby clerestories.
    box(3.2,2.2,.10,navy,0,1.7,4.26);
    for(const side of [-1,1]){
      box(1.35,2.05,.04,glass,side*.73,1.68,4.33);
      box(.035,.55,.08,frame,side*.17,1.65,4.4);
      box(.10,2.7,.10,frame,side*2.25,1.98,5.55);
    }
    box(5.1,.19,2.1,navy,0,3.38,4.75,"landmark-entrance-canopy");
    for(let i=-3;i<=3;i++)box(.055,.065,1.7,warm,i*.65,3.25,4.75);
    for(let i=-5;i<=5;i++)box(.065,2.5,.08,frame,i*1.06,1.98,4.22);
    for(const x of [-6.65,6.65])for(const z of [-3.7,3.7]){
      box(1,.6,1.4,navy,x,.5,z);
      const crown=mesh(new THREE.IcosahedronGeometry(.7,2),green,x,1.25,z);crown.scale.set(.8,1.3,1);
      box(.85,.13,1.8,timber,x,.9,z+(z>0?-1.7:1.7));
    }
    // A roof terrace has a service core and understated perimeter guardrails.
    box(2.2,1.3,2.3,stone,3.8,33,0,"landmark-service-core");
    for(const side of [-1,1]){
      box(3.8,.055,.055,frame,3.75,33,side*3.2);
      box(.055,.7,.055,frame,3.75+side*1.8,32.7,3.2);
    }
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=192;
    const c=canvas.getContext('2d');
    if(c){c.fillStyle='#0A1128';c.fillRect(0,0,1536,192);c.textAlign='center';c.fillStyle='#F5F7FA';c.font='600 48px monospace';c.fillText('FLOP / COMMUNITY LANDMARK',768,82);c.fillStyle='#9FB1C4';c.font='28px monospace';c.fillText('INDEPENDENT CITY BY ASAD LEE',768,139);}
    const inscription=new THREE.CanvasTexture(canvas);inscription.colorSpace=THREE.SRGBColorSpace;
    mesh(new THREE.PlaneGeometry(4.8,.6),new THREE.MeshBasicMaterial({map:inscription,toneMapped:false}),0,2.88,5.82,'landmark-community-inscription');
    // Keep detailed architecture economical: merge opaque static meshes by material.
    const batches=new Map<THREE.Material,THREE.Mesh[]>();
    for(const o of this.group.children)if(o instanceof THREE.Mesh&&!o.name&&!Array.isArray(o.material)){
      const list=batches.get(o.material)??[];list.push(o);batches.set(o.material,list);
    }
    for(const [material,objects]of batches){
      if(objects.length<2)continue;
      const parts=objects.map(o=>{o.updateMatrix();return (o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix);});
      const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!geometry)continue;
      for(const o of objects){this.group.remove(o);o.geometry.dispose();}
      const batch=new THREE.Mesh(geometry,material);batch.name='batched-landmark-architecture';batch.castShadow=batch.receiveShadow=true;this.group.add(batch);
    }
  }
  update(_time:number) { /* Static architecture: independent of protocol activity. */ }
  dispose(){
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    this.group.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
    for(const material of materials){if('map'in material&&material.map instanceof THREE.Texture)textures.add(material.map);material.dispose();}
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
  }
}

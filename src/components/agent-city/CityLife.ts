import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Fixed civic scenery and transport, independent of observed agents or messages. */
export class CityLife {
  readonly group = new THREE.Group();
  private ferry = new THREE.Group();
  private tram = new THREE.Group();
  private rain: THREE.LineSegments;
  private puddles: THREE.InstancedMesh;
  private rainMaterial: THREE.ShaderMaterial;
  private fountain: THREE.Points;
  constructor() {
    this.group.name = "civic-life-scenery";
    this.group.userData.isScenery = true;
    const stone = new THREE.MeshStandardMaterial({ color: 0xb9c4ca, roughness: .8 });
    const navy = new THREE.MeshStandardMaterial({ color: 0x0a1128, roughness: .4, metalness: .3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x2d6074, roughness: .17, metalness: .5 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe4e8e5, roughness: .5 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8e775e, roughness: .9 });
    const warm = new THREE.MeshBasicMaterial({ color: 0xffddaa, toneMapped: false });
    const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    };
    // A compact civic square inside the reserved central parcel.
    const plaza = new THREE.Group();plaza.name = "flop-central-plaza";this.group.add(plaza);
    add(plaza,new THREE.BoxGeometry(16.6,.12,16.6),stone,0,.12,0);
    for(const side of [-1,1])for(const other of [-1,1]) {
      add(plaza,new THREE.BoxGeometry(2.3,.25,1),navy,side*6.6,.32,other*6.5);
      add(plaza,new THREE.BoxGeometry(2.3,.15,1),wood,side*6.6,.52,other*6.5);
      add(plaza,new THREE.CylinderGeometry(.5,.65,.65,10),stone,side*7,.5,other*4.4);
      add(plaza,new THREE.IcosahedronGeometry(.65,1),new THREE.MeshStandardMaterial({color:0x3f7059}),side*7,1.25,other*4.4);
      add(plaza,new THREE.CylinderGeometry(.045,.065,2.4,6),navy,side*6,1.3,other*7.5);
      add(plaza,new THREE.SphereGeometry(.16,8,6),warm,side*6,2.55,other*7.5);
    }
    add(plaza,new THREE.CylinderGeometry(1.15,1.4,.4,24),stone,0,.4,7);
    const pool=add(plaza,new THREE.CircleGeometry(1.03,24),new THREE.MeshBasicMaterial({color:0x4295ac,transparent:true,opacity:.85}),0,.62,7);pool.rotation.x=-Math.PI/2;
    const drops=[];for(let i=0;i<96;i++){const a=i/96*Math.PI*2;drops.push(Math.cos(a)*.65,.7,7+Math.sin(a)*.65);}
    const fountainGeometry=new THREE.BufferGeometry();fountainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(drops,3));
    this.fountain=new THREE.Points(fountainGeometry,new THREE.PointsMaterial({color:0xa5e5ed,size:.075,transparent:true,opacity:.8}));plaza.add(this.fountain);
    // Coastal ferry, with a low hull, glazed cabin, roof and navigation lights.
    this.ferry.name="waterfront-ferry";this.group.add(this.ferry);
    const hull=add(this.ferry,new THREE.SphereGeometry(1,16,8),navy,0,0,0);hull.scale.set(2.1,.7,5.4);
    add(this.ferry,new THREE.BoxGeometry(3.4,.45,8.6),white,0,.4,0);
    add(this.ferry,new THREE.BoxGeometry(2.8,1.8,5.5),glass,0,1.4,-.3);
    add(this.ferry,new THREE.BoxGeometry(3.4,.2,6.2),white,0,2.4,-.3);
    add(this.ferry,new THREE.CylinderGeometry(.05,.05,1.5,6),navy,0,3.1,-.5);
    for(const side of [-1,1])add(this.ferry,new THREE.SphereGeometry(.13,6,4),new THREE.MeshBasicMaterial({color:side<0?0xe46c6c:0x5bd3a4}),side*1.7,1.4,2.4);
    // The tram runs along the north waterfront, away from indexed room parcels.
    this.tram.name="waterfront-tram";this.group.add(this.tram);
    for(const z of [-.58,.58])add(this.group,new THREE.BoxGeometry(174,.025,.045),navy,0,.22,-94+z);
    for(const segment of [-1,1]) {
      add(this.tram,new THREE.BoxGeometry(4.5,1.7,1.7),white,segment*2.4,1.15,0);
      add(this.tram,new THREE.BoxGeometry(4.1,.7,1.74),glass,segment*2.4,1.4,0);
      add(this.tram,new THREE.BoxGeometry(4.6,.2,1.8),navy,segment*2.4,2.1,0);
      for(const x of [-1.4,1.4])for(const z of [-.7,.7]){const wheel=add(this.tram,new THREE.CylinderGeometry(.25,.25,.12,8),navy,segment*2.4+x,.35,z);wheel.rotation.x=Math.PI/2;}
    }
    for(const x of [-65,65]){add(this.group,new THREE.BoxGeometry(10,.3,2.7),stone,x,.28,-96.5);add(this.group,new THREE.BoxGeometry(10,.12,3),navy,x,3.3,-96.5);for(const dx of [-4.5,4.5])add(this.group,new THREE.BoxGeometry(.12,3,.12),navy,x+dx,1.8,-96.5);}
    const rainPositions=[],tips=[];let seed=9182;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1200;i++){const x=(rnd()-.5)*230,y=rnd()*90,z=(rnd()-.5)*230;rainPositions.push(x,y,z,x,y,z);tips.push(0,1);}
    const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rainPositions,3));rainGeometry.setAttribute('tip',new THREE.Float32BufferAttribute(tips,1));
    this.rainMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`attribute float tip;uniform float time;varying float height;void main(){vec3 p=position;p.y=mod(p.y-time*26.,90.)+tip*.85;p.x+=tip*.18;height=p.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying float height;void main(){gl_FragColor=vec4(.65,.78,.88,.32*smoothstep(0.,3.,height));}`});
    this.rain=new THREE.LineSegments(rainGeometry,this.rainMaterial);this.rain.name="rain-weather";this.rain.frustumCulled=false;this.rain.visible=false;this.group.add(this.rain);
    this.puddles=new THREE.InstancedMesh(new THREE.CircleGeometry(1,16),new THREE.MeshBasicMaterial({color:0x8eacbf,transparent:true,opacity:.20,depthWrite:false}),36);
    const transform=new THREE.Object3D();for(let i=0;i<36;i++){transform.position.set((i%6-2.5)*18+9,.25,(Math.floor(i/6)-2.5)*18+9);transform.rotation.x=-Math.PI/2;transform.scale.set(1.5,.45,1);transform.updateMatrix();this.puddles.setMatrixAt(i,transform.matrix);}this.puddles.visible=false;this.group.add(this.puddles);
    for (const parent of [plaza, this.ferry, this.tram, this.group]) {
      const batches = new Map<THREE.Material, THREE.Mesh[]>();
      for(const object of parent.children){if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||Array.isArray(object.material))continue;const list=batches.get(object.material)??[];list.push(object);batches.set(object.material,list);}
      for(const [material,meshes]of batches){if(meshes.length<2)continue;const parts=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});const merged=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!merged)continue;for(const mesh of meshes){parent.remove(mesh);mesh.geometry.dispose();}const combined=new THREE.Mesh(merged,material);combined.receiveShadow=true;parent.add(combined);}
    }

  }
  update(time:number,rainy:boolean){
    const angle=time*.035;
    this.ferry.position.set(Math.sin(angle)*145,-1.4+Math.sin(time*1.2)*.09,Math.cos(angle)*145);this.ferry.rotation.y=angle+Math.PI/2;
    this.tram.position.set(Math.sin(time*.07)*76,.05,-94);
    const positions=this.fountain.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){const phase=(i/positions.count+time*.45)%1;positions.setY(i,.7+Math.sin(phase*Math.PI)*1.6);}positions.needsUpdate=true;
    this.rain.visible=rainy;this.puddles.visible=rainy;this.rainMaterial.uniforms.time.value=time;
  }
  dispose(){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.LineSegments){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
}

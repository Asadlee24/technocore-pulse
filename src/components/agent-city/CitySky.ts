import * as THREE from "three";

/** Procedural outdoor scenery; no network assets or observation data. */
export class CitySky {
  readonly group = new THREE.Group();
  private atmosphere: THREE.ShaderMaterial;
  private halo: THREE.Mesh;
  private celestial: THREE.Mesh;
  private stars?: THREE.Points;
  constructor(theme: "dark" | "light") {
    const day = theme === "light";
    this.group.name = day ? "day-sky-sun-clouds" : "night-sky-moon-stars";
    this.group.userData.isScenery = true;
    this.atmosphere = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { daylight: { value: day ? 1 : 0 }, time: { value: 0 }, weather: { value: 0 } },
      vertexShader: `varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
        varying vec3 direction; uniform float daylight; uniform float time; uniform float weather;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec2(7.2,3.8);a*=.5;}return n;}
        void main(){
          vec3 d=normalize(direction);float elevation=max(d.y,0.);
          vec3 night=mix(vec3(.016,.028,.06),vec3(.002,.004,.015),pow(elevation,.45));
          vec3 day=mix(vec3(.70,.84,.94),vec3(.12,.39,.72),pow(elevation,.45));
          vec3 col=mix(night,day,daylight);
          vec2 p=d.xz/(max(d.y,.015)+.45)*3.4+vec2(time*.003,0.);
          float cloud=smoothstep(.49-weather*.16,.73-weather*.1,fbm(p));
          cloud*=smoothstep(-.04,.12,d.y)*(1.-smoothstep(.7,1.,d.y));
          col=mix(col,mix(vec3(.12,.16,.24),vec3(.98,.98,.96),daylight),cloud*mix(.18,.78,daylight));
          col=mix(col,mix(vec3(.025,.04,.065),vec3(.24,.29,.34),daylight),weather*.6);
          gl_FragColor=vec4(col,1.);
          #include <colorspace_fragment>
        }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), this.atmosphere);
    dome.name = "atmospheric-sky-dome";
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.group.add(dome);
    const direction = new THREE.Vector3(-.61, .07, -.79).normalize();
    const bodyMaterial = day
      ? new THREE.MeshBasicMaterial({ color: 0xfff5d6, toneMapped: false, fog: false })
      : new THREE.ShaderMaterial({
          uniforms: {},
          vertexShader: `varying vec3 surface;void main(){surface=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `varying vec3 surface;
            float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
            float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
              return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
            void main(){vec3 n=normalize(surface);
              float maria=noise(n*4.)*.6+noise(n*11.)*.28+noise(n*31.)*.12;
              float shade=.22+.78*max(dot(n,normalize(vec3(.6,.35,.8))),0.);
              float crater=0.;
              for(int i=0;i<24;i++){float k=float(i)+1.;vec3 center=normalize(vec3(h(vec3(k,1,3)),h(vec3(k,7,2)),h(vec3(k,4,9)))*2.-1.);
                float radius=.035+h(vec3(k,2,6))*.075;float distance=length(n-center);
                crater+=.075*exp(-pow((distance-radius)/.012,2.))-.045*(1.-smoothstep(radius*.65,radius,distance));}
              vec3 col=mix(vec3(.43,.46,.49),vec3(.84,.85,.82),smoothstep(.29,.67,maria));
              gl_FragColor=vec4((col+crater)*shade,1.);
              #include <colorspace_fragment>
            }`, depthWrite: false, fog: false,
        });
    const body = new THREE.Mesh(new THREE.SphereGeometry(day ? 19.5 : 22, 40, 28), bodyMaterial);
    body.name = day ? "sun-disc" : "textured-moon";
    this.celestial = body;
    body.position.copy(direction).multiplyScalar(1100);
    body.renderOrder = -8;
    this.group.add(body);
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(day ? 260 : 185, day ? 260 : 185), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { tint: { value: new THREE.Color(day ? 0xffe6ab : 0x9abce9) }, strength: { value: day ? .30 : .11 } },
      vertexShader: `varying vec2 uvp;void main(){uvp=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 uvp;uniform vec3 tint;uniform float strength;void main(){float r=length(uvp-.5)*2.;float a=exp(-r*r*5.)*smoothstep(1.,.25,r)*strength;gl_FragColor=vec4(tint,a);#include <colorspace_fragment>}`.replace(";#include", ";\n#include"),
    }));
    this.halo.position.copy(direction).multiplyScalar(1110);
    this.halo.renderOrder = -9;
    this.group.add(this.halo);
    if (!day) {
      const positions: number[] = [], colors: number[] = [];
      let seed = 1647;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 1600; i++) {
        const y = .025 + random() * .975, angle = random() * Math.PI * 2;
        const radius = Math.sqrt(1 - y * y);
        positions.push(Math.cos(angle) * radius * 1400, y * 1400, Math.sin(angle) * radius * 1400);
        const brightness = .3 + random() * .65;
        colors.push(brightness * .88, brightness * .93, brightness);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({
        vertexColors: true, size: 1.7, sizeAttenuation: false,
        transparent: true, opacity: .85, depthWrite: false, fog: false, toneMapped: false,
      }));
      this.stars.name = "night-star-field";
      this.stars.renderOrder = -9;
      this.group.add(this.stars);
    }
  }
  update(time: number, camera: THREE.Camera, rainy = false) {
    this.group.position.copy(camera.position);
    this.halo.quaternion.copy(camera.quaternion);
    this.atmosphere.uniforms.time.value = time;
    this.atmosphere.uniforms.weather.value = rainy ? 1 : 0;
    this.celestial.visible = !rainy;
    this.halo.visible = !rainy;
    if (this.stars) this.stars.visible = !rainy;
  }
  dispose() {
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
}

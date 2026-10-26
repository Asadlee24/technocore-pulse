import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';
const dir=mkdtempSync(resolve('node_modules/.tmp/city-life-'));
try {
 writeFileSync(`${dir}/CityLife.mjs`,ts.transpileModule(readFileSync('src/components/agent-city/CityLife.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 const {CityLife}=await import(pathToFileURL(`${dir}/CityLife.mjs`));const life=new CityLife();
 assert.equal(life.group.userData.isScenery,true);
 assert.ok(life.group.getObjectByName('flop-central-plaza'));
 life.update(0,false);const ferry=life.group.getObjectByName('waterfront-ferry'),tram=life.group.getObjectByName('waterfront-tram'),rain=life.group.getObjectByName('rain-weather');
 const ferryBefore=ferry.position.clone(),tramBefore=tram.position.clone();assert.equal(rain.visible,false);
 life.update(12,true);assert.notDeepEqual(ferry.position.toArray(),ferryBefore.toArray());assert.notDeepEqual(tram.position.toArray(),tramBefore.toArray());assert.equal(rain.visible,true);
 assert.equal(rain.geometry.attributes.position.count,2400);
 life.update(12,false);assert.equal(rain.visible,false);
 life.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(life.group);assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite));
 let disposed=0;rain.geometry.addEventListener('dispose',()=>disposed++);life.dispose();assert.equal(disposed,1);
 console.log('Civic life checks passed: plaza, moving ferry/tram, rain toggle, finite bounds and resource disposal.');
}finally{rmSync(dir,{recursive:true,force:true});}

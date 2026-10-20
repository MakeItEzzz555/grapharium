'use strict';
const assert=require('node:assert/strict'), H=require('../hierarchy.js');
const node=(id,file='src/main.swift',c=1)=>({id,label:id,file,c,loc:'L1',type:'code',role:'',klass:false,callable:true});
const link=(source,target,relation,confidence='EXTRACTED')=>({source,target,relation,confidence});
const data=(edges,nodes=[node('A'),node('B'),node('C'),node('D')])=>({n:nodes,l:edges,g:[],gl:[],directed:false,commit:'sample'});
let count=0;function test(name,fn){fn();console.log('PASS',name);count++;}
test('only verified containment nests',()=>{
 const m=H.create(data([link(0,1,'contains'),link(0,2,'calls'),link(1,3,'method','INFERRED')]));
 assert.equal(m.parents.get(1).parent,0);assert.ok(!m.parents.has(2));assert.ok(!m.parents.has(3));
});
test('nested children get proper depth',()=>{
 const m=H.create(data([link(0,1,'contains'),link(1,2,'method'),link(2,3,'contains')]));
 assert.deepEqual([0,1,2,3].map(i=>m.depth.get(i)),[0,1,2,3]);
 const x=H.layout(m,[0,1,2,3],{orbit:2,separation:3});
 assert.deepEqual(x.nodes.map(n=>n.category),['star','planet','moon','moon']);
 assert.deepEqual(x.nodes.map(n=>n.provenance),['INFERRED_FILE','EXTRACTED','EXTRACTED','EXTRACTED']);
});
test('ambiguous multiple parents are refused',()=>{
 const m=H.create(data([link(0,2,'contains'),link(1,2,'method')]));
 assert.ok(!m.parents.has(2));assert.ok(m.conflicts.some(x=>x.reason==='multiple explicit parents'));
});
test('cycles are severed',()=>{
 const m=H.create(data([link(0,1,'contains'),link(1,2,'contains'),link(2,0,'contains')]));
 assert.equal(m.parents.size,0);assert.equal(m.conflicts.filter(x=>x.reason==='containment cycle').length,3);
 assert.ok(H.layout(m,[0,1,2]).nodes.every(n=>Number.isFinite(n.x)));
});
test('cross-file edge cannot become hierarchy',()=>{
 const m=H.create(data([link(0,1,'contains')],[node('A','a.swift'),node('B','b.swift')]));
 assert.equal(m.parents.size,0);assert.ok(m.conflicts.length);
});
test('orbital placement is deterministic',()=>{
 const m=H.create(data([link(0,1,'contains'),link(0,2,'contains')]));
 const a=H.layout(m,[0,1,2,3],{orbit:1.8,separation:2.5});
 const b=H.layout(m,[0,1,2,3],{orbit:1.8,separation:2.5});
 assert.deepEqual(a.nodes.map(x=>[x.x,x.y,x.z]),b.nodes.map(x=>[x.x,x.y,x.z]));
 assert.ok(new Set(a.nodes.map(x=>x.x+','+x.y+','+x.z)).size>2);
});
test('LOD keeps selected ancestors',()=>{
 const m=H.create(data([link(0,1,'contains'),link(1,2,'contains'),link(2,3,'contains')]));
 assert.equal(H.layout(m,[0,1,2,3],{depthLimit:1}).hidden,2);
 assert.equal(H.layout(m,[0,1,2,3],{depthLimit:0,selected:3}).nodes.length,4);
});
test('search by symbol or path',()=>{
 const m=H.create(data([],[node('Alpha','Sources/A.swift'),node('Beta','Sources/Settings.swift')]));
 assert.deepEqual(m.search('settings'),[1]);assert.deepEqual(m.search('alpha'),[0]);
});
test('file grouping never claims explicit containment',()=>{
 const m=H.create(data([],[node('A','a.swift'),node('B','b.swift')]));
 const x=H.layout(m,[0,1]);assert.equal(x.systems.length,2);
 assert.ok(x.nodes.every(n=>n.provenance==='INFERRED_FILE'));
});
console.log(count+' hierarchy tests passed');

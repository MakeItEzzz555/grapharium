/* Grapharium — deterministic, GPU-instanced Three.js renderer. No external runtime requests. */
(function (root) {
  'use strict';
  function mount(element, onPick) {
    if (!root.THREE) throw new Error('Local Three.js runtime is missing');
    const T = root.THREE, scene = new T.Scene(), camera = new T.PerspectiveCamera(56, 1, 0.3, 2000000);
    scene.background = new T.Color(0x080d17);
    const renderer = new T.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','Interactive 3D architecture universe');
    renderer.domElement.setAttribute('tabindex','0');
    scene.add(new T.AmbientLight(0xffffff, 1.65));
    const light = new T.DirectionalLight(0xffffff, 1.35); light.position.set(100,220,180); scene.add(light);
    const geometries = {
      system:new T.TorusKnotGeometry(1,.28,52,7,2,3),
      star:new T.IcosahedronGeometry(1,1),
      planet:new T.DodecahedronGeometry(1,0),
      moon:new T.OctahedronGeometry(1,0),
      asteroid:new T.TetrahedronGeometry(1,0),
      event:new T.ConeGeometry(1,2.1,7),
      document:new T.BoxGeometry(1.55,1.8,.35)
    };
    const baseColors = {system:0xffcd74, star:0xffdf92, planet:0x77cae9, moon:0xb7adea,
      asteroid:0x879caf, event:0xff9c88, document:0x92dfb9};
    const nodeMat = new T.MeshLambertMaterial({color:0xffffff, emissive:0x141923, emissiveIntensity:.3});
    const edgeGeo = new T.CylinderGeometry(1,1,1,6,1,true);
    const borderGeo = new T.SphereGeometry(1,16,12);
    const edgeMat = new T.MeshBasicMaterial({color:0x91deff,transparent:true,opacity:.83,depthWrite:false});
    const auraMat = new T.MeshBasicMaterial({color:0x3b9cdb,transparent:true,opacity:.095,depthWrite:false,blending:T.AdditiveBlending});
    const firmamentMat = new T.MeshBasicMaterial({color:0x6da6d5,wireframe:true, transparent:true,opacity:.062,
      depthWrite:false,side:T.DoubleSide});
    const innerMat = new T.MeshBasicMaterial({color:0xffd09a,wireframe:true,transparent:true,opacity:.095,depthWrite:false});
    const temp = new T.Object3D(), axis = new T.Vector3(0,1,0), direction = new T.Vector3();
    const ray = new T.Raycaster(), pointer = new T.Vector2(), groups = [];
    let active = [], edgeCount = 0, firmamentCount = 0, selected = null, radius = 750;
    let yaw = .7, pitch = .4, center = new T.Vector3(), disposed = false, busy = false;
    const hover = document.createElement('div'); hover.className='floating-tooltip'; hover.hidden=true;
    element.appendChild(hover);
    function cameraUpdate() {
      pitch=Math.max(-Math.PI/2+.025,Math.min(Math.PI/2-.025,pitch));
      radius=Math.max(14,Math.min(1000000,radius));
      camera.position.set(center.x + radius*Math.sin(yaw)*Math.cos(pitch),
        center.y + radius*Math.sin(pitch),center.z + radius*Math.cos(yaw)*Math.cos(pitch));
      camera.lookAt(center);
      groups.forEach(group=>{
        if(!group.firmamentItems)return;
        group.firmamentItems.forEach((n,i)=>{
          const bound=Math.max(10,n.bound||n.radius);
          const distance=Math.hypot(camera.position.x-n.x,camera.position.y-n.y,camera.position.z-n.z);
          const visible=distance>bound*1.85;
          temp.position.set(n.x,n.y,n.z);temp.quaternion.identity();
          temp.scale.setScalar(visible?Math.min(30000,bound):.001);
          temp.updateMatrix();group.mesh.setMatrixAt(i,temp.matrix);
        });
        group.mesh.instanceMatrix.needsUpdate=true;
      });
    }
    cameraUpdate();
    function resetDynamic() {
      groups.forEach(x=>{scene.remove(x.mesh); if(x.mesh.dispose)x.mesh.dispose(); if(x.material && x.material!==nodeMat)x.material.dispose();});
      groups.length=0;active=[];edgeCount=0;firmamentCount=0;
    }
    function addNodeInstances(rows) {
      const categories = new Map();
      rows.forEach(n=>{const cat=geometries[n.category]?n.category:'asteroid';
        if(!categories.has(cat))categories.set(cat,[]);
        categories.get(cat).push(n);
      });
      categories.forEach((items, cat)=>{
        const mesh=new T.InstancedMesh(geometries[cat],nodeMat,items.length);
        mesh.name='grapharium-'+cat;mesh.frustumCulled=false;
        items.forEach((n,i)=>{
          const size=cat==='system'?Math.max(8,Math.min(95,(n.radius||9)*.88)):(n.radius||3)*1.28;
          temp.position.set(n.x,n.y,n.z);temp.rotation.set(0,0,(i%7)*.15);temp.scale.setScalar(size);
          temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);
          const c=new T.Color(baseColors[cat]);
          if(n.id===selected)c.lerp(new T.Color(0xffffff),.5);
          mesh.setColorAt(i,c);
        });
        mesh.instanceMatrix.needsUpdate=true;
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
        scene.add(mesh);groups.push({mesh,items,category:cat});
      });
    }
    function addEdges(edges, opts) {
      edgeCount=edges.length;
      if(!edges.length || opts.links===false)return;
      const base=new T.InstancedMesh(edgeGeo,edgeMat,edges.length);
      const glow=new T.InstancedMesh(edgeGeo,auraMat,edges.length);
      base.frustumCulled=false;glow.frustumCulled=false;
      const start=new T.Vector3(), end=new T.Vector3();
      const strength=Math.max(.5,Number(opts.aura)||2);
      edges.forEach((e,i)=>{
        start.set(e.a.x,e.a.y,e.a.z);end.set(e.b.x,e.b.y,e.b.z);
        direction.copy(end).sub(start);
        const distance=Math.max(.01,direction.length()), midpoint=start.clone().add(end).multiplyScalar(.5);
        temp.position.copy(midpoint);temp.quaternion.setFromUnitVectors(axis,direction.divideScalar(distance));
        let width=(e.kind==='contains'? .43 : .65)*strength;
        if(e.confidence==='INFERRED')width*=.7;
        if(e.emphasized)width*=1.85;
        temp.scale.set(width,distance,width);temp.updateMatrix();base.setMatrixAt(i,temp.matrix);
        temp.scale.set(width*5,distance,width*5);temp.updateMatrix();glow.setMatrixAt(i,temp.matrix);
        const c=new T.Color(e.kind==='contains'?0xc79cfa:e.confidence==='INFERRED'?0x7a96b3:0x65d7ff);
        if(e.emphasized)c.set(0xffda85);
        base.setColorAt(i,c);
      });
      base.instanceMatrix.needsUpdate=true;glow.instanceMatrix.needsUpdate=true;
      if(base.instanceColor)base.instanceColor.needsUpdate=true;
      scene.add(glow,base);groups.push({mesh:glow},{mesh:base});
    }
    function addFirmaments(systems, rows, opts) {
      if(!opts.firmaments)return;
      const enclosureCap=opts.quality==='low'?14:opts.quality==='high'?110:48;
      const enclosureSystems=systems.filter(x=>x.bound>5).sort((a,b)=>b.count-a.count).slice(0,enclosureCap);
      const nested=rows.filter(x=>x.children && x.children.length>0 && x.bound>x.radius*1.8)
        .sort((a,b)=>b.bound-a.bound).slice(0,Math.max(0,enclosureCap-enclosureSystems.length));
      function instances(items,mat) {
        if(!items.length)return;
        const mesh=new T.InstancedMesh(borderGeo,mat,items.length);mesh.frustumCulled=false;
        items.forEach((n,i)=>{
          temp.position.set(n.x,n.y,n.z);temp.quaternion.identity();
          temp.scale.setScalar(Math.min(30000,Math.max(10,n.bound||n.radius)));temp.updateMatrix();
          mesh.setMatrixAt(i,temp.matrix);
        });
        mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);groups.push({mesh,firmamentItems:items});
      }
      instances(enclosureSystems,firmamentMat);instances(nested,innerMat);
      firmamentCount=enclosureSystems.length+nested.length;
    }
    function draw(data, options={}) {
      resetDynamic();selected=options.selected||null;
      const rows=[...data.systems,...data.nodes];
      active=rows;
      addFirmaments(data.systems,data.nodes,options);
      addEdges(data.edges||[],options);
      addNodeInstances(rows);
      hover.hidden=true;
      if(options.fit!==false)fit(rows);else cameraUpdate();
      requestFrame();
    }
    function fit(rows) {
      if(!rows.length){center.set(0,0,0);radius=700;cameraUpdate();return;}
      const box=new T.Box3();
      rows.forEach(r=>box.expandByPoint(new T.Vector3(r.x||0,r.y||0,r.z||0)));
      box.getCenter(center);
      const size=box.getSize(new T.Vector3());
      radius=Math.max(130,Math.max(size.x,size.y,size.z)*1.48);
      cameraUpdate();
    }
    function focus(n) {
      if(!n)return;
      center.set(n.x||0,n.y||0,n.z||0);
      radius=Math.max(75,Math.min(radius,Math.max(75,(n.bound||n.radius||15)*3.5)));
      cameraUpdate();requestFrame();
    }
    function requestFrame() {
      if(busy||disposed)return;busy=true;
      root.requestAnimationFrame(()=>{busy=false;if(!disposed)renderer.render(scene,camera);});
    }
    function resize() {
      if(disposed)return;
      const w=Math.max(10,element.clientWidth),h=Math.max(10,element.clientHeight);
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestFrame();
    }
    let drag=null;
    const canvas=renderer.domElement;
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{
      drag={x:e.clientX,y:e.clientY,yaw,pitch,center:center.clone(),moved:false,pan:e.button===2 || e.shiftKey};
      canvas.setPointerCapture(e.pointerId);hover.hidden=true;
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(Math.hypot(dx,dy)>4)drag.moved=true;
      if(drag.pan){
        const speed=radius/Math.max(350,element.clientHeight);
        const right=new T.Vector3().setFromMatrixColumn(camera.matrix,0);
        const up=new T.Vector3().setFromMatrixColumn(camera.matrix,1);
        center.copy(drag.center).addScaledVector(right,-dx*speed).addScaledVector(up,dy*speed);
      }else{yaw=drag.yaw-dx*.006;pitch=drag.pitch+dy*.006;}
      cameraUpdate();requestFrame();
    });
    canvas.addEventListener('pointerup',e=>{
      const was=drag;drag=null;
      if(!was||was.moved||e.button===2)return;
      const rect=canvas.getBoundingClientRect();
      pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      ray.setFromCamera(pointer,camera);
      const hits=ray.intersectObjects(groups.filter(x=>x.items).map(x=>x.mesh),false);
      if(hits.length){
        const group=groups.find(x=>x.mesh===hits[0].object);
        const item=group&&group.items[hits[0].instanceId];
        if(item)onPick(item);
      }
    });
    canvas.addEventListener('wheel',e=>{
      e.preventDefault();radius*=Math.exp(e.deltaY*.0013);cameraUpdate();requestFrame();
    },{passive:false});
    canvas.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft')yaw+=.12;else if(e.key==='ArrowRight')yaw-=.12;
      else if(e.key==='ArrowUp')pitch+=.12;else if(e.key==='ArrowDown')pitch-=.12;
      else if(e.key==='+'||e.key==='=')radius*=.8;else if(e.key==='-')radius*=1.2;else return;
      e.preventDefault();cameraUpdate();requestFrame();
    });
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element);resize();
    return {draw,fitAll:()=>{fit(active);requestFrame();},focus,resize,render:requestFrame,
      diagnostics:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
        visibleNodes:active.length,edges:edgeCount,firmaments:firmamentCount,webgl:true}),
      dispose:()=>{disposed=true;resizeObserver.disconnect();resetDynamic();renderer.dispose();canvas.remove();hover.remove();}};
  }
  const api={mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GraphariumUniverse=api;
})(typeof globalThis!=='undefined'?globalThis:this);

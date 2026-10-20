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
    const world=new T.Group();scene.add(world);
    const timeUniform={value:0},clock=new T.Clock(),animatedGroups=[];
    let animateMotion=true,galaxyMode=false,frameHandle=0;
    const reduceMotion=root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
    scene.add(new T.AmbientLight(0xffffff, 1.65));
    const light = new T.DirectionalLight(0xffffff, 1.35); light.position.set(100,220,180); scene.add(light);
    const geometries = {
      system:new T.SphereGeometry(1,22,16),
      star:new T.SphereGeometry(1,32,22),
      planet:new T.DodecahedronGeometry(1,0),
      moon:new T.OctahedronGeometry(1,0),
      asteroid:new T.TetrahedronGeometry(1,0),
      event:new T.ConeGeometry(1,2.1,7),
      document:new T.BoxGeometry(1.55,1.8,.35)
    };
    const baseColors = {system:0x8cc1ef, star:0xffd07b, planet:0x77cae9, moon:0xb7adea,
      asteroid:0x879caf, event:0xff9c88, document:0x92dfb9};
    const nodeMat = new T.MeshLambertMaterial({color:0xffffff, emissive:0x141923, emissiveIntensity:.3});
    const sunMat=new T.MeshBasicMaterial({color:0xffffff});
    sunMat.onBeforeCompile=shader=>{
      shader.uniforms.uGraphariumTime=timeUniform;
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec3 vSunSurface;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvSunSurface=normalize(position);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\nuniform float uGraphariumTime;\nvarying vec3 vSunSurface;')
        .replace('#include <color_fragment>','#include <color_fragment>\n'+
          'float plasma=sin(vSunSurface.y*18.0+sin(vSunSurface.x*13.0+uGraphariumTime*.65)*2.0+uGraphariumTime*.38);\n'+
          'float turbulence=sin(vSunSurface.x*27.0-vSunSurface.z*21.0-uGraphariumTime*.54);\n'+
          'diffuseColor.rgb*=.94+.11*plasma+.055*turbulence;\n'+
          'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,.94,.69),.24);');
    };
    // Original procedural radial corona texture; no downloaded illustrations.
    const coronaCanvas=document.createElement('canvas');coronaCanvas.width=128;coronaCanvas.height=128;
    const ctx=coronaCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,4,64,64,64);
    gradient.addColorStop(0,'rgba(255,250,226,.94)');
    gradient.addColorStop(.16,'rgba(255,212,124,.65)');
    gradient.addColorStop(.40,'rgba(255,165,77,.23)');
    gradient.addColorStop(.73,'rgba(241,126,68,.06)');
    gradient.addColorStop(1,'rgba(241,126,68,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const coronaTexture=new T.CanvasTexture(coronaCanvas);coronaTexture.colorSpace=T.SRGBColorSpace;
    const coronaGeo=new T.PlaneGeometry(1,1),haloGeo=new T.TorusGeometry(1,.018,5,96);
    const coronaMat=new T.MeshBasicMaterial({map:coronaTexture,transparent:true,opacity:.78,
      depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
    const haloMat=new T.MeshBasicMaterial({color:0xffc987,transparent:true,opacity:.44,
      depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
    function animateLinkMaterial(mat,glow){
      mat.onBeforeCompile=shader=>{
        shader.uniforms.uGraphariumTime=timeUniform;
        shader.vertexShader=shader.vertexShader.replace('#include <common>',
          '#include <common>\nvarying float vAuraTrack;')
          .replace('#include <begin_vertex>','#include <begin_vertex>\nvAuraTrack=uv.y;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
          '#include <common>\nuniform float uGraphariumTime;\nvarying float vAuraTrack;')
          .replace('#include <color_fragment>','#include <color_fragment>\n'+
            'float traveling=.5+.5*sin(vAuraTrack*20.0-uGraphariumTime*2.1);\n'+
            'float twinkle=.5+.5*sin(uGraphariumTime*1.35+vAuraTrack*9.0);\n'+
            'diffuseColor.a*='+(glow?'.32+.57*traveling':'.72+.22*twinkle')+';\n'+
            'diffuseColor.rgb*='+(glow?'1.1+.55*traveling':'.9+.15*traveling')+';');
      };
    }
    const edgeGeo = new T.CylinderGeometry(1,1,1,6,1,true);
    const borderGeo = new T.SphereGeometry(1,16,12);
    const edgeMat = new T.MeshBasicMaterial({color:0x91deff,transparent:true,opacity:.83,depthWrite:false});
    const auraMat = new T.MeshBasicMaterial({color:0x3b9cdb,transparent:true,opacity:.17,depthWrite:false,blending:T.AdditiveBlending});
    animateLinkMaterial(edgeMat,false);animateLinkMaterial(auraMat,true);
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
      groups.forEach(x=>{
        world.remove(x.mesh);
        if(x.mesh.dispose)x.mesh.dispose();
        if(x.ownedGeometry)x.ownedGeometry.dispose();
        if(x.ownedMaterial)x.ownedMaterial.dispose();
      });
      groups.length=0;animatedGroups.length=0;active=[];edgeCount=0;firmamentCount=0;
      world.rotation.set(0,0,0);
    }
    function addNodeInstances(rows) {
      const categories = new Map();
      rows.forEach(n=>{const cat=geometries[n.category]?n.category:'asteroid';
        if(!categories.has(cat))categories.set(cat,[]);
        categories.get(cat).push(n);
      });
      categories.forEach((items, cat)=>{
        const mesh=new T.InstancedMesh(geometries[cat],cat==='star'?sunMat:nodeMat,items.length);
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
        world.add(mesh);groups.push({mesh,items,category:cat});
        if(cat==='system'||cat==='star'){
          const corona=new T.InstancedMesh(coronaGeo,coronaMat,items.length);
          const rings=new T.InstancedMesh(haloGeo,haloMat,items.length);
          corona.frustumCulled=false;rings.frustumCulled=false;
          world.add(corona,rings);groups.push({mesh:corona},{mesh:rings});
          animatedGroups.push({cat,items,mesh,corona,rings});
        }
      });
    }
    function animateCelestials(t){
      animatedGroups.forEach(group=>{
        group.items.forEach((n,i)=>{
          const base=group.cat==='system'?Math.max(8,Math.min(95,(n.radius||9)*.88)):(n.radius||3)*1.28;
          const phase=i*1.618;
          temp.position.set(n.x,n.y,n.z);
          temp.rotation.set(.12,phase*.36+t*(group.cat==='star'?.12:.06),.06);
          temp.scale.setScalar(base*(1+.012*Math.sin(t*1.2+phase)));
          temp.updateMatrix();group.mesh.setMatrixAt(i,temp.matrix);
          temp.quaternion.copy(camera.quaternion);
          const glow=base*(group.cat==='star'?5.5:3.7)*(1+.065*Math.sin(t*.9+phase));
          temp.scale.set(glow,glow,1);temp.updateMatrix();
          group.corona.setMatrixAt(i,temp.matrix);
          temp.rotation.set(Math.PI*.36+.16*Math.sin(phase+t*.12),
            phase+t*(group.cat==='star'?.23:.095),t*.19+phase);
          temp.scale.setScalar(base*(group.cat==='star'?2.15:1.75));
          temp.updateMatrix();group.rings.setMatrixAt(i,temp.matrix);
        });
        for(const mesh of [group.mesh,group.corona,group.rings])mesh.instanceMatrix.needsUpdate=true;
      });
    }
    function addGalaxyDust(nodes){
      if(!nodes.length)return;
      const count=Math.min(6500,Math.max(2800,nodes.length*34));
      const pos=new Float32Array(count*3),colors=new Float32Array(count*3);
      let seed=361492;
      const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      const extent=Math.max(1,...nodes.map(n=>Math.hypot(n.x,n.z)));
      const cold=new T.Color(0x5d88c5),warm=new T.Color(0xfacb83);
      for(let i=0;i<count;i++){
        const arm=i%4,t=Math.pow(rand(),.8),jitter=(rand()-.5)*(.15+.35*t);
        const r=extent*(.04+.92*t),theta=arm*Math.PI*.5+t*Math.PI*1.45+jitter;
        pos[3*i]=Math.cos(theta)*r+(rand()-.5)*r*.11;
        pos[3*i+1]=(rand()-.5)*extent*.12*(.23+t);
        pos[3*i+2]=Math.sin(theta)*r+(rand()-.5)*r*.11;
        const col=cold.clone().lerp(warm,Math.pow(1-t,2)*.7+rand()*.09);
        colors[3*i]=col.r;colors[3*i+1]=col.g;colors[3*i+2]=col.b;
      }
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.BufferAttribute(pos,3));
      geometry.setAttribute('color',new T.BufferAttribute(colors,3));
      const material=new T.PointsMaterial({size:Math.max(4,extent*.009),vertexColors:true,transparent:true,
        opacity:.74,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true});
      const cloud=new T.Points(geometry,material);cloud.frustumCulled=false;
      world.add(cloud);groups.push({mesh:cloud,ownedGeometry:geometry,ownedMaterial:material});
    }
    function addEdges(edges, opts) {
      edgeCount=edges.length;
      if(!edges.length || opts.links===false)return;
      const base=new T.InstancedMesh(edgeGeo,edgeMat,edges.length);
      const glow=new T.InstancedMesh(edgeGeo,auraMat,edges.length);
      base.frustumCulled=false;glow.frustumCulled=false;
      const start=new T.Vector3(), end=new T.Vector3();
      const strength=Math.max(.5,Number(opts.aura)||2);
      const connectionDegree=new Map();
      edges.forEach(e=>{for(const node of [e.a,e.b])connectionDegree.set(node.id,(connectionDegree.get(node.id)||0)+1);});
      edges.forEach((e,i)=>{
        start.set(e.a.x,e.a.y,e.a.z);end.set(e.b.x,e.b.y,e.b.z);
        direction.copy(end).sub(start);
        const distance=Math.max(.01,direction.length()), midpoint=start.clone().add(end).multiplyScalar(.5);
        temp.position.copy(midpoint);temp.quaternion.setFromUnitVectors(axis,direction.divideScalar(distance));
        const peak=Math.max(connectionDegree.get(e.a.id)||0,connectionDegree.get(e.b.id)||0);
        const attenuation=Math.min(1,Math.sqrt(14/Math.max(14,peak)));
        let width=(e.kind==='contains'? .43 : .65)*strength*(.72+.28*attenuation);
        if(e.confidence==='INFERRED')width*=.7;
        if(e.emphasized)width*=1.85;
        temp.scale.set(width,distance,width);temp.updateMatrix();base.setMatrixAt(i,temp.matrix);
        temp.scale.set(width*5,distance,width*5);temp.updateMatrix();glow.setMatrixAt(i,temp.matrix);
        const c=new T.Color(e.kind==='contains'?0xc79cfa:e.confidence==='INFERRED'?0x7a96b3:0x65d7ff);
        if(e.emphasized)c.set(0xffda85);
        base.setColorAt(i,c.clone().multiplyScalar(.45+.55*attenuation));
        glow.setColorAt(i,c.clone().multiplyScalar(.09+.91*attenuation));
      });
      base.instanceMatrix.needsUpdate=true;glow.instanceMatrix.needsUpdate=true;
      if(base.instanceColor)base.instanceColor.needsUpdate=true;
      if(glow.instanceColor)glow.instanceColor.needsUpdate=true;
      world.add(glow,base);groups.push({mesh:glow},{mesh:base});
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
        mesh.instanceMatrix.needsUpdate=true;world.add(mesh);groups.push({mesh,firmamentItems:items});
      }
      instances(enclosureSystems,firmamentMat);instances(nested,innerMat);
      firmamentCount=enclosureSystems.length+nested.length;
    }
    function draw(data, options={}) {
      resetDynamic();selected=options.selected||null;
      galaxyMode=options.galaxy===true;
      animateMotion=options.motion===undefined?!reduceMotion:!!options.motion;
      const rows=[...data.systems,...data.nodes];
      active=rows;
      addFirmaments(data.systems,data.nodes,options);
      addEdges(data.edges||[],options);
      addNodeInstances(rows);
      if(galaxyMode)addGalaxyDust(data.nodes);
      hover.hidden=true;
      animateCelestials(clock.getElapsedTime());
      updateLoopState();
      if(options.fit!==false){if(galaxyMode){pitch=.92;yaw=.45;}fit(rows);}else cameraUpdate();
      requestFrame();
    }
    function fit(rows) {
      if(!rows.length){center.set(0,0,0);radius=700;cameraUpdate();return;}
      const box=new T.Box3();
      rows.forEach(r=>box.expandByPoint(new T.Vector3(r.x||0,r.y||0,r.z||0)));
      box.getCenter(center);
      const size=box.getSize(new T.Vector3());
      radius=Math.max(130,Math.max(size.x,size.y,size.z)*(galaxyMode?1.08:1.48));
      cameraUpdate();
    }
    function focus(n) {
      if(!n)return;
      center.set(n.x||0,n.y||0,n.z||0);
      radius=Math.max(75,Math.min(radius,Math.max(75,(n.bound||n.radius||15)*3.5)));
      cameraUpdate();requestFrame();
    }
    function renderFrame(t){
      if(disposed)return;
      if(animateMotion){
        timeUniform.value=t;
        if(galaxyMode)world.rotation.y=t*.015;
      }
      // Keep corona billboards facing the camera even while motion is paused.
      animateCelestials(timeUniform.value);
      renderer.render(scene,camera);
    }
    function animationFrame(){
      frameHandle=0;
      if(disposed||!animateMotion||document.hidden)return;
      renderFrame(clock.getElapsedTime());
      frameHandle=root.requestAnimationFrame(animationFrame);
    }
    function updateLoopState(){
      if(frameHandle){root.cancelAnimationFrame(frameHandle);frameHandle=0;}
      if(animateMotion&&!document.hidden)frameHandle=root.requestAnimationFrame(animationFrame);
      else requestFrame();
    }
    function requestFrame() {
      if(busy||disposed)return;busy=true;
      root.requestAnimationFrame(()=>{busy=false;if(!disposed)renderFrame(clock.getElapsedTime());});
    }
    const visibilityChanged=()=>updateLoopState();
    document.addEventListener('visibilitychange',visibilityChanged);
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
      setMotion:enabled=>{animateMotion=!!enabled;updateLoopState();},
      diagnostics:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
        visibleNodes:active.length,edges:edgeCount,firmaments:firmamentCount,webgl:true,
        galaxy:galaxyMode,motion:animateMotion,galaxyRotation:world.rotation.y,animationTime:timeUniform.value}),
      dispose:()=>{disposed=true;if(frameHandle)root.cancelAnimationFrame(frameHandle);
        document.removeEventListener('visibilitychange',visibilityChanged);
        resizeObserver.disconnect();resetDynamic();renderer.dispose();coronaTexture.dispose();
        Object.values(geometries).forEach(g=>g.dispose());
        edgeGeo.dispose();borderGeo.dispose();haloGeo.dispose();coronaGeo.dispose();
        canvas.remove();hover.remove();}};
  }
  const api={mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GraphariumUniverse=api;
})(typeof globalThis!=='undefined'?globalThis:this);

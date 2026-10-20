/* Grapharium — accessible exploration shell and relation-aware scene integration. */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const model=GraphariumHierarchy.create(ALL);
  let universe, mode='overview', community=null, selected=null, layout=null;
  let visible=new Map(), activeEdges=[], pending=0;
  const groupNames=new Map(ALL.g.map(g=>[g.c,g]));
  const bySource=model.nodes.map((n,i)=>({n,i}));
  const opts=()=>{
    const num=id=>Number($(id).value);
    return {separation:num('planetSpread'),orbit:num('orbit'),distance:num('edgeLength'),aura:num('aura'),
      depth:num('depth'),count:num('count'),size:num('contrast'),
      quality:$('quality').value,links:$('links').checked,firmaments:$('firmaments').checked,
      inferred:$('inferred').checked,files:$('filePlanets').checked};
  };
  const limit=()=>({low:320,balanced:850,high:1700}[$('quality').value]||850);
  const label=(id,value,suffix='')=>{$(id+'Value').textContent=value+suffix;};
  function metrics(){
    $('allnodes').textContent=model.nodes.length.toLocaleString();
    $('alllinks').textContent=model.edges.length.toLocaleString();
    $('allgroups').textContent=ALL.g.length.toLocaleString();
    $('commit').textContent=ALL.commit.slice(0,12);
    $('sourceInfo').textContent='Snapshot '+ALL.commit.slice(0,10)+(ALL.directed?' · directed graph':' · globally undirected graph');
  }
  function configLabels(){
    label('planetSpread',$('planetSpread').value,'×');label('edgeLength',$('edgeLength').value,'×');
    label('contrast',$('contrast').value,'×');label('orbit',$('orbit').value,'×');
    label('aura',$('aura').value,'×');label('depth',$('depth').value);
    label('count',$('count').value);
  }
  function nodeById(id){return model.byId.has(id)?model.nodes[model.byId.get(id)]:null;}
  function relationLinksFor(indices, layoutNodes, options){
    const visibleIndex=new Map(layoutNodes.map(n=>[n.index,n]));
    const candidate = model.communityEdges.get(community)||[];
    const normal=[], direct=[];
    candidate.forEach(i=>{
      const e=model.edges[i];
      if(e.confidence==='INFERRED'&&!options.inferred)return;
      if(!visibleIndex.has(e.source)||!visibleIndex.has(e.target))return;
      const a=visibleIndex.get(e.source),b=visibleIndex.get(e.target);
      if(a.id===b.id)return;
      const item={a,b,kind:e.relation,confidence:e.confidence,
        emphasized:selected!=null&&(e.source===selected||e.target===selected)};
      if(model.parents.get(e.target)?.edge===i)direct.push(item);
      else normal.push(item);
    });
    // Keep verified containment edges even when the overall edge budget is exhausted.
    normal.sort((a,b)=>Number(b.emphasized)-Number(a.emphasized) ||
      (a.confidence==='EXTRACTED'?-1:1)-(b.confidence==='EXTRACTED'?-1:1));
    const cap=limit();
    const real=[...direct,...normal.slice(0,Math.max(0,cap-direct.length))].slice(0,cap);
    if(options.files&&options.links){
      const hubs=new Map(layout.systems.map(n=>[n.file||'',n]));
      layoutNodes.forEach(n=>{
        if(n.provenance!=='INFERRED_FILE')return;
        const hub=hubs.get(n.file);
        if(hub&&real.length<cap)real.push({a:hub,b:n,kind:'contains',confidence:'VIRTUAL_FILE'});
      });
    }
    return real;
  }
  function overview(){
    mode='overview';community=null;selected=null;
    const options=opts(), top=ALL.g.slice(0,options.count), keep=new Set(top.map(g=>g.c));
    const stars=top.map((g,i)=>{
      const r=Math.cbrt(i+1)*95*options.separation;
      const a=i*2.399963+Math.sin(i*1.4)*.22;
      return {id:'community:'+g.c,name:g.name,c:g.c,category:'system',radius:Math.max(18,Math.min(85,12+Math.sqrt(g.count)*options.size*3.6)),
        count:g.count, bound:12+Math.sqrt(g.count)*3,
        x:Math.cos(a)*r,y:Math.sin(i*1.7)*r*.48,z:Math.sin(a)*r};
    });
    const lookup=new Map(stars.map(n=>[n.c,n]));
    const links=ALL.gl.filter(e=>keep.has(e[0])&&keep.has(e[1]))
      .sort((a,b)=>b[2]-a[2]).slice(0,Math.min(limit(),options.count*4))
      .map(e=>({a:lookup.get(e[0]),b:lookup.get(e[1]),kind:'community',confidence:'AGGREGATED'}));
    layout={nodes:stars,systems:[],edges:links};
    visible=new Map(stars.map(n=>[n.id,n]));activeEdges=links;
    universe.draw(layout,{...options,selected:null,fit:true});
    $('mode').textContent='Community overview';
    $('viewhint').textContent='Click a system to inspect its code symbols. Size reflects symbol counts, not file bytes.';
    $('backBtn').disabled=true;
    $('detail').textContent='Select a community or search across the graph.';
    $('nodeTitle').textContent='Architecture inspector';
    $('neighbors').replaceChildren(); $('meta').replaceChildren();
    finishScene();
  }
  function openCommunity(c, focusIndex) {
    if(!model.communities.has(c))return;
    mode='community';community=c;
    if(focusIndex!==undefined&&focusIndex!==null)selected=focusIndex;
    else selected=null;
    drawCommunity(true);
  }
  function drawCommunity(fit) {
    const options=opts();
    const indices=model.communities.get(community)||[];
    layout=GraphariumHierarchy.layout(model,indices,{
      orbit:options.orbit,
      separation:options.separation*options.distance,
      depthLimit:options.depth,
      selected
    });
    // Scale visual hierarchy without changing relation evidence.
    layout.nodes.forEach(n=>{n.radius*=.65+options.size*.23;});
    layout.systems.forEach(n=>{n.radius*=.7+options.size*.21;});
    layout.edges=relationLinksFor(indices,layout.nodes,options);
    visible=new Map([...layout.nodes,...layout.systems].map(n=>[n.id,n]));
    activeEdges=layout.edges;
    const rendered=options.files?layout:{...layout,systems:[]};
    universe.draw(rendered,{...options,selected:selected==null?null:model.nodes[selected].id,fit});
    $('mode').textContent=groupNames.get(community)?.name||'Community '+community;
    $('viewhint').textContent=indices.length+' graph symbols · '+layout.hidden+' hidden by hierarchy depth';
    $('backBtn').disabled=false;
    if(selected!=null)inspect(selected,false);
    else {
      $('nodeTitle').textContent=$('mode').textContent;
      $('detail').textContent='Select a star, planet, moon or source-file hub to inspect verified relationships.';
      $('meta').replaceChildren();$('neighbors').replaceChildren();
    }
    finishScene();
  }
  function finishScene(){
    const diag=universe.diagnostics(), shown=(mode==='overview'?layout.nodes.length:layout.nodes.length+($('filePlanets').checked?layout.systems.length:0));
    $('shown').textContent=shown.toLocaleString();
    $('relationStats').textContent=shown.toLocaleString()+' bodies · '+activeEdges.length.toLocaleString()+' visible links';
    $('renderInfo').textContent=diag.firmaments+' firmaments · '+diag.edges+' edges · '+diag.visibleNodes+' objects';
  }
  function appendMeta(name,value) {
    const row=document.createElement('div');row.className='field';
    const strong=document.createElement('b');strong.textContent=name;row.append(strong,document.createTextNode(value==null?'—':String(value)));
    $('meta').append(row);
  }
  function inspectFile(n){
    $('nodeTitle').textContent=n.name;
    $('detail').textContent='File-level visual grouping (derived from source_file; not a verified syntax-tree parent).';
    $('meta').replaceChildren();$('neighbors').replaceChildren();
    appendMeta('Source file',n.file||'Unlocated symbols');
    appendMeta('Symbol count in file',n.count);
    appendMeta('Sizing metric','Extracted symbol count, not file bytes or lines of code');
    const ids=(model.files.get(n.file)||[]).filter(i=>model.nodes[i].c===community);
    const h=document.createElement('h2');h.textContent='Members ('+ids.length+')';$('neighbors').append(h);
    ids.slice(0,90).forEach(i=>neighborButton(model.nodes[i].label,()=>selectIndex(i),'Same source file'));
  }
  function neighborButton(text,action,meta){
    const btn=document.createElement('button');btn.className='neighbor';btn.type='button';
    const title=document.createElement('span');title.textContent=text;btn.append(title);
    const hint=document.createElement('small');hint.textContent=meta;btn.append(hint);
    btn.onclick=action;$('neighbors').append(btn);
  }
  function inspect(i,focus){
    const n=model.nodes[i];if(!n)return;
    selected=i;
    $('nodeTitle').textContent=n.label;
    $('detail').textContent='Graph symbol · '+(n.role|| (n.klass?'class':'symbol'));
    $('meta').replaceChildren();$('neighbors').replaceChildren();
    appendMeta('Source file',n.file||'—');
    appendMeta('Location',n.loc||'—');
    appendMeta('Community',groupNames.get(n.c)?.name||n.c);
    appendMeta('Hierarchy level',model.depth.get(i));
    const parent=model.parents.get(i);
    appendMeta('Verified parent',parent?model.nodes[parent.parent].label+' ('+model.edges[parent.edge].relation+', EXTRACTED)':'None in graph — file grouping is derived');
    appendMeta('Relationships',model.adjacency.get(i).length);
    const header=document.createElement('h2');header.textContent='Connected symbols';$('neighbors').append(header);
    const pairs=model.adjacency.get(i).map(eid=>{
      const e=model.edges[eid],j=e.source===i?e.target:e.source;
      return {i:j,e};
    }).sort((a,b)=>(a.e.confidence==='EXTRACTED'?0:1)-(b.e.confidence==='EXTRACTED'?0:1));
    pairs.slice(0,75).forEach(({i:j,e})=>neighborButton(model.nodes[j].label,()=>selectIndex(j),
      e.relation+' · '+e.confidence+(model.nodes[j].c!==n.c?' · outside community':'')));
    if(focus)universe.focus(visible.get(n.id));
  }
  function selectIndex(i){
    const n=model.nodes[i];
    if(community!==n.c){openCommunity(n.c,i);universe.focus(visible.get(n.id));}
    else if(!visible.has(n.id)){selected=i;drawCommunity(false);universe.focus(visible.get(n.id));}
    else {inspect(i,true);}
  }
  function choose(n){
    if(n.id.startsWith('community:'))openCommunity(n.c);
    else if(n.category==='system')inspectFile(n);
    else if(n.index!=null)selectIndex(n.index);
  }
  function search(){
    const q=$('search').value.trim();
    const target=$('searchresults');target.replaceChildren();
    if(q.length<2)return;
    const results=model.search(q,24);
    results.forEach(i=>{
      const n=model.nodes[i],button=document.createElement('button');button.className='result';button.type='button';
      const title=document.createElement('b');title.textContent=n.label;button.append(title);
      const note=document.createElement('span');note.className='type';note.textContent=n.file||('Community '+n.c);button.append(note);
      button.onclick=()=>selectIndex(i);target.append(button);
    });
    if(!results.length){const p=document.createElement('p');p.className='hint';p.textContent='No matching symbols.';target.append(p);}
  }
  function scheduleRedraw(){
    if(pending)cancelAnimationFrame(pending);
    pending=requestAnimationFrame(()=>{pending=0;configLabels();if(mode==='overview')overview();else drawCommunity(false);});
  }
  try{
    universe=GraphariumUniverse.mount($('graph'),choose);
    metrics();configLabels();
    $('overviewBtn').onclick=overview;$('backBtn').onclick=overview;
    $('fitBtn').onclick=()=>universe.fitAll();
    $('search').addEventListener('input',search);
    ['planetSpread','edgeLength','contrast','orbit','aura','depth','count','quality',
      'links','firmaments','inferred','filePlanets'].forEach(id=>$(id).addEventListener('input',scheduleRedraw));
    $('exportBtn').onclick=()=>{
      const json={sourceCommit:ALL.commit,mode,community,selected:selected==null?null:model.nodes[selected].id,
        settings:opts(),visibleBodies:universe.diagnostics().visibleNodes};
      const blob=new Blob([JSON.stringify(json,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
      a.download='grapharium-view-state.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&document.activeElement!==$('search'))overview();
      if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){
        e.preventDefault();$('search').focus();
      }
    });
    overview();
    window.GraphariumDiagnostics=()=>({...universe.diagnostics(),
      mode,community,conflicts:model.conflicts.length,matchedNodes:model.nodes.length});
  }catch(error){
    console.error('Grapharium failed to initialize',error);
    $('error').hidden=false;$('error').textContent='Unable to initialize WebGL viewer: '+error.message;
  }
})();

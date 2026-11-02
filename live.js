/* Baraat live map — reads the tracker's GPS from Firebase (REST polling) and moves the marker. */
(function(){
  var CFG = window.BARAAT_CFG || {};
  var DB = CFG.db || "", KEY = CFG.key || "";
  var HOME=[26.281493753195598,72.98599529580494], DHABA=[26.221253721138172,72.97233283694219], VENUE=[26.2224344,72.968648];
  var mapEl=document.getElementById('livemap'); if(!mapEl||!window.L) return;

  var map=L.map('livemap',{zoomControl:false,attributionControl:false,scrollWheelZoom:false,maxZoom:16,minZoom:11});
  L.control.attribution({prefix:false,position:'bottomright'}).addTo(map); window.baraatMap=map;
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
  
  function pin(img,label,side,big){var w=big?62:54,h=Math.round(w*1.15);
    var L1='<img class="pinimg" src="assets/'+img+'" width="'+w+'" height="'+h+'" alt="">',L2='<div class="pinlbl">'+label+'</div>';var html,size,anc;
    if(side==='left'){html='<div class="pinrow l">'+L2+L1+'</div>';size=[220,h];anc=[220-w/2,h];}
    else if(side==='right'){html='<div class="pinrow r">'+L1+L2+'</div>';size=[220,h];anc=[w/2,h];}
    else {html='<div class="pinwrap">'+L1+L2+'</div>';size=[160,h+24];anc=[80,h];}
    return L.divIcon({className:'',html:html,iconSize:size,iconAnchor:anc});}
  var mHome=L.marker(HOME,{icon:pin('pin-home.png','निवास','',true),zIndexOffset:500}).addTo(map);
  var mDhaba=L.marker(DHABA,{icon:pin('pin-dhaba.png','जय भवानी ढाबा','left')}).addTo(map);
  var mVenue=L.marker(VENUE,{icon:pin('pin-venue.png','होटल कस्तूरी ऑर्किड','right'),zIndexOffset:600}).addTo(map);
  function card(title,sub,ll,q){return '<div class="pcard"><b>'+title+'</b>'+(sub?'<small>'+sub+'</small>':'')+'<a href="https://www.google.com/maps/search/?api=1&query='+(q||ll[0]+','+ll[1])+'" target="_blank" rel="noopener">Google Maps में खोलें →</a></div>';}
  [[mHome,'निवास','C-11, प्रथम विस्तार, कमला नेहरू नगर',HOME,null],[mDhaba,'जय भवानी ढाबा (DPS ढाबा)','पाल रोड, DPS स्कूल के पास · बारात यहाँ पुनः एकत्र',DHABA,null],[mVenue,'होटल कस्तूरी ऑर्किड','विवाह स्थल · पाल–चौपासनी बाईपास रोड',VENUE,'Hotel+Kasturi+Orchid+Jodhpur']].forEach(function(x){
    x[0].bindPopup(card(x[1],x[2],x[3],x[4]),{closeButton:true,offset:[0,-40],className:'ppop',autoPan:true});
    x[0].on('click',function(){ follow=false; map.flyTo(x[3],Math.max(map.getZoom(),15),{duration:.6}); });
  });
  var rp=map.createPane('routePane'); rp.style.zIndex=470; rp.style.pointerEvents='none';
  var routeShadow=L.polyline([HOME,DHABA,VENUE],{pane:'routePane',color:'#2a1d05',weight:7,opacity:.55,lineCap:'round'}).addTo(map);
  var route=L.polyline([HOME,DHABA,VENUE],{pane:'routePane',color:'#FFD873',weight:4,dashArray:'7 9',opacity:1,lineCap:'round'}).addTo(map);
  var routeShown=true; function showRoute(){}
  // real road route (OSRM); falls back to the straight dotted line
  fetch('https://router.project-osrm.org/route/v1/driving/'+[HOME,DHABA,VENUE].map(function(p){return p[1]+','+p[0];}).join(';')+'?overview=full&geometries=geojson')
    .then(function(r){return r.json();}).then(function(j){ if(j&&j.routes&&j.routes[0]){ var ll=j.routes[0].geometry.coordinates.map(function(c){return [c[1],c[0]];}); route.setLatLngs(ll); routeShadow.setLatLngs(ll);} }).catch(function(){});
  var bounds=L.latLngBounds([HOME,DHABA,VENUE]).pad(0.3);
  map.fitBounds(bounds);
  var fitBtn=document.getElementById('fitall'); if(fitBtn){ fitBtn.onclick=function(){follow=false; clearTimeout(idleT); map.fitBounds(bounds); armIdle();}; }
  var baraat=L.marker(HOME,{icon:L.divIcon({className:'',html:'<div class="pinwrap live"><div class="pin">बारात</div></div>',iconSize:[60,60],iconAnchor:[30,22]}),zIndexOffset:1000});
  var trail=L.polyline([],{pane:'routePane',color:'#FFF3C4',weight:5,opacity:.95,lineCap:'round'}).addTo(map);
  var acc=L.circle(HOME,{pane:'routePane',radius:0,color:'#F2E3B3',weight:1,fillOpacity:.12});
  var follow=true, idleT=null;
  function goBaraat(){ follow=true; if(last&&last.lat){ map.setView([last.lat,last.lng],Math.max(map.getZoom(),14)); } else { map.fitBounds(bounds); } }
  function armIdle(){ clearTimeout(idleT); idleT=setTimeout(function(){ if(!navOn) goBaraat(); },8000); }
  map.on('dragstart zoomstart',function(e){ if(e.originalEvent){ follow=false; armIdle(); } });
  map.on('dragend zoomend',function(){ if(!follow) armIdle(); });
  var recenter=document.getElementById('recenter'); if(recenter) recenter.onclick=function(){ stopNav(); goBaraat(); };

  // real fireworks footage: fixed to the viewport (never scales), above tiles, below pins
  (function(){
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var saveData=navigator.connection&&navigator.connection.saveData;
    var tap=document.getElementById('skytap');
    var pane=map.createPane('skyPane'); pane.style.zIndex=450; pane.style.pointerEvents='none';
    var vid=document.createElement('video'); vid.id='sky'; vid.className='sky';
    vid.src='assets/sky.mp4?v=2'; vid.poster='assets/sky.jpg'; vid.muted=true; vid.loop=true; vid.autoplay=!(reduce||saveData); vid.preload='auto';
    vid.setAttribute('muted',''); vid.setAttribute('playsinline',''); vid.setAttribute('webkit-playsinline',''); vid.setAttribute('aria-hidden','true');
    pane.appendChild(vid);
    function fit(){var r=mapEl.getBoundingClientRect();vid.style.width=r.width+'px';vid.style.height=r.height+'px';L.DomUtil.setPosition(vid,map.containerPointToLayerPoint([0,0]));}
    map.on('move viewreset resize',fit); addEventListener('resize',fit); fit();
    map.on('zoomstart',function(){vid.style.visibility='hidden';}); map.on('zoomend',function(){fit();vid.style.visibility='visible';});
    if(reduce||saveData) return;
    function tryPlay(){ var p=vid.play(); if(p&&p.then) p.then(function(){ if(tap) tap.hidden=true; }).catch(function(){ if(tap) tap.hidden=false; }); }
    if(tap) tap.addEventListener('click',function(e){ e.stopPropagation(); tryPlay(); });
    vid.addEventListener('playing',function(){ if(tap) tap.hidden=true; });
    var kick=function(){ if(vid.paused) tryPlay(); };
    ['touchstart','touchend','click','scroll'].forEach(function(ev){ addEventListener(ev,kick,{passive:true}); });
    document.addEventListener('visibilitychange',function(){ if(document.hidden) vid.pause(); else tryPlay(); });
    tryPlay();
  })();

  // tap to go full screen, ✕ to come back
  (function(){
    var wrap=mapEl.parentNode, closeBtn=document.getElementById('mapclose'), hint=document.getElementById('maphint');
    function resized(){ map.invalidateSize(); try{dispatchEvent(new Event('resize'));}catch(e){} }
    function open(){ if(wrap.classList.contains('full')) return; wrap.classList.add('full'); document.body.classList.add('mapfull'); closeBtn.hidden=false; setTimeout(resized,50); try{history.pushState({mapfull:1},'');}catch(e){} }
    function close(){ if(!wrap.classList.contains('full')) return; wrap.classList.remove('full'); document.body.classList.remove('mapfull'); closeBtn.hidden=true; setTimeout(resized,50); }
    map.on('click',function(){ if(!wrap.classList.contains('full')) open(); });
    closeBtn.addEventListener('click',function(){ close(); try{ if(history.state&&history.state.mapfull) history.back(); }catch(e){} });
    addEventListener('popstate',function(){ close(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    setTimeout(function(){ if(hint) hint.style.opacity='0'; if(hint) hint.style.transition='opacity 1s'; },6000);
  })();

  // guest -> baraat navigation on the same screen
  var navOn=false, navWatch=null, meMarker=null, meAcc=null, navLine=null, navTimer=null, mePos=null;
  var navBtn=document.getElementById('navbtn'), navInfo=document.getElementById('navinfo'), navLink=document.getElementById('navlink');
  function target(){ return (last&&last.lat)?[last.lat,last.lng]:HOME; }
  function stopNav(){ navOn=false; if(navWatch!=null){navigator.geolocation.clearWatch(navWatch);navWatch=null;} clearInterval(navTimer); if(meMarker){map.removeLayer(meMarker);meMarker=null;} if(meAcc){map.removeLayer(meAcc);meAcc=null;} if(navLine){map.removeLayer(navLine);navLine=null;} if(navBtn){navBtn.classList.remove('on');navBtn.textContent='🧭 बारात तक पहुँचें';} if(navInfo){navInfo.textContent='';navInfo.hidden=true;} }
  function fmtKm(k){return k<1?Math.round(k*1000)+' मीटर':k.toFixed(1)+' km';}
  function drawNav(){
    if(!navOn||!mePos) return; var t=target();
    var url='https://router.project-osrm.org/route/v1/driving/'+mePos[1]+','+mePos[0]+';'+t[1]+','+t[0]+'?overview=full&geometries=geojson';
    fetch(url).then(function(r){return r.json();}).then(function(j){
      if(!navOn) return; var ok=j&&j.routes&&j.routes[0]; var ll=ok?j.routes[0].geometry.coordinates.map(function(c){return [c[1],c[0]];}):[mePos,t];
      if(!navLine){ navLine=L.polyline(ll,{pane:'routePane',color:'#8EC5FF',weight:5,opacity:.95,lineCap:'round'}).addTo(map); } else navLine.setLatLngs(ll);
      var dk=ok?j.routes[0].distance/1000:km(mePos,t), mins=ok?Math.round(j.routes[0].duration/60):Math.round(dk*3);
      if(navInfo){ navInfo.hidden=false; navInfo.textContent='आप बारात से '+fmtKm(dk)+' दूर · गाड़ी से ~'+Math.max(1,mins)+' मिनट'; }
      if(navLink){ navLink.href='https://www.google.com/maps/dir/?api=1&destination='+t[0]+','+t[1]+'&travelmode=driving'; }
      if(!drawNav.fitted){ drawNav.fitted=true; follow=false; clearTimeout(idleT); map.fitBounds(L.latLngBounds([mePos,t]).pad(0.25)); }
    }).catch(function(){});
  }
  function startNav(){
    if(!navigator.geolocation){ if(navInfo){navInfo.hidden=false;navInfo.textContent='इस phone में location उपलब्ध नहीं।';} return; }
    navOn=true; drawNav.fitted=false; if(navBtn){navBtn.classList.add('on');navBtn.textContent='✕ रास्ता बंद करें';} if(navInfo){navInfo.hidden=false;navInfo.textContent='आपकी location ली जा रही है…';}
    navWatch=navigator.geolocation.watchPosition(function(pos){
      mePos=[pos.coords.latitude,pos.coords.longitude];
      if(!meMarker){ meMarker=L.marker(mePos,{pane:'routePane',icon:L.divIcon({className:'',html:'<div class="mepin"><i></i><span>आप</span></div>',iconSize:[40,40],iconAnchor:[20,20]}),zIndexOffset:900}).addTo(map); meAcc=L.circle(mePos,{pane:'routePane',radius:Math.min(pos.coords.accuracy||0,120),color:'#8EC5FF',weight:1,fillOpacity:.12}).addTo(map); }
      else { meMarker.setLatLng(mePos); meAcc.setLatLng(mePos).setRadius(Math.min(pos.coords.accuracy||0,120)); }
      if(!drawNav.fitted) drawNav();
    },function(e){ if(navInfo){navInfo.hidden=false;navInfo.textContent=e.code===1?'Location की अनुमति नहीं मिली — browser में Allow करें।':'आपकी location नहीं मिल रही।';} },{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
    navTimer=setInterval(drawNav,30000);
  }
  if(navBtn) navBtn.addEventListener('click',function(){ navOn?stopNav():startNav(); });

  var cap=document.getElementById('mapcap'), dist=document.getElementById('mapdist'), last=null;
  function km(a,b){var R=6371,dLat=(b[0]-a[0])*Math.PI/180,dLng=(b[1]-a[1])*Math.PI/180,s=Math.sin(dLat/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(s));}
  function ago(t){var s=Math.round((Date.now()-t)/1000); if(s<15)return 'अभी'; if(s<60)return s+' सेकंड पहले'; var m=Math.round(s/60); return m<60? m+' मिनट पहले' : Math.round(m/60)+' घंटे पहले';}

  function setCap(txt,on){ if(cap){cap.textContent=txt; cap.className='mapcap'+(on?' on':'');} }
  if(!DB||!KEY){ setCap('बारात प्रस्थान पर यहाँ चलती हुई दिखेगी',false); return; }

  function poll(){
    fetch(DB+'/baraat/'+KEY+'/latest.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
      if(!d||!d.lat){ setCap('बारात प्रस्थान पर यहाँ चलती हुई दिखेगी',false); return; }
      var stale=Date.now()-d.t>3*60*1000, first=!last; last=d;
      if(!d.off) showRoute();
      if(navOn&&mePos&&!drawNav.pending){ drawNav.pending=true; setTimeout(function(){drawNav.pending=false; drawNav();},5000); }
      if(!map.hasLayer(baraat)){baraat.addTo(map); acc.addTo(map);}
      baraat.setLatLng([d.lat,d.lng]); acc.setLatLng([d.lat,d.lng]).setRadius(Math.min(d.acc||0,150));
      var toVenue=km([d.lat,d.lng],VENUE);
      if(dist) dist.textContent = toVenue<0.12 ? 'बारात विवाह स्थल पर पहुँच गई है' : 'विवाह स्थल से '+(toVenue<1? Math.round(toVenue*1000)+' मीटर' : toVenue.toFixed(1)+' km')+' दूर';
      setCap(d.off ? 'ट्रैकिंग रुकी हुई है · आख़िरी स्थिति '+ago(d.t) : (stale ? 'सिग्नल नहीं मिल रहा · आख़िरी स्थिति '+ago(d.t) : 'बारात LIVE · '+ago(d.t)), !d.off && !stale);
      if(follow){ if(first) map.setView([d.lat,d.lng],14); else map.panTo([d.lat,d.lng],{animate:true}); }
    }).catch(function(){});
  }
  function pollTrail(){
    fetch(DB+'/baraat/'+KEY+'/trail.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
      if(!d) return; var pts=Object.keys(d).sort().map(function(k){return d[k];}).filter(function(p){return p&&p.length==2;});
      trail.setLatLngs(pts);
    }).catch(function(){});
  }
  poll(); pollTrail(); setInterval(poll,10000); setInterval(pollTrail,60000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden){poll();pollTrail();} });
})();

/* Baraat live map — reads the tracker's GPS from Firebase (REST polling) and moves the marker. */
(function(){
  var CFG = window.BARAAT_CFG || {};
  var DB = CFG.db || "", KEY = CFG.key || "";
  var HOME=[26.281493753195598,72.98599529580494], DHABA=[26.221253721138172,72.97233283694219], VENUE=[26.2224344,72.968648];
  var mapEl=document.getElementById('livemap'); if(!mapEl||!window.L) return;

  var map=L.map('livemap',{zoomControl:false,attributionControl:false,scrollWheelZoom:false});
  L.control.attribution({prefix:false,position:'bottomright'}).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
  
  function pin(n,label,cls,side){var L1='<div class="pin">'+n+'</div>',L2='<div class="pinlbl">'+label+'</div>';var h,size,anc;
    var half=(cls==='dot')?12:17;
    if(side==='left'){h='<div class="pinrow l">'+L2+L1+'</div>';size=[200,40];anc=[200-half,20];}
    else if(side==='right'){h='<div class="pinrow r">'+L1+L2+'</div>';size=[200,40];anc=[half,20];}
    else {h=L1+L2;size=[150,60];anc=[75,17];}
    return L.divIcon({className:'',html:'<div class="pinwrap '+(cls||'')+'">'+h+'</div>',iconSize:size,iconAnchor:anc});}
  L.marker(HOME,{icon:pin('<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3h7M21 12v7M12 21H5M3 12V5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor"/><circle cx="16.5" cy="7.5" r="1.4" fill="currentColor"/><circle cx="7.5" cy="16.5" r="1.4" fill="currentColor"/><circle cx="16.5" cy="16.5" r="1.4" fill="currentColor"/></svg>','निवास','start'),zIndexOffset:500}).addTo(map);
  L.marker(DHABA,{icon:pin('','जय भवानी ढाबा','dot','left')}).addTo(map);
  L.marker(VENUE,{icon:pin('','होटल कस्तूरी ऑर्किड','dot','right'),zIndexOffset:600}).addTo(map);
  var route=L.polyline([HOME,DHABA,VENUE],{color:'#B8892E',weight:3,dashArray:'5 7',opacity:.8}).addTo(map);
  // real road route (OSRM); falls back to the straight dotted line
  fetch('https://router.project-osrm.org/route/v1/driving/'+[HOME,DHABA,VENUE].map(function(p){return p[1]+','+p[0];}).join(';')+'?overview=full&geometries=geojson')
    .then(function(r){return r.json();}).then(function(j){ if(j&&j.routes&&j.routes[0]) route.setLatLngs(j.routes[0].geometry.coordinates.map(function(c){return [c[1],c[0]];})); }).catch(function(){});
  map.setView(HOME,14);
  var bounds=L.latLngBounds([HOME,DHABA,VENUE]).pad(0.3);
  var fitBtn=document.getElementById('fitall'); if(fitBtn) fitBtn.onclick=function(){follow=false; map.fitBounds(bounds);};
  var baraat=L.marker(HOME,{icon:L.divIcon({className:'',html:'<div class="pinwrap live"><div class="pin">बारात</div></div>',iconSize:[60,60],iconAnchor:[30,22]}),zIndexOffset:1000});
  var trail=L.polyline([],{color:'#5B6B2F',weight:4,opacity:.85}).addTo(map);
  var acc=L.circle(HOME,{radius:0,color:'#5B6B2F',weight:1,fillOpacity:.08});
  var follow=true; map.on('dragstart zoomstart',function(e){ if(e.originalEvent) follow=false; });
  var recenter=document.getElementById('recenter'); if(recenter) recenter.onclick=function(){follow=true; if(last) map.setView([last.lat,last.lng],Math.max(map.getZoom(),15));};

  var cap=document.getElementById('mapcap'), dist=document.getElementById('mapdist'), last=null;
  function km(a,b){var R=6371,dLat=(b[0]-a[0])*Math.PI/180,dLng=(b[1]-a[1])*Math.PI/180,s=Math.sin(dLat/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(s));}
  function ago(t){var s=Math.round((Date.now()-t)/1000); if(s<15)return 'अभी'; if(s<60)return s+' सेकंड पहले'; var m=Math.round(s/60); return m<60? m+' मिनट पहले' : Math.round(m/60)+' घंटे पहले';}

  function setCap(txt,on){ if(cap){cap.textContent=txt; cap.className='mapcap'+(on?' on':'');} }
  if(!DB||!KEY){ setCap('बारात प्रस्थान पर यहाँ चलती हुई दिखेगी',false); return; }

  function poll(){
    fetch(DB+'/baraat/'+KEY+'/latest.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
      if(!d||!d.lat){ setCap('बारात प्रस्थान पर यहाँ चलती हुई दिखेगी',false); return; }
      var stale=Date.now()-d.t>3*60*1000, first=!last; last=d;
      if(!map.hasLayer(baraat)){baraat.addTo(map); acc.addTo(map);}
      baraat.setLatLng([d.lat,d.lng]); acc.setLatLng([d.lat,d.lng]).setRadius(Math.min(d.acc||0,150));
      var toVenue=km([d.lat,d.lng],VENUE);
      if(dist) dist.textContent = toVenue<0.12 ? 'बारात विवाह स्थल पर पहुँच गई है' : 'विवाह स्थल से '+(toVenue<1? Math.round(toVenue*1000)+' मीटर' : toVenue.toFixed(1)+' km')+' दूर';
      setCap(d.off ? 'ट्रैकिंग रुकी हुई है · आख़िरी स्थिति '+ago(d.t) : (stale ? 'सिग्नल नहीं मिल रहा · आख़िरी स्थिति '+ago(d.t) : 'बारात LIVE · '+ago(d.t)), !d.off && !stale);
      if(follow){ if(first) map.setView([d.lat,d.lng],15); else map.panTo([d.lat,d.lng],{animate:true}); }
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

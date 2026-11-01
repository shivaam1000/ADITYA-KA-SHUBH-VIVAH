/* Baraat live map — reads the tracker's GPS from Firebase (REST polling) and moves the marker. */
(function(){
  var CFG = window.BARAAT_CFG || {};
  var DB = CFG.db || "", KEY = CFG.key || "";
  var HOME=[26.281493753195598,72.98599529580494], DHABA=[26.221253721138172,72.97233283694219], VENUE=[26.2224344,72.968648];
  var mapEl=document.getElementById('livemap'); if(!mapEl||!window.L) return;

  var map=L.map('livemap',{zoomControl:false,attributionControl:false,scrollWheelZoom:false});
  L.control.attribution({prefix:false,position:'bottomright'}).addTo(map); window.baraatMap=map;
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
  
  function pin(img,label,side,big){var w=big?62:54,h=Math.round(w*1.15);
    var L1='<img class="pinimg" src="assets/'+img+'" width="'+w+'" height="'+h+'" alt="">',L2='<div class="pinlbl">'+label+'</div>';var html,size,anc;
    if(side==='left'){html='<div class="pinrow l">'+L2+L1+'</div>';size=[220,h];anc=[220-w/2,h];}
    else if(side==='right'){html='<div class="pinrow r">'+L1+L2+'</div>';size=[220,h];anc=[w/2,h];}
    else {html='<div class="pinwrap">'+L1+L2+'</div>';size=[160,h+24];anc=[80,h];}
    return L.divIcon({className:'',html:html,iconSize:size,iconAnchor:anc});}
  L.marker(HOME,{icon:pin('pin-home.png','निवास','',true),zIndexOffset:500}).addTo(map);
  L.marker(DHABA,{icon:pin('pin-dhaba.png','जय भवानी ढाबा','left')}).addTo(map);
  L.marker(VENUE,{icon:pin('pin-venue.png','होटल कस्तूरी ऑर्किड','right'),zIndexOffset:600}).addTo(map);
  var route=L.polyline([HOME,DHABA,VENUE],{color:'#E7C46A',weight:3,dashArray:'5 7',opacity:.9}).addTo(map);
  // real road route (OSRM); falls back to the straight dotted line
  fetch('https://router.project-osrm.org/route/v1/driving/'+[HOME,DHABA,VENUE].map(function(p){return p[1]+','+p[0];}).join(';')+'?overview=full&geometries=geojson')
    .then(function(r){return r.json();}).then(function(j){ if(j&&j.routes&&j.routes[0]) route.setLatLngs(j.routes[0].geometry.coordinates.map(function(c){return [c[1],c[0]];})); }).catch(function(){});
  map.setView(HOME,14);
  var bounds=L.latLngBounds([HOME,DHABA,VENUE]).pad(0.3);
  var fitBtn=document.getElementById('fitall'); if(fitBtn) fitBtn.onclick=function(){follow=false; map.fitBounds(bounds);};
  var baraat=L.marker(HOME,{icon:L.divIcon({className:'',html:'<div class="pinwrap live"><div class="pin">बारात</div></div>',iconSize:[60,60],iconAnchor:[30,22]}),zIndexOffset:1000});
  var trail=L.polyline([],{color:'#F2E3B3',weight:4,opacity:.9}).addTo(map);
  var acc=L.circle(HOME,{radius:0,color:'#F2E3B3',weight:1,fillOpacity:.1});
  var follow=true; map.on('dragstart zoomstart',function(e){ if(e.originalEvent) follow=false; });
  var recenter=document.getElementById('recenter'); if(recenter) recenter.onclick=function(){follow=true; if(last) map.setView([last.lat,last.lng],Math.max(map.getZoom(),15));};

  // fireworks overlay
  (function(){
    var cv=document.getElementById('fw'); if(!cv) return;
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx=cv.getContext('2d'),W,H,parts=[],rockets=[],last=0,nextLaunch=0;
    var COL=['#F6D56A','#E8B23A','#F2A0A0','#FFF3C4','#D94C4C','#F9E8C8'];
    function size(){var r=mapEl.getBoundingClientRect();W=cv.width=Math.round(r.width*devicePixelRatio);H=cv.height=Math.round(r.height*devicePixelRatio);}
    size(); addEventListener('resize',size);
    function launch(){rockets.push({x:(0.15+Math.random()*0.7)*W,y:H,vy:-(H*0.012+Math.random()*H*0.006),col:COL[Math.random()*COL.length|0],ty:(0.08+Math.random()*0.3)*H});}
    function burst(x,y,col){var n=70+Math.random()*40|0,col2=COL[Math.random()*COL.length|0];
      for(var i=0;i<n;i++){var a=Math.PI*2*i/n+Math.random()*.15,sp=(1.8+Math.random()*3.4)*devicePixelRatio;parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,d:0.009+Math.random()*0.008,col:i%3?col:col2,r:(1.4+Math.random()*1.2)*devicePixelRatio,tw:Math.random()<.3});}
      parts.push({x:x,y:y,vx:0,vy:0,life:1,d:0.06,col:'#FFF8E0',r:9*devicePixelRatio,flash:true});}
    var LC=['#FFD24A','#FF6B6B','#7FE0A0','#FFF3C4','#FFA23A','#6FC3FF'];
    function drawLights(t){
      var dpr=devicePixelRatio, rows=[{y:4*dpr,sag:22*dpr,n:14,ph:0},{y:H-6*dpr,sag:-18*dpr,n:12,ph:2}];
      ctx.globalCompositeOperation='source-over';
      rows.forEach(function(rw,ri){
        var n=rw.n, seg=W/n;
        for(var k=0;k<n;k++){
          var x0=k*seg,x1=(k+1)*seg,mx=(x0+x1)/2,cy=rw.y+rw.sag; // wire scallop
          ctx.strokeStyle='rgba(230,200,120,.55)';ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.moveTo(x0,rw.y);ctx.quadraticCurveTo(mx,cy+rw.sag*0.6,x1,rw.y);ctx.stroke();
          // bulbs along curve
          for(var b=1;b<=3;b++){var u=b/4, bx=(1-u)*(1-u)*x0+2*(1-u)*u*mx+u*u*x1, by=(1-u)*(1-u)*rw.y+2*(1-u)*u*(cy+rw.sag*0.6)+u*u*rw.y;
            var idx=(k*3+b+ri*7)%LC.length, tw=0.55+0.45*Math.sin(t/260+idx*1.7+k*0.9+rw.ph), r=2.4*dpr;
            ctx.fillStyle=LC[idx];ctx.globalAlpha=tw;ctx.shadowColor=LC[idx];ctx.shadowBlur=10*dpr*tw;ctx.beginPath();ctx.arc(bx,by+(rw.sag>0?3:-3)*dpr,r,0,7);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;}
        }
      });
    }
    function frame(t){
      if(document.hidden){requestAnimationFrame(frame);return;}
      var dt=Math.min(40,t-last)/16.7; last=t;
      ctx.clearRect(0,0,W,H);
      drawLights(t);
      ctx.globalCompositeOperation='lighter';
      if(t>nextLaunch){launch(); if(Math.random()<.6) launch(); if(Math.random()<.3) launch(); nextLaunch=t+1100+Math.random()*1500;}
      for(var i=rockets.length-1;i>=0;i--){var r=rockets[i];r.y+=r.vy*dt;r.vy+=0.06*devicePixelRatio*dt;ctx.fillStyle='#FFF3C4';ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(r.x,r.y,1.8*devicePixelRatio,0,7);ctx.fill();
        ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(r.x,r.y-r.vy*2,1.2*devicePixelRatio,0,7);ctx.fill();
        if(r.y<=r.ty||r.vy>=0){burst(r.x,r.y,r.col);rockets.splice(i,1);}}
      for(var j=parts.length-1;j>=0;j--){var q=parts[j];
        if(q.flash){q.life-=q.d*dt;if(q.life<=0){parts.splice(j,1);continue;}ctx.globalAlpha=q.life*.35;ctx.fillStyle=q.col;ctx.shadowColor=q.col;ctx.shadowBlur=18*devicePixelRatio;ctx.beginPath();ctx.arc(q.x,q.y,q.r*(1.2-q.life*.6),0,7);ctx.fill();ctx.shadowBlur=0;continue;}
        q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=0.035*devicePixelRatio*dt;q.vx*=0.98;q.vy*=0.98;q.life-=q.d*dt;if(q.life<=0){parts.splice(j,1);continue;}
        var al=q.life*(q.tw?(0.5+0.5*Math.sin(t/40+j)):1);ctx.globalAlpha=Math.max(0,al*.9);ctx.fillStyle=q.col;ctx.shadowColor=q.col;ctx.shadowBlur=4*devicePixelRatio;ctx.beginPath();ctx.arc(q.x,q.y,q.r*(0.5+q.life*0.7),0,7);ctx.fill();ctx.shadowBlur=0;}
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

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

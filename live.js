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

  // fireworks + string lights overlay
  (function(){
    var cv=document.getElementById('fw'); if(!cv) return;
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // put the canvas inside the map, below the marker pane, and keep it pinned to the viewport
    var pane=map.createPane('fwPane'); pane.style.zIndex=450; pane.style.pointerEvents='none'; pane.appendChild(cv);
    cv.style.position='absolute'; cv.style.left='0'; cv.style.top='0'; cv.style.mixBlendMode='screen';
    function pin2view(){var p=map.containerPointToLayerPoint([0,0]); L.DomUtil.setPosition(cv,p);}
    map.on('move zoom viewreset',pin2view); pin2view();
    map.on('zoomstart',function(){cv.style.opacity='0';}); map.on('zoomend',function(){pin2view();cv.style.opacity='1';});
    var ctx=cv.getContext('2d'),W,H,dpr=Math.min(2,devicePixelRatio||1),parts=[],rockets=[],smoke=[],stars=[],last=0,nextLaunch=400,R=Math.random;
    function size(){var r=mapEl.getBoundingClientRect();W=cv.width=Math.round(r.width*dpr);H=cv.height=Math.round(r.height*dpr);cv.style.width=r.width+'px';cv.style.height=r.height+'px';}
    size(); addEventListener('resize',size);
    for(var si=0;si<70;si++) stars.push({x:R(),y:R()*0.85,r:(0.4+R()*0.9),ph:R()*6});
    // palettes: [core, mid, tail]
    var PAL=[['#FFFDF2','#FFD873','#E0A020'],['#FFFBE8','#FFE9A8','#D9A441'],['#FFFFFF','#FFF2C8','#C8A24A'],['#FFFEF5','#F3E2B0','#B89040'],['#FFFFFF','#E9ECF2','#A9B0BC'],['#FFF8EC','#FFC46B','#C97A18']];
    function hex2rgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
    PAL=PAL.map(function(p){return p.map(hex2rgb);});
    function mix(a,b,t){return 'rgb('+Math.round(a[0]+(b[0]-a[0])*t)+','+Math.round(a[1]+(b[1]-a[1])*t)+','+Math.round(a[2]+(b[2]-a[2])*t)+')';}
    function launch(){
      var kind=R(); var type=kind<.45?'peony':kind<.8?'willow':kind<.93?'crackle':'ring';
      rockets.push({x:(0.12+R()*0.76)*W,y:H+4*dpr,vx:(R()-.5)*0.6*dpr,vy:-(H*0.0165+R()*H*0.006),ty:(0.08+R()*0.4)*H,pal:PAL[R()*PAL.length|0],type:type,age:0});
    }
    function burst(r){
      var pal=r.pal,n,i,a,sp,base;
      if(r.type==='willow'){n=220;for(i=0;i<n;i++){a=R()*Math.PI*2;sp=(1+R()*3.4)*dpr;parts.push({x:r.x,y:r.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-0.3*dpr,life:1,d:0.003+R()*0.002,drag:0.977,g:0.042,pal:pal,r:1.2*dpr,trail:1,tw:R()<.2?1:0});}}
      else if(r.type==='ring'){n=90;base=R()*Math.PI;var tilt=0.35+R()*0.4;for(i=0;i<n;i++){a=Math.PI*2*i/n;sp=3.2*dpr;parts.push({x:r.x,y:r.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*tilt,life:1,d:0.009+R()*0.004,drag:0.965,g:0.03,pal:pal,r:1.4*dpr,trail:1,tw:0});}}
      else {n=r.type==='crackle'?220:190;for(i=0;i<n;i++){a=R()*Math.PI*2;var u=R();sp=(0.8+Math.sqrt(u)*4.6)*dpr;parts.push({x:r.x,y:r.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,d:(r.type==='crackle'?0.006:0.0075)+R()*0.005,drag:0.962,g:0.035,pal:pal,r:(1.2+R()*0.9)*dpr,trail:1,tw:r.type==='crackle'?1:(R()<.3?1:0)});}}
      // flash
      parts.push({x:r.x,y:r.y,flash:1,life:1,d:0.08,r:(r.type==='willow'?26:22)*dpr,pal:pal});
      smoke.push({x:r.x,y:r.y,r:18*dpr,life:1});
      // a few hot white sparks that drop fast
      for(i=0;i<12;i++){a=R()*Math.PI*2;sp=(0.5+R()*1.2)*dpr;parts.push({x:r.x,y:r.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,d:0.02,drag:0.99,g:0.06,pal:PAL[0],r:1.6*dpr,trail:0,tw:0});}
    }
    var LC=[[255,214,74],[255,96,96],[120,230,160],[255,243,196],[255,160,60],[120,190,255]];
    function lights(t){
      var rows=[{y:3*dpr,sag:20*dpr,n:13,ph:0},{y:H-4*dpr,sag:-16*dpr,n:11,ph:2}];
      ctx.lineWidth=1*dpr;
      rows.forEach(function(rw,ri){var seg=W/rw.n;
        for(var k=0;k<rw.n;k++){var x0=k*seg,x1=x0+seg,mx=(x0+x1)/2,cpy=rw.y+rw.sag*1.6;
          ctx.strokeStyle='rgba(60,50,30,.9)';ctx.beginPath();ctx.moveTo(x0,rw.y);ctx.quadraticCurveTo(mx,cpy,x1,rw.y);ctx.stroke();
          for(var b2=1;b2<=3;b2++){var u=b2/4,bx=(1-u)*(1-u)*x0+2*(1-u)*u*mx+u*u*x1,by=(1-u)*(1-u)*rw.y+2*(1-u)*u*cpy+u*u*rw.y;
            var c=LC[(k*3+b2+ri*2)%LC.length],tw=0.65+0.35*Math.sin(t/230+k*1.3+b2*2.1+rw.ph);
            // socket
            ctx.fillStyle='rgba(40,34,24,.95)';ctx.fillRect(bx-1.4*dpr,by-(rw.sag>0?0:3*dpr),2.8*dpr,3*dpr);
            var yy=by+(rw.sag>0?5:-5)*dpr,rad=2.6*dpr;
            var g=ctx.createRadialGradient(bx,yy,0,bx,yy,rad*4.5);g.addColorStop(0,'rgba('+c+','+(0.55*tw)+')');g.addColorStop(1,'rgba('+c+',0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,yy,rad*4.5,0,7);ctx.fill();
            ctx.fillStyle='rgba('+c+','+tw+')';ctx.beginPath();ctx.ellipse(bx,yy,rad*0.8,rad,0,0,7);ctx.fill();
            ctx.fillStyle='rgba(255,255,255,'+(0.8*tw)+')';ctx.beginPath();ctx.arc(bx-rad*0.25,yy-rad*0.3,rad*0.35,0,7);ctx.fill();}
        }});
    }
    function frame(t){
      if(document.hidden){last=t;requestAnimationFrame(frame);return;}
      var dt=Math.min(3,(t-last)/16.7||1); last=t;
      // fade previous frame -> trails
      ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,'+(0.16*dt)+')';ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation='source-over';
      // lights are redrawn crisp: clear their bands first
      ctx.clearRect(0,0,W,46*dpr);ctx.clearRect(0,H-40*dpr,W,40*dpr);
      // stars
      for(var st=0;st<stars.length;st++){var sx=stars[st];ctx.globalAlpha=0.35+0.4*Math.abs(Math.sin(t/900+sx.ph));ctx.fillStyle='#FFF6DC';ctx.beginPath();ctx.arc(sx.x*W,sx.y*H,sx.r*dpr,0,7);ctx.fill();}
      // smoke
      for(var sm=smoke.length-1;sm>=0;sm--){var sk=smoke[sm];sk.r+=0.35*dpr*dt;sk.y-=0.12*dpr*dt;sk.life-=0.0035*dt;if(sk.life<=0){smoke.splice(sm,1);continue;}var sg=ctx.createRadialGradient(sk.x,sk.y,0,sk.x,sk.y,sk.r);sg.addColorStop(0,'rgba(200,190,170,'+(0.045*sk.life)+')');sg.addColorStop(1,'rgba(200,190,170,0)');ctx.globalAlpha=1;ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sk.x,sk.y,sk.r,0,7);ctx.fill();}
      lights(t);
      ctx.globalCompositeOperation='lighter';
      if(t>nextLaunch){launch(); if(R()<.7) launch(); if(R()<.4) launch(); nextLaunch=t+550+R()*900;}
      var i,r,q;
      for(i=rockets.length-1;i>=0;i--){r=rockets[i];r.age+=dt;
        var ox=r.x,oy=r.y;r.x+=r.vx*dt;r.y+=r.vy*dt;r.vy+=0.07*dpr*dt;r.vx+=(R()-.5)*0.08*dpr;
        // tail
        ctx.strokeStyle=mix(r.pal[0],r.pal[1],.3);ctx.lineWidth=1.6*dpr;ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(r.x,r.y);ctx.stroke();
        for(var k=0;k<2;k++){parts.push({x:r.x+(R()-.5)*2*dpr,y:r.y+R()*4*dpr,vx:(R()-.5)*0.5*dpr,vy:0.6*dpr+R()*0.6*dpr,life:0.7,d:0.06,drag:0.95,g:0.02,pal:r.pal,r:0.9*dpr,trail:0,tw:0});}
        if(r.y<=r.ty||r.vy>=-0.5*dpr){burst(r);rockets.splice(i,1);}}
      for(i=parts.length-1;i>=0;i--){q=parts[i];
        if(q.flash){q.life-=q.d*dt;if(q.life<=0){parts.splice(i,1);continue;}var fg=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r);fg.addColorStop(0,'rgba(255,255,255,'+(0.55*q.life)+')');fg.addColorStop(0.4,mix(q.pal[0],q.pal[1],.5).replace('rgb','rgba').replace(')',','+(0.5*q.life)+')'));fg.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=1;ctx.fillStyle=fg;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill();continue;}
        var px=q.x,py=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=q.g*dpr*dt;q.vx*=Math.pow(q.drag,dt);q.vy*=Math.pow(q.drag,dt);q.life-=q.d*dt;
        if(q.life<=0||q.y>H+10){parts.splice(i,1);continue;}
        var heat=q.life; var col=heat>0.7?mix(q.pal[0],q.pal[1],(1-heat)/0.3):mix(q.pal[1],q.pal[2],1-heat/0.7);
        var al=q.life; if(q.tw){al*=0.35+0.65*Math.abs(Math.sin(t/35+i*1.7));}
        ctx.globalAlpha=Math.min(1,al);
        if(q.trail){ctx.strokeStyle=col;ctx.lineWidth=q.r*1.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(q.x,q.y);ctx.stroke();}
        else{ctx.fillStyle=col;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill();}
      }
      if(parts.length>3800) parts.splice(0,parts.length-3800);
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
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

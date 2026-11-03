(function(){
  var EV = window.EV || [];
  var envScreen = document.getElementById('envScreen'), env = document.getElementById('env'), page = document.getElementById('page');
  document.body.classList.add('locked'); page.setAttribute('aria-hidden', 'true');
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function tick(){
    var now = Date.now(), nx = null;
    for (var i = 0; i < EV.length; i++) if (EV[i].t > now) { nx = EV[i]; break; }
    if (!nx) { document.getElementById('cd').style.display = 'none'; return; }
    var s = Math.floor((nx.t - now) / 1000);
    document.getElementById('dd').textContent = pad(Math.floor(s / 86400));
    document.getElementById('hh').textContent = pad(Math.floor(s % 86400 / 3600));
    document.getElementById('mm').textContent = pad(Math.floor(s % 3600 / 60));
    document.getElementById('ss').textContent = pad(s % 60);
    document.getElementById('cdCap').textContent = nx.lab + ' में शेष';
    document.getElementById('cdWhen').textContent = nx.when;
  }
  tick(); setInterval(tick, 1000);
  function reveal(){
    var els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window)) { for (var i = 0; i < els.length; i++) els[i].classList.add('in'); return; }
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
    for (var k = 0; k < els.length; k++) io.observe(els[k]);
  }
  reveal();
  function petals(){
    var box = document.getElementById('petals'), C = ['#B8892E','#E9C46A','#C8102E','#E07A1F','#F3D98B'];
    for (var i = 0; i < 34; i++) { var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + 'vw'; p.style.background = C[i % C.length];
      p.style.setProperty('--dx', ((Math.random() - .5) * 120) + 'px'); p.style.setProperty('--r', (360 + Math.random() * 540) + 'deg');
      p.style.animationDuration = (3.2 + Math.random() * 2.6) + 's'; p.style.animationDelay = (Math.random() * 1.6) + 's'; box.appendChild(p); }
    setTimeout(function(){ box.innerHTML = ''; }, 7500);
  }
  var opened = false;
  function openInvite(ev){
    if (ev && ev.preventDefault) ev.preventDefault();
    if (opened) return; opened = true;
    env.classList.add('open'); envScreen.classList.add('opening');
    setTimeout(function(){ env.classList.add('open2'); }, 650);
    setTimeout(function(){
      envScreen.classList.add('gone'); document.body.classList.remove('locked'); page.removeAttribute('aria-hidden');
      window.scrollTo(0, 0); petals();
    }, 2100);
  }
  document.getElementById('openBtn').addEventListener('click', openInvite);
  env.addEventListener('click', openInvite);
  window.__open = openInvite;
})();

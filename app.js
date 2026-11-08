/* islands all the way down - a guided tour of recursive geography.
   Stateless: nothing saved, nothing tracked. */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 17
  });
  L.control.attribution({ position: 'topleft' }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Imagery &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 17
  }).addTo(map);

  // ---- tour data: each step is one level deeper. Chains follow Wikipedia's
  // "Recursive islands and lakes" list; Taal is explicitly time-framed. ----
  var STEPS = [
    { chapter: 'Prologue', level: '', center: [18, 8], zoom: 2,
      text: 'Some islands have lakes. Some of those lakes have islands. This tour keeps going until it runs out of down.' },

    { chapter: '1 · Philippines', level: 'level 0', center: [13.6, 121.6], zoom: 7,
      text: 'Luzon, a big island in the Philippines.' },
    { chapter: '1 · Philippines', level: 'level 1', center: [13.95, 121.05], zoom: 11,
      text: 'Inside Luzon: Taal Lake.' },
    { chapter: '1 · Philippines', level: 'level 2', center: [14.01, 120.998], zoom: 13,
      text: 'Inside the lake: Volcano Island. Yes, the lake has a volcano.' },
    { chapter: '1 · Philippines', level: 'level 3', center: [14.0100, 120.9975], zoom: 15,
      text: 'Inside the volcano: a crater that held a lake, with a rocky islet in it - Vulcan Point. An island in a lake on an island in a lake on an island.' },
    { chapter: '1 · Philippines', level: 'time check', center: [14.0100, 120.9975], zoom: 16,
      text: 'Then, in January 2020, the volcano erupted and the crater lake boiled away. The photos that made Vulcan Point famous are older than this shoreline. Geography is not permanent.' },

    { chapter: '2 · Canada', level: 'the far north', center: [68, -105], zoom: 4,
      text: 'Far north: Victoria Island, an Arctic island bigger than Great Britain.' },
    { chapter: '2 · Canada', level: 'unnamed', center: [69.75, -108.3], zoom: 10,
      text: 'On it, a lake nobody named. In the lake, an island nobody named. In that island...' },
    { chapter: '2 · Canada', level: 'level 3', center: [69.79222, -108.24056], zoom: 16,
      text: '...one more lake, holding this: the largest third-order island anyone has catalogued. It has no official name. People online call it Inception Island.' },

    { chapter: '3 · Indonesia', level: 'level 0', center: [0.5, 100.5], zoom: 7,
      text: 'Sumatra, Indonesia.' },
    { chapter: '3 · Indonesia', level: 'level 1', center: [2.6, 98.8], zoom: 10,
      text: 'Lake Toba: the flooded caldera of a supervolcano.' },
    { chapter: '3 · Indonesia', level: 'level 2', center: [2.60, 98.85], zoom: 12,
      text: 'In it: Samosir, an island nearly the size of Singapore - the biggest island-in-a-lake-on-an-island, with an asterisk: a canal finished the job.' },
    { chapter: '3 · Indonesia', level: 'level 3', center: [2.56444, 98.88333], zoom: 16,
      text: 'And on Samosir, ponds. This one holds two small islets. Down one more level.' },

    { chapter: '4 · USA', level: 'level 1', center: [47.4, -87.5], zoom: 7,
      text: 'Lake Superior: the largest freshwater lake on Earth by surface area.' },
    { chapter: '4 · USA', level: 'level 2', center: [48.0, -88.9], zoom: 10,
      text: 'In it: Isle Royale, a wilderness island with no roads and no permanent residents - just wolves and moose.' },
    { chapter: '4 · USA', level: 'level 3', center: [48.03, -88.76], zoom: 13,
      text: 'On Isle Royale: Siskiwit Lake.' },
    { chapter: '4 · USA', level: 'level 4', center: [48.01000, -88.77083], zoom: 16,
      text: 'In Siskiwit Lake: Ryan Island. An island in a lake, on an island, in a lake.' },
    { chapter: '4 · USA', level: 'the hoax', center: [48.01000, -88.77083], zoom: 15,
      text: 'A beloved book claimed one more level here - a boulder making it five deep. A mother and son paddled out in 2019 to check. It was not there. Wonderful stories still need checking.' },

    { chapter: '5 · Canada', level: 'the deepest', center: [63, -98], zoom: 5,
      text: 'Back to the Canadian north, for the deepest nesting catalogued so far.' },
    { chapter: '5 · Canada', level: 'lake yathkyed', center: [62.75, -97.9], zoom: 10,
      text: 'Lake Yathkyed, Nunavut. Inside it: an island.' },
    { chapter: '5 · Canada', level: 'five down', center: [62.65139, -97.78750], zoom: 15,
      text: 'On that island: a lake. In that lake: an island. In that island: another small lake...' },
    { chapter: '5 · Canada', level: 'level 5', center: [62.65139, -97.78750], zoom: 16,
      text: '...holding an islet. Five levels of down - the deepest known island-in-a-lake chain on Earth, spotted on satellite imagery.' },

    { chapter: 'Epilogue', level: '', center: [25, -30], zoom: 2,
      text: 'Geography is stranger than it needs to be. The map is yours now - wander.' }
  ];

  // ---- state ----
  var idx = -1;            // -1 = intro
  var exploring = false;   // user took the wheel
  var flying = false;

  var introEl = document.getElementById('intro');
  var capEl = document.getElementById('caption');
  var capChapter = document.getElementById('capChapter');
  var capLevel = document.getElementById('capLevel');
  var capText = document.getElementById('capText');
  var dotsEl = document.getElementById('dots');
  var nextBtn = document.getElementById('nextBtn');
  var backBtn = document.getElementById('backBtn');
  var resumeBtn = document.getElementById('resumeBtn');
  var beginBtn = document.getElementById('beginBtn');

  var compactDots = window.matchMedia && window.matchMedia('(max-width: 520px)').matches;
  if (compactDots) dotsEl.classList.add('fraction');
  for (var d = 0; d < STEPS.length; d++) {
    var dot = document.createElement('i');
    dotsEl.appendChild(dot);
  }
  var dots = dotsEl.children;

  function fly(center, zoom, done) {
    flying = true;
    if (reducedMotion) {
      map.setView(center, zoom, { animate: false });
      flying = false;
      if (done) done();
      return;
    }
    whoosh();
    map.once('moveend', function () { flying = false; if (done) done(); });
    map.flyTo(center, zoom, { duration: 1.7 });
  }

  function render() {
    if (idx < 0) return;
    var s = STEPS[idx];
    capChapter.textContent = s.chapter;
    capLevel.textContent = s.level;
    capText.textContent = s.text;
    if (compactDots) { dotsEl.textContent = (idx + 1) + ' / ' + STEPS.length; }
    else { for (var i = 0; i < dots.length; i++) dots[i].className = i === idx ? 'on' : ''; }
    backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
    nextBtn.innerHTML = idx === STEPS.length - 1 ? 'Explore freely' : 'Next &darr;';
  }

  function go(n) {
    idx = Math.max(0, Math.min(STEPS.length - 1, n));
    exploring = false;
    resumeBtn.classList.add('hidden');
    capEl.classList.remove('hidden');
    render();
    fly(STEPS[idx].center, STEPS[idx].zoom);
  }

  beginBtn.addEventListener('click', function () {
    introEl.classList.add('hidden');
    ensureAudio();
    go(0);
  });
  nextBtn.addEventListener('click', function () { ensureAudio(); go(idx + 1); });
  backBtn.addEventListener('click', function () { go(idx - 1); });
  resumeBtn.addEventListener('click', function () { go(idx); });

  map.on('dragstart zoomstart', function () {
    if (flying || idx < 0) return;
    exploring = true;
    capEl.classList.add('hidden');
    resumeBtn.classList.remove('hidden');
  });

  document.addEventListener('keydown', function (e) {
    if (idx < 0) { if (e.key === 'Enter' || e.key === ' ') beginBtn.click(); return; }
    if (e.key === 'ArrowRight' || e.key === 'Enter') go(idx + 1);
    if (e.key === 'ArrowLeft') go(idx - 1);
  });

  // ---- sources overlay ----
  var srcOverlay = document.getElementById('sources');
  document.getElementById('srcBtn').addEventListener('click', function () { srcOverlay.classList.remove('hidden'); });
  document.getElementById('srcClose').addEventListener('click', function () { srcOverlay.classList.add('hidden'); });

  // ---- sound: a soft whoosh on flights, muted by default ----
  var soundOn = false;
  var AC = null, master = null;
  function ensureAudio() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.0;
      var comp = AC.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 8;
      master.connect(comp); comp.connect(AC.destination);
    } catch (e) { AC = null; }
  }
  function whoosh() {
    if (!soundOn || !AC) return;
    var t = AC.currentTime;
    var len = 1.6, sr = AC.sampleRate;
    var buf = AC.createBuffer(1, len * sr, sr);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    var src = AC.createBufferSource(); src.buffer = buf;
    var bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + len * 0.45);
    bp.frequency.exponentialRampToValueAtTime(500, t + len);
    var g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + len);
  }
  var soundBtn = document.getElementById('soundToggle');
  soundBtn.addEventListener('click', function () {
    ensureAudio();
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    if (master) master.gain.setTargetAtTime(soundOn ? 0.6 : 0.0, AC.currentTime, 0.05);
  });

  // ---- verification probe (no PII) ----
  window.__islandsProbe = function () {
    var c = map.getCenter();
    return {
      idx: idx, zoom: map.getZoom(), lat: Math.round(c.lat * 100000) / 100000,
      lng: Math.round(c.lng * 100000) / 100000, exploring: exploring,
      steps: STEPS.length, caption: capText.textContent
    };
  };


  // ---- offline render of the real whoosh graph, for verification (base64 WAV) ----
  window.__islandsRender = function (overlaps, seconds) {
    var sr = 22050, len = 1.6;
    var o = new OfflineAudioContext(1, Math.ceil((seconds || 2.2) * sr), sr);
    var m = o.createGain(); m.gain.value = 0.6;
    var comp = o.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 8;
    m.connect(comp); comp.connect(o.destination);
    for (var k = 0; k < overlaps; k++) {
      var t0 = 0.1 + k * 0.35;
      var buf = o.createBuffer(1, len * sr, sr);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      var s = o.createBufferSource(); s.buffer = buf;
      var bp = o.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(300, t0);
      bp.frequency.exponentialRampToValueAtTime(2400, t0 + len * 0.45);
      bp.frequency.exponentialRampToValueAtTime(500, t0 + len);
      var g = o.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      s.connect(bp); bp.connect(g); g.connect(m);
      s.start(t0); s.stop(t0 + len);
    }
    return o.startRendering().then(function (rb) {
      var ch = rb.getChannelData(0), out = new Int16Array(ch.length);
      for (var i = 0; i < ch.length; i++) out[i] = Math.max(-32768, Math.min(32767, ch[i] * 32767));
      var buf = new ArrayBuffer(44 + out.length * 2), v = new DataView(buf);
      function ws(p, s2) { for (var i = 0; i < s2.length; i++) v.setUint8(p + i, s2.charCodeAt(i)); }
      ws(0, 'RIFF'); v.setUint32(4, 36 + out.length * 2, true); ws(8, 'WAVEfmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      ws(36, 'data'); v.setUint32(40, out.length * 2, true);
      new Int16Array(buf, 44).set(out);
      var b = '';
      var u8 = new Uint8Array(buf);
      for (var j = 0; j < u8.length; j++) b += String.fromCharCode(u8[j]);
      return btoa(b);
    });
  };

  map.setView([18, 8], 2);

  // debug entry for automated verification: ?step=N jumps straight into the tour
  var qs = new URLSearchParams(location.search);
  if (qs.has('step')) {
    introEl.classList.add('hidden');
    go(Math.max(0, Math.min(STEPS.length - 1, parseInt(qs.get('step'), 10) || 0)));
  }
})();

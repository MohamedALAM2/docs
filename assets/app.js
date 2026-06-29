
(() => {
  const DATA = window.CRIMELENS_DOCS;
  const docs = DATA.docs;
  const nav = DATA.nav;
  const bySlug = Object.fromEntries(docs.map(d => [d.slug, d]));
  const flatNav = nav.flatMap(s => s.items.map(i => ({...i, section:s.title})));
  const demoVideoBase = 'فيديوهات/';
  const demoFeatures = [
    {
      slug: 'incident-dispatch',
      title: 'Incident & Dispatch',
      video: 'incident-and-dispatch.mp4',
      description: 'A focused walkthrough of the dispatcher flow: reviewing AI-created incidents, checking context, committing a crime, and assigning the right field officer with a clear audit trail.'
    },
    {
      slug: 'priority-engine',
      title: 'Priority Engine',
      video: 'priority-engine.mp4',
      description: 'Shows how CrimeLens turns confidence, crime type, weapon signals, crowd context, time, and repeat-area data into an explainable operational priority.'
    },
    {
      slug: 'citizen-tips',
      title: 'Citizen Tips',
      video: 'citizen-tips.mp4',
      description: 'Demonstrates public tip intake, dispatcher triage, media review, and the decision path for promoting a credible report into an operational incident.'
    },
    {
      slug: 'camera-streaming',
      title: 'Cameras & Streaming',
      video: 'cameras-and-streaming.mp4',
      description: 'Covers camera monitoring, gateway-backed playback, evidence recording, stream handoff, and the way camera feeds support the dispatch workflow.'
    },
    {
      slug: 'ai-integration',
      title: 'AI Model Integration',
      video: 'ai-model-integration.mp4',
      description: 'Explains how the AI service reports detections through constrained machine APIs while CrimeLens keeps dispatch authority with the backend and human operator.'
    },
    {
      slug: 'field-ops',
      title: 'Crime Lifecycle & Field Ops',
      video: 'crime-lifecycle-and-field-ops.mp4',
      description: 'Walks through officer assignment, response state changes, mobile field updates, panic support, and case resolution from the operational side.'
    },
    {
      slug: 'realtime-notifications',
      title: 'Real-Time & Notifications',
      video: 'real-time-and-notifications.mp4',
      description: 'Highlights live queue updates, officer presence, station notifications, and mobile push events that keep every surface synchronized.'
    }
  ];
  const demoPages = [
    {
      slug: 'intro',
      title: 'Intro Video',
      type: 'Demo',
      video: 'intro-video.mp4',
      description: 'A short introduction to CrimeLens, its core idea, and how the platform connects AI detections, dispatcher review, camera evidence, and field response.'
    },
    {
      slug: 'full-project',
      title: 'Full Project Video',
      type: 'Project Walkthrough',
      video: 'full-project-video.mp4',
      description: 'The complete CrimeLens project walkthrough from the product concept through the main workflows, architecture, security model, and operational surfaces.'
    },
    ...demoFeatures.map(feature => ({...feature, type: 'Feature Demo', feature: true}))
  ];
  const byDemoSlug = Object.fromEntries(demoPages.map(d => [d.slug, d]));
  const state = { currentSlug: null, currentDemoSlug: null, searchIndex: 0, headingsObserver: null };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const escapeHtml = (s='') => s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const stripMd = (s='') => s.replace(/```[\s\S]*?```/g,' ').replace(/<[^>]+>/g,' ').replace(/[#>*_`|\[\]()]|---/g,' ').replace(/\s+/g,' ').trim();
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  function icon(name){
    const map = {rocket:'✦',layers:'▣',sparkles:'✧',book:'☰',play:'▶'};
    return map[name] || '•';
  }

  function initSidebar(mode='docs'){
    if(mode === 'demo') return initDemoSidebar();
    $('#doc-count').textContent = `${docs.length} pages`;
    const saved = JSON.parse(localStorage.getItem('crimelens-collapsed') || '{}');
    $('#sidebar-nav').innerHTML = nav.map((section, idx) => `
      <div class="nav-section ${saved[section.title] ? 'collapsed' : ''}" data-section="${escapeHtml(section.title)}">
        <button class="nav-section-toggle" type="button" aria-expanded="${!saved[section.title]}">
          <span class="nav-section-title"><span>${icon(section.icon)}</span>${escapeHtml(section.title)}</span>
          <span class="nav-chevron">⌄</span>
        </button>
        <div class="nav-items">
          ${section.items.map(item => `<a class="nav-link" href="#/docs/${item.slug}" data-slug="${item.slug}">${escapeHtml(item.title)}</a>`).join('')}
        </div>
      </div>`).join('');
    $$('.nav-section-toggle').forEach(btn => btn.addEventListener('click', () => {
      const section = btn.closest('.nav-section');
      section.classList.toggle('collapsed');
      const collapsed = section.classList.contains('collapsed');
      btn.setAttribute('aria-expanded', String(!collapsed));
      const saved = JSON.parse(localStorage.getItem('crimelens-collapsed') || '{}');
      saved[section.dataset.section] = collapsed;
      localStorage.setItem('crimelens-collapsed', JSON.stringify(saved));
    }));
  }

  function initDemoSidebar(){
    $('#doc-count').textContent = `${demoPages.length} videos`;
    $('#sidebar-nav').innerHTML = `
      <div class="nav-section" data-section="Demo">
        <button class="nav-section-toggle" type="button" aria-expanded="true">
          <span class="nav-section-title"><span>${icon('play')}</span>Demo</span>
          <span class="nav-chevron">⌄</span>
        </button>
        <div class="nav-items">
          <a class="nav-link demo-nav-link" href="#/demo/intro" data-demo-slug="intro">Intro Video</a>
          <a class="nav-link demo-nav-link" href="#/demo/full-project" data-demo-slug="full-project">Full Project Video</a>
        </div>
      </div>
      <div class="nav-section" data-section="Feature Videos">
        <button class="nav-section-toggle" type="button" aria-expanded="true">
          <span class="nav-section-title"><span>${icon('sparkles')}</span>Features</span>
          <span class="nav-chevron">⌄</span>
        </button>
        <div class="nav-items">
          ${demoFeatures.map(item => `<a class="nav-link demo-nav-link" href="#/demo/${item.slug}" data-demo-slug="${item.slug}">${escapeHtml(item.title)}</a>`).join('')}
        </div>
      </div>`;
    $$('.nav-section-toggle').forEach(btn => btn.addEventListener('click', () => {
      const section = btn.closest('.nav-section');
      section.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!section.classList.contains('collapsed')));
    }));
  }

  function renderHome(){
    state.currentSlug = null;
    state.currentDemoSlug = null;
    document.title = 'CrimeLens Documentation';
    initSidebar('docs');
    setActiveNav(null);
    $('#toc').innerHTML = `<a href="#/docs/overview">Overview</a><a href="#/docs/architecture">Architecture</a><a href="#/docs/security">Security</a><a href="#/docs/api">API Reference</a>`;
    $('#page-root').innerHTML = `
      <section class="hero">
        <div class="hero-grid">
          <div>
            <span class="badge">Enterprise Static Documentation · Updated ${escapeHtml(DATA.project.updated)}</span>
            <h1><span class="gradient-text">CrimeLens</span><br/>Documentation</h1>
            <p>Production-grade documentation for an AI-assisted Computer-Aided Dispatch platform: incident governance, dispatcher workflow, camera streaming, AI integration, field operations, security, APIs and testing.</p>
            <div class="hero-actions">
              <a class="btn primary" href="#/docs/overview">Start Reading <span>→</span></a>
              <button class="btn secondary" type="button" data-open-search>Search Docs <span>⌘K</span></button>
            </div>
          </div>
          <div class="hero-card">
            <span class="eyebrow">Operational Pipeline</span>
            <div class="pipeline-mini" style="margin-top:14px">
              ${['AI Detection','Pending Incident','Priority Engine','Dispatcher Review','Crime Assignment','Officer Resolution'].map((s,i)=>`<div class="pipeline-step"><span>${i+1}</span><strong>${s}</strong></div>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="stats-grid">
          ${DATA.stats.map(s=>`<article class="stat-card"><strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span><p>${escapeHtml(s.detail)}</p></article>`).join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading"><div><h2>Quick Navigation</h2><p>Jump directly into the documentation areas most useful for review, demo preparation, or technical evaluation.</p></div></div>
        <div class="card-grid">
          ${[
            ['Getting Started','System overview, architecture, modules and setup.','overview'],
            ['Dispatch Workflow','Incident queue, claim/release, dispatch and false-alarm rejection.','dispatch'],
            ['Security Model','Guards, machine hardening, encryption, signed media and tenancy.','security'],
            ['API Reference','Route map across machine, mobile, station, admin and public APIs.','api'],
            ['Camera Streaming','Gateway, HLS/WebRTC, recording, evidence extraction and tamper detection.','cameras'],
            ['Testing & Quality','Pest, Laravel, Flutter and browser test coverage.','testing'],
          ].map(([t,d,slug])=>`<a class="quick-card" href="#/docs/${slug}"><small>${escapeHtml(bySlug[slug]?.section || 'Docs')}</small><h3>${escapeHtml(t)}</h3><p>${escapeHtml(d)}</p></a>`).join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading"><div><h2>Architecture Overview</h2><p>A concise map of the system surfaces, Laravel modules and infrastructure rails.</p></div></div>
        <div class="architecture-panel">
          <div class="architecture-lanes">
            <div class="lane"><strong>User Surfaces</strong><ul><li>Admin Console</li><li>Station / Dispatcher Console</li><li>Officer Mobile App</li></ul></div>
            <div class="lane"><strong>Core Platform</strong><ul><li>Laravel Modular Monolith</li><li>Six bounded modules</li><li>Incident-first governance</li></ul></div>
            <div class="lane"><strong>Realtime & Data</strong><ul><li>PostgreSQL + PostGIS</li><li>Redis + Horizon</li><li>Pusher + Firebase FCM</li></ul></div>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading"><div><h2>Technology Stack</h2><p>Enterprise-grade components documented across the project files.</p></div></div>
        <div class="card-grid">
          ${DATA.stack.map(s=>`<article class="stack-card"><small>Stack</small><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.desc)}</p></article>`).join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading"><div><h2>Key Features</h2><p>The product capabilities that make CrimeLens feel like an operational CAD platform, not a simple graduation prototype.</p></div></div>
        <div class="card-grid">
          ${DATA.features.map(f=>`<article class="feature-card"><small>Capability</small><h3>${escapeHtml(f.title)}</h3><p>${escapeHtml(f.desc)}</p></article>`).join('')}
        </div>
      </section>`;
    $('[data-open-search]')?.addEventListener('click', openSearch);
    window.scrollTo({top:0, behavior:'instant'});
  }

  function renderDoc(slug, anchor=''){
    const doc = bySlug[slug] || bySlug.overview;
    state.currentSlug = doc.slug;
    state.currentDemoSlug = null;
    document.title = `${doc.title} · CrimeLens Documentation`;
    initSidebar('docs');
    setActiveNav(doc.slug);
    const index = flatNav.findIndex(x => x.slug === doc.slug);
    const prev = flatNav[index-1];
    const next = flatNav[index+1];
    $('#page-root').innerHTML = `
      <article class="doc-page">
        <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>${escapeHtml(doc.section)}</span><span>/</span><strong>${escapeHtml(doc.title)}</strong></div>
        <header class="doc-hero">
          <div class="doc-meta"><span class="doc-pill">${escapeHtml(doc.section)}</span><span class="doc-pill">${doc.headings.length} sections</span><span class="doc-pill">Static page</span></div>
          <h1>${escapeHtml(doc.title)}</h1>
          <p>${escapeHtml(doc.description)}</p>
        </header>
        <div class="doc-layout-card">
          <div class="prose">${doc.html}</div>
        </div>
        <nav class="doc-pagination" aria-label="Page navigation">
          ${prev ? `<a class="page-link prev" href="#/docs/${prev.slug}"><small>Previous</small><strong>← ${escapeHtml(prev.title)}</strong></a>` : '<span></span>'}
          ${next ? `<a class="page-link next" href="#/docs/${next.slug}"><small>Next</small><strong>${escapeHtml(next.title)} →</strong></a>` : '<span></span>'}
        </nav>
      </article>`;
    renderToc(doc);
    enhanceCodeBlocks();
    setupHeadingObserver();
    $('#main').focus({preventScroll:true});
    const goAnchor = anchor || (location.hash.includes('#') ? location.hash.split('#')[1] : '');
    if (goAnchor) {
      setTimeout(()=> document.getElementById(goAnchor)?.scrollIntoView({behavior:'smooth', block:'start'}), 30);
    } else {
      window.scrollTo({top:0, behavior:'instant'});
    }
  }

  function renderDemo(slug='intro'){
    const page = byDemoSlug[slug] || byDemoSlug.intro;
    state.currentSlug = null;
    state.currentDemoSlug = page.slug;
    document.title = `${page.title} · CrimeLens Demo`;
    initDemoSidebar();
    setActiveNav(null);
    setActiveDemoNav(page.slug);
    const featureIndex = demoFeatures.findIndex(f => f.slug === page.slug);
    const prevFeature = featureIndex > 0 ? demoFeatures[featureIndex - 1] : null;
    const nextFeature = featureIndex > -1 && featureIndex < demoFeatures.length - 1 ? demoFeatures[featureIndex + 1] : null;
    const videoSrc = encodeURI(`${demoVideoBase}${page.video}`);
    $('#toc').innerHTML = `<a href="#demo-video" class="active">Video</a><a href="#demo-description">Description</a>${page.feature ? '<a href="#feature-list">Feature list</a>' : '<a href="#feature-list">Features</a>'}`;
    $('#page-root').innerHTML = `
      <article class="doc-page demo-page">
        <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>Demo</span><span>/</span><strong>${escapeHtml(page.title)}</strong></div>
        <header class="doc-hero demo-hero">
          <div class="doc-meta"><span class="doc-pill">${escapeHtml(page.type)}</span><span class="doc-pill">Video walkthrough</span><span class="doc-pill">CrimeLens</span></div>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.description)}</p>
        </header>
        <section id="demo-video" class="demo-video-shell">
          <video class="demo-video" controls preload="metadata" playsinline>
            <source src="${videoSrc}" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </section>
        <section id="demo-description" class="doc-layout-card demo-description">
          <span class="eyebrow">${page.feature ? 'Feature walkthrough' : 'Demo overview'}</span>
          <h2>${escapeHtml(page.title)}</h2>
          <p>${escapeHtml(page.description)}</p>
          ${page.feature ? `<p>This page keeps the feature video first, then gives reviewers the operational context they need: what the feature demonstrates, why it matters in the CrimeLens workflow, and where it fits inside the AI-assisted dispatch lifecycle.</p>` : `<p>Use the sidebar to switch between the introduction, the complete project walkthrough, and focused feature videos. The layout mirrors the documentation experience so the demo area feels like part of the same product.</p>`}
        </section>
        <section id="feature-list" class="section-block">
          <div class="section-heading"><div><h2>Feature Videos</h2><p>Open any feature to watch its walkthrough with the description directly underneath.</p></div></div>
          <div class="card-grid demo-feature-grid">
            ${demoFeatures.map(feature => `<a class="quick-card demo-feature-card ${feature.slug === page.slug ? 'active' : ''}" href="#/demo/${feature.slug}"><small>Feature Demo</small><h3>${escapeHtml(feature.title)}</h3><p>${escapeHtml(feature.description)}</p></a>`).join('')}
          </div>
        </section>
        ${page.feature ? `<nav class="doc-pagination" aria-label="Demo navigation">
          ${prevFeature ? `<a class="page-link prev" href="#/demo/${prevFeature.slug}"><small>Previous feature</small><strong>← ${escapeHtml(prevFeature.title)}</strong></a>` : '<span></span>'}
          ${nextFeature ? `<a class="page-link next" href="#/demo/${nextFeature.slug}"><small>Next feature</small><strong>${escapeHtml(nextFeature.title)} →</strong></a>` : '<span></span>'}
        </nav>` : ''}
      </article>`;
    $('#main').focus({preventScroll:true});
    window.scrollTo({top:0, behavior:'instant'});
  }

  function renderToc(doc){
    const items = doc.headings.filter(h => h.level >= 2 && h.level <= 3).slice(0, 24);
    $('#toc').innerHTML = items.length ? items.map(h=>`<a class="level-${h.level}" href="#${h.id}" data-heading="${h.id}">${escapeHtml(h.title)}</a>`).join('') : '<span class="empty-state">No headings</span>';
    $$('#toc a').forEach(a => a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el){ e.preventDefault(); history.replaceState(null,'',`#/docs/${state.currentSlug}#${id}`); el.scrollIntoView({behavior:'smooth', block:'start'}); }
    }));
  }

  function setActiveNav(slug){
    $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.slug === slug));
    if(slug){
      const section = $(`.nav-link[data-slug="${slug}"]`)?.closest('.nav-section');
      section?.classList.remove('collapsed');
      section?.querySelector('.nav-section-toggle')?.setAttribute('aria-expanded','true');
    }
  }

  function setActiveDemoNav(slug){
    $$('.demo-nav-link').forEach(a => a.classList.toggle('active', a.dataset.demoSlug === slug));
  }

  function setupHeadingObserver(){
    if(state.headingsObserver) state.headingsObserver.disconnect();
    const headings = $$('.prose h2[id], .prose h3[id]');
    if(!headings.length) return;
    state.headingsObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if(!visible) return;
      const id = visible.target.id;
      $$('#toc a').forEach(a => a.classList.toggle('active', a.dataset.heading === id));
    }, {rootMargin:'-18% 0px -70% 0px', threshold:[0,1]});
    headings.forEach(h=>state.headingsObserver.observe(h));
  }

  function enhanceCodeBlocks(){
    $$('.copy-btn').forEach(btn => btn.addEventListener('click', async () => {
      const code = btn.closest('.code-card')?.querySelector('code')?.innerText || '';
      try { await navigator.clipboard.writeText(code); btn.textContent = 'Copied'; }
      catch { btn.textContent = 'Select + Copy'; }
      setTimeout(()=>btn.textContent='Copy', 1300);
    }));
  }

  function route(){
    const raw = location.hash || '#/';
    const hash = raw.slice(1);
    if(hash === '/' || hash === '') return renderHome();
    const m = hash.match(/^\/docs\/([^#]+)(?:#(.+))?/);
    if(m) return renderDoc(m[1], m[2] || '');
    const demo = hash.match(/^\/demo\/([^#]+)?/);
    if(demo) return renderDemo(demo[1] || 'intro');
    renderHome();
  }

  function buildSearchRows(query){
    const q = query.trim().toLowerCase();
    const demoSearchRows = demoPages.map(page => ({
      demo: page,
      score: 1,
      title: `Demo › ${page.title}`,
      text: page.description
    }));
    if(!q) return [
      ...docs.slice(0,6).map(d => ({doc:d, score:1, title:d.title, text:d.description})),
      ...demoSearchRows.slice(0,6)
    ];
    const tokens = q.split(/\s+/).filter(Boolean);
    const rows = [];
    for(const doc of docs){
      const hay = `${doc.title} ${doc.section} ${doc.description} ${stripMd(doc.raw)}`.toLowerCase();
      let score = 0;
      for(const t of tokens){
        if(doc.title.toLowerCase().includes(t)) score += 8;
        if(doc.section.toLowerCase().includes(t)) score += 4;
        if(hay.includes(t)) score += 2;
      }
      const heading = doc.headings.find(h => tokens.some(t => h.title.toLowerCase().includes(t)));
      if(heading) score += 6;
      if(score) rows.push({doc, score, title: heading ? `${doc.title} › ${heading.title}` : doc.title, heading, text: doc.description});
    }
    for(const page of demoPages){
      const hay = `demo video feature ${page.title} ${page.type} ${page.description}`.toLowerCase();
      let score = 0;
      for(const t of tokens){
        if(page.title.toLowerCase().includes(t)) score += 10;
        if((page.type || '').toLowerCase().includes(t)) score += 5;
        if(hay.includes(t)) score += 3;
      }
      if(score) rows.push({demo: page, score, title: `Demo › ${page.title}`, text: page.description});
    }
    return rows.sort((a,b)=>b.score-a.score).slice(0,12);
  }

  function highlight(text, q){
    let safe = escapeHtml(text);
    q.trim().split(/\s+/).filter(Boolean).forEach(t => {
      safe = safe.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig'), '<mark>$1</mark>');
    });
    return safe;
  }

  function renderSearch(){
    const input = $('#search-input');
    const q = input.value;
    const rows = buildSearchRows(q);
    state.searchIndex = clamp(state.searchIndex,0,Math.max(rows.length-1,0));
    $('#search-results').innerHTML = rows.length ? rows.map((r,i)=>{
      const href = r.demo ? `#/demo/${r.demo.slug}` : `#/docs/${r.doc.slug}${r.heading ? '#'+r.heading.id : ''}`;
      return `<a class="search-result ${i===state.searchIndex?'active':''}" href="${href}" data-idx="${i}"><strong>${highlight(r.title,q)}</strong><span>${highlight(r.text,q)}</span></a>`;
    }).join('') : '<div class="empty-state">No results found. Try API, security, dispatch, camera, demo, video, priority.</div>';
    $$('.search-result').forEach(a => a.addEventListener('click', closeSearch));
  }

  function openSearch(){
    $('#search-modal').classList.add('open');
    $('#search-modal').setAttribute('aria-hidden','false');
    $('#search-input').value = '';
    renderSearch();
    setTimeout(()=>$('#search-input').focus(), 20);
  }
  function closeSearch(){
    $('#search-modal').classList.remove('open');
    $('#search-modal').setAttribute('aria-hidden','true');
  }

  function toggleTheme(){
    const current = document.documentElement.dataset.theme || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('crimelens-theme', next);
  }

  function updateProgress(){
    const h = document.documentElement;
    const pct = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100;
    $('#scroll-progress').style.width = `${pct}%`;
    $('#back-to-top').classList.toggle('show', h.scrollTop > 520);
  }

  function navigateRelative(delta){
    if(!state.currentSlug){
      if(state.currentDemoSlug){
        const idx = demoPages.findIndex(x => x.slug === state.currentDemoSlug);
        const target = demoPages[idx + delta];
        if(target) location.hash = `#/demo/${target.slug}`;
        return;
      }
      location.hash = delta > 0 ? '#/docs/overview' : '#/docs/glossary';
      return;
    }
    const idx = flatNav.findIndex(x => x.slug === state.currentSlug);
    const target = flatNav[idx + delta];
    if(target) location.hash = `#/docs/${target.slug}`;
  }

  function bindEvents(){
    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', updateProgress, {passive:true});
    $('#search-trigger').addEventListener('click', openSearch);
    $('#theme-toggle').addEventListener('click', toggleTheme);
    $('#mobile-menu').addEventListener('click', ()=>$('#sidebar').classList.toggle('open'));
    $('#back-to-top').addEventListener('click', ()=>window.scrollTo({top:0, behavior:'smooth'}));
    $('.search-backdrop').addEventListener('click', closeSearch);
    $('#search-input').addEventListener('input', ()=>{state.searchIndex=0;renderSearch();});
    document.addEventListener('click', (e)=>{
      if(e.target.closest('.nav-link') && window.innerWidth <= 860) $('#sidebar').classList.remove('open');
    });
    document.addEventListener('keydown', (e)=>{
      const inInput = ['INPUT','TEXTAREA'].includes(document.activeElement.tagName);
      if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k'){e.preventDefault();openSearch();return;}
      if($('#search-modal').classList.contains('open')){
        if(e.key==='Escape'){e.preventDefault();closeSearch();}
        if(e.key==='ArrowDown'){e.preventDefault();state.searchIndex++;renderSearch();}
        if(e.key==='ArrowUp'){e.preventDefault();state.searchIndex--;renderSearch();}
        if(e.key==='Enter'){e.preventDefault();$('.search-result.active')?.click();}
        return;
      }
      if(inInput) return;
      if(e.key.toLowerCase()==='d'){toggleTheme();}
      if(e.key==='['){navigateRelative(-1);}
      if(e.key===']'){navigateRelative(1);}
      if(e.key==='/'){e.preventDefault();openSearch();}
    });
  }

  initSidebar();
  bindEvents();
  route();
  updateProgress();
})();

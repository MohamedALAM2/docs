(() => {
  function replaceCodeBlock(predicate, render, key){
    document.querySelectorAll('.code-card code').forEach(code => {
      const text = (code.textContent || '').replace(/\s+/g, ' ').trim();
      if(!predicate(text)) return;
      const card = code.closest('.code-card');
      if(!card || card.dataset[key] === 'true') return;
      card.dataset[key] = 'true';
      card.replaceWith(render());
    });
  }

  function renderApproachFlow(){
    const flow = document.createElement('section');
    flow.className = 'approach-flow';
    flow.setAttribute('aria-label', 'AI-originated CAD workflow');
    flow.innerHTML = `
      <div class="flow-kicker"><span></span> Human-in-the-loop incident pipeline</div>
      <div class="flow-main">
        <article class="flow-node ai"><small>01</small><strong>AI Detection</strong><p>Reports a signal</p></article>
        <article class="flow-node incident"><small>02</small><strong>Pending Incident</strong><p>Reviewable work item</p></article>
        <article class="flow-node review"><small>03</small><strong>Dispatcher Review</strong><p>Human decision gate</p></article>
        <article class="flow-node crime"><small>04</small><strong>Crime</strong><p>Committed response</p></article>
        <article class="flow-node officer"><small>05</small><strong>Officer</strong><p>Field resolution</p></article>
      </div>
      <div class="flow-score-row">
        <div class="flow-score-card">
          <span class="score-badge">Priority Engine</span>
          <strong>Explainable score before dispatch</strong>
          <p>Confidence, crime type, weapon signal, repeat area, time of day and crowd density shape the queue priority.</p>
        </div>
      </div>`;
    return flow;
  }

  function renderArchitectureFlow(){
    const flow = document.createElement('section');
    flow.className = 'architecture-flow';
    flow.setAttribute('aria-label', 'CrimeLens high-level system architecture');
    flow.innerHTML = `
      <div class="arch-kicker"><span></span> High-level system map</div>
      <div class="arch-topline">
        <div class="arch-title">
          <h3>CrimeLens Platform Architecture</h3>
          <p>A single Laravel modular monolith connects web consoles, the officer mobile app, AI detection, camera streaming, real-time events and operational storage.</p>
        </div>
        <div class="arch-badge">6 Modules · Realtime · CAD</div>
      </div>

      <div class="arch-surface-grid" aria-label="User surfaces">
        <article class="arch-card"><div class="arch-icon">🛡️</div><strong>Admin Console</strong><span>React web console for system administration, stations, AI models and analytics.</span></article>
        <article class="arch-card"><div class="arch-icon">📍</div><strong>Station Console</strong><span>Dispatcher operations screen using Inertia, Echo, live maps and queue updates.</span></article>
        <article class="arch-card"><div class="arch-icon">📱</div><strong>Officer App</strong><span>Flutter mobile app over REST APIs with Firebase push notifications.</span></article>
      </div>

      <div class="arch-connector" aria-hidden="true"><i></i><i></i><i></i></div>

      <div class="arch-platform">
        <div class="arch-platform-head">
          <strong>Laravel 13 Modular Monolith</strong>
          <span>Controllers → Requests / DTOs → Services / Actions → Models</span>
        </div>
        <div class="arch-modules" aria-label="Laravel modules">
          <b>Admin</b><b>Police</b><b>Camera</b><b>Gateway</b><b>AiModel</b><b>Core</b>
        </div>
        <div class="arch-layered" aria-label="Application layers">
          <span>HTTP / Inertia</span><span>Validation DTOs</span><span>Domain Services</span><span>Persistence</span>
        </div>
      </div>

      <div class="arch-infra-grid" aria-label="Infrastructure services">
        <article class="arch-infra-card"><small>Database</small><strong>PostgreSQL + PostGIS</strong><span>Tenancy, incidents, crimes, officers, spatial queries and evidence metadata.</span></article>
        <article class="arch-infra-card"><small>Realtime Cache</small><strong>Redis</strong><span>Queues, cache, presence, GPS hot path and replay protection.</span></article>
        <article class="arch-infra-card"><small>Workers</small><strong>Horizon</strong><span>Background jobs for incidents, scenes, health checks and notifications.</span></article>
        <article class="arch-infra-card"><small>Events</small><strong>Pusher / Echo</strong><span>Live station queue, maps, panic alerts and admin health events.</span></article>
      </div>

      <div class="arch-stream-row" aria-label="Camera and AI streaming pipeline">
        <article class="arch-stream-card ai"><strong>AI Detection Service</strong><p>Consumes assigned streams and reports detections through the secured model API.</p><div class="stream-tags"><span>HMAC</span><span>IP Guard</span><span>Heartbeat</span></div></article>
        <article class="arch-stream-card gateway"><strong>Python Camera Gateway</strong><p>Flask + FFmpeg + MediaMTX fan out camera feeds into formats needed by AI, web and mobile.</p><div class="stream-tags"><span>RTSP</span><span>HLS</span><span>WebRTC</span></div></article>
        <article class="arch-stream-card cameras"><strong>Tapo / ONVIF Cameras</strong><p>Physical camera fleet controlled only by the backend and used as sensor + evidence source.</p><div class="stream-tags"><span>PTZ</span><span>Alarm</span><span>Recording</span></div></article>
      </div>

      <p class="arch-footnote"><strong>Data flow:</strong> Cameras stream through the gateway, AI detections become reviewable incidents, dispatchers make the decision, and officers receive assignments in real time.</p>`;
    return flow;
  }

  function enhanceDiagrams(){
    replaceCodeBlock(
      text => text.includes('AI detection') && text.includes('Incident (pending_review)') && text.includes('Priority Engine scores it'),
      renderApproachFlow,
      'approachEnhanced'
    );
    replaceCodeBlock(
      text => text.includes('Admin Console') && text.includes('Laravel 13 Modular Monolith') && text.includes('Camera Gateway') && text.includes('PostgreSQL'),
      renderArchitectureFlow,
      'architectureEnhanced'
    );
  }

  const scheduleEnhance = () => requestAnimationFrame(() => setTimeout(enhanceDiagrams, 0));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnhance);
  else scheduleEnhance();
  window.addEventListener('hashchange', scheduleEnhance);
  document.addEventListener('click', event => {
    if(event.target.closest('a[href^="#/docs/"]')) scheduleEnhance();
  }, true);
})();

(() => {
  const state = { observer: null, timer: null };

  const slug = () => (location.hash.match(/^#\/docs\/([^#]+)/) || [])[1] || '';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function html(strings, ...values){
    return strings.reduce((out, str, i) => out + str + (values[i] ?? ''), '');
  }

  function node(markup){
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
  }

  function replace(el, markup){
    if(!el || el.dataset.polished === 'true') return;
    const n = typeof markup === 'string' ? node(markup) : markup;
    if(!n) return;
    n.dataset.polished = 'true';
    el.replaceWith(n);
  }

  function findCode(markers){
    const tests = Array.isArray(markers) ? markers : [markers];
    return $$('.prose .code-card').find(card => {
      const text = card.innerText || '';
      return tests.every(m => text.includes(m));
    });
  }

  function findFirstTableAfterHeading(id){
    const h = document.getElementById(id);
    if(!h) return null;
    let el = h.nextElementSibling;
    while(el && !/^H[123]$/.test(el.tagName)){
      if(el.matches?.('.table-shell, table')) return el.closest('.table-shell') || el;
      if((el.innerText || '').includes('| Capability | Admin | Dispatcher')) return el;
      el = el.nextElementSibling;
    }
    return null;
  }

  function visualShell(kind, kicker, title, body, badge = ''){
    return html`
      <section class="cl-visual cl-${kind}" data-polish-kind="${kind}">
        <div class="cl-visual-head">
          <div>
            <div class="cl-visual-kicker">${kicker}</div>
            <h3>${title}</h3>
          </div>
          ${badge ? `<div class="cl-visual-badge">${badge}</div>` : ''}
        </div>
        <div class="cl-visual-body">${body}</div>
      </section>`;
  }

  function simpleNode(icon, title, desc = '', cls = ''){
    return `<div class="cl-node ${cls}"><div class="cl-icon">${icon}</div><strong>${title}</strong>${desc ? `<span>${desc}</span>` : ''}</div>`;
  }

  function approachDiagram(){
    const body = html`
      <div class="cl-approach-flow">
        ${simpleNode('AI','AI Detection','Reports only; no direct action')}
        <div class="cl-arrow" aria-hidden="true"></div>
        ${simpleNode('IR','Pending Incident','Human-reviewable work item','highlight')}
        <div class="cl-arrow" aria-hidden="true"></div>
        ${simpleNode('DS','Dispatcher Review','Dispatch or reject with audit trail')}
      </div>
      <div class="cl-approach-flow" style="margin-top:12px">
        ${simpleNode('CR','Crime','Created only after dispatch')}
        <div class="cl-arrow" aria-hidden="true"></div>
        ${simpleNode('OF','Officer','Assigned responder receives task')}
        <div class="cl-arrow" style="opacity:0" aria-hidden="true"></div>
        ${simpleNode('✓','Resolution','Closed with evidence and timeline','highlight')}
      </div>
      <div class="cl-priority-lane">
        <div class="cl-priority-line"></div>
        <div class="cl-priority-card"><strong>Priority Engine</strong><span>Scores the incident before dispatcher action</span></div>
        <div class="cl-priority-line"></div>
      </div>
      <div class="cl-footnote"><strong>Control boundary:</strong> AI never creates a crime or commands a camera. It submits a report, then CrimeLens routes the decision through the incident layer.</div>`;
    return visualShell('approach', 'AI-Originated CAD', 'From detection to governed response', body, 'Human in the loop');
  }

  function architectureDiagram(){
    const body = html`
      <div class="cl-architecture-map">
        <div class="cl-arch-row">
          ${simpleNode('AD','Admin Console','React / Inertia web surface')}
          ${simpleNode('ST','Station Console','Dispatcher live operations')}
          ${simpleNode('MB','Officer App','Flutter + REST + FCM')}
        </div>
        <div class="cl-arch-core">
          <strong>Laravel 13 Modular Monolith</strong>
          <span>Controllers → FormRequests / DTOs → Services / Actions → Models</span>
          <div class="cl-modules">
            ${['Admin','Police','Camera','Gateway','AiModel','Core'].map(x => `<span class="cl-chip">${x}</span>`).join('')}
          </div>
        </div>
        <div class="cl-arch-rails">
          ${simpleNode('DB','PostgreSQL + PostGIS','Transactional + spatial storage')}
          ${simpleNode('RD','Redis','Cache, queues, GPS, presence')}
          ${simpleNode('HZ','Horizon','Queue workers and supervisors')}
          ${simpleNode('RT','Pusher / Echo','Live console updates')}
        </div>
        <div class="cl-stream-row">
          ${simpleNode('AI','AI Detection Service','Reads streams and reports detections')}
          <div class="cl-arrow" aria-hidden="true"></div>
          ${simpleNode('GW','Python Camera Gateway','Flask + FFmpeg + MediaMTX','highlight')}
          <div class="cl-arrow" aria-hidden="true"></div>
          ${simpleNode('CAM','Tapo / ONVIF Cameras','RTSP source + device control')}
        </div>
      </div>`;
    return visualShell('architecture', 'System Architecture', 'High-level production topology', body, '6 modules');
  }

  function workflowPipeline(){
    const body = html`
      <div class="cl-cad-grid">
        <div class="cl-cad-column">
          ${simpleNode('01','AI Service','Posts alert / crime detection')}
          ${simpleNode('02','Incident Created','status = pending_review','highlight')}
          ${simpleNode('03','Priority Engine','Calculates score + tier')}
        </div>
        <div class="cl-cad-decision">
          ${simpleNode('04','Dispatcher Console','Claim, inspect evidence, decide')}
          <div class="cl-branch-grid">
            <div class="cl-branch reject"><strong>Reject</strong><span>False alarm path; feeds model-quality metrics.</span></div>
            <div class="cl-branch accept"><strong>Dispatch</strong><span>Creates a Crime and starts field operations.</span></div>
          </div>
        </div>
        <div class="cl-cad-column">
          ${simpleNode('05','Crime Assigned','Nearest available officer')}
          ${simpleNode('06','FCM + Echo','Mobile push + live station update')}
          ${simpleNode('07','Resolved or Escalated','Close the case or reassign')}
        </div>
      </div>
      <div class="cl-cad-resolve">
        ${['accept','in_progress','arrived','resolved'].map(x => `<div class="cl-mini-step">${x}</div>`).join('')}
      </div>
      <div class="cl-footnote"><strong>Audit trail:</strong> every consequential transition is persisted, broadcast, and explainable from detection through resolution.</div>`;
    return visualShell('workflow-pipeline', 'CAD Pipeline', 'Pixel → incident → dispatch → field response', body, 'End-to-end');
  }

  function fieldResponseDiagram(){
    const body = html`
      <div class="cl-status-flow">
        <div class="cl-status-main five">
          <div class="cl-state neutral"><span class="tag">task</span><strong>Assigned</strong><span>Officer receives crime, map, and brief.</span></div>
          <div class="cl-state"><span class="tag">ack</span><strong>Accepted</strong><span>accepted_at is captured.</span></div>
          <div class="cl-state"><span class="tag">active</span><strong>In Progress</strong><span>Responder is heading to scene.</span></div>
          <div class="cl-state warn"><span class="tag">scene</span><strong>Arrived / Visited</strong><span>Presence at location is reflected in console.</span></div>
          <div class="cl-state good"><span class="tag">closed</span><strong>Resolved</strong><span>Resolution note and response metrics are stored.</span></div>
        </div>
        <div class="cl-connector-label">alternative path</div>
        <div class="cl-state-row">
          <div class="cl-state danger"><span class="tag">decline</span><strong>No-visit</strong><span>Officer declines with required reason and type.</span></div>
          <div class="cl-state warn"><span class="tag">watchdog</span><strong>Escalation trigger</strong><span>No response within timeout can move work to another officer.</span></div>
        </div>
      </div>`;
    return visualShell('field-response', 'Field Response', 'Mobile officer lifecycle', body, 'Live updates');
  }

  function dispatchStatusDiagram(){
    const body = html`
      <div class="cl-status-flow">
        <div class="cl-status-main">
          <div class="cl-state neutral"><span class="tag">input</span><strong>Created</strong><span>AI, manual, or citizen-originated report enters the system.</span></div>
          <div class="cl-state warn"><span class="tag">review</span><strong>pending_review</strong><span>Dispatcher queue item awaiting a decision.</span></div>
          <div class="cl-state good"><span class="tag">dispatch</span><strong>dispatched</strong><span>Creates a linked crime and commits a response.</span></div>
        </div>
        <div class="cl-connector-label">decision outcomes</div>
        <div class="cl-state-row">
          <div class="cl-state danger"><span class="tag">reject</span><strong>rejected_false_alarm</strong><span>Reason is recorded and model-quality analytics can use it.</span></div>
          <div class="cl-state"><span class="tag">timeout</span><strong>expired</strong><span>Aged out without review according to retention policy.</span></div>
        </div>
      </div>`;
    return visualShell('incident-status', 'Incident Status Machine', 'Small, auditable dispatch lifecycle', body, '4 outcomes');
  }

  function dispatcherConsoleDiagram(){
    const body = html`
      <div class="cl-console-mock">
        <div class="cl-console-pane">
          <strong>Pending Queue</strong>
          <div class="cl-console-list">
            <div class="cl-ticket"><span>My tasks</span><i class="cl-priority-dot"></i></div>
            <div class="cl-ticket"><span>Shared queue</span><i class="cl-priority-dot"></i></div>
            <div class="cl-ticket"><span>Claim / release</span><i class="cl-priority-dot"></i></div>
          </div>
        </div>
        <div class="cl-console-pane">
          <strong>Live Map</strong>
          <div class="cl-map-area">incidents · officers · cameras</div>
          <div class="cl-panel-card">Selected Incident Panel: evidence, priority factors, actions</div>
        </div>
        <div class="cl-console-pane">
          <strong>Side Panels</strong>
          ${['Chat preview','Citizen tips','Pattern alerts','Active crimes','On-shift officers'].map(x => `<div class="cl-panel-card">${x}</div>`).join('')}
        </div>
      </div>`;
    return visualShell('dispatcher-console', 'Dispatcher Console', 'Tri-pane operations workspace', body, 'Live ops');
  }

  function crimeStatusDiagram(){
    const body = html`
      <div class="cl-status-flow">
        <div class="cl-status-main five">
          <div class="cl-state neutral"><span class="tag">start</span><strong>assigned</strong><span>Officer selected and notified.</span></div>
          <div class="cl-state"><span class="tag">accept</span><strong>in_progress</strong><span>Officer accepts and begins response.</span></div>
          <div class="cl-state warn"><span class="tag">arrive</span><strong>visited</strong><span>Scene reached and operational work continues.</span></div>
          <div class="cl-state good"><span class="tag">resolve</span><strong>resolved</strong><span>Case closed with response details.</span></div>
          <div class="cl-state danger"><span class="tag">false</span><strong>false_alarm</strong><span>Marked when outcome proves invalid.</span></div>
        </div>
        <div class="cl-connector-label">side transitions</div>
        <div class="cl-state-row">
          <div class="cl-state danger"><span class="tag">no visit</span><strong>not_visited</strong><span>Reason required; creates accountability trail.</span></div>
          <div class="cl-state warn"><span class="tag">timeout</span><strong>escalated → reassigned</strong><span>Stale response can move to the next officer.</span></div>
        </div>
      </div>`;
    return visualShell('crime-status', 'Crime Status Machine', 'Field operations lifecycle', body, 'Officer workflow');
  }

  function authorityMatrix(){
    const rows = [
      ['Configure system / stations','yes','no','no','no','no'],
      ['Review & dispatch incidents','no','yes','no','no','no'],
      ['Create manual incident','no','yes','no','no','no'],
      ['Report detection (alert/crime)','no','no','no','yes','no'],
      ['Accept / resolve assigned crime','no','no','yes','no','no'],
      ['Command camera (PTZ/alarm)','backend','backend','no','blocked','receives'],
      ['Stream GPS / panic','no','no','yes','no','no'],
      ['Submit a tip','no','no','no','no','no']
    ];
    const label = v => ({yes:'Allowed', no:'—', blocked:'Blocked', backend:'Backend', receives:'Receives'}[v] || v);
    const body = html`
      <div class="cl-legend" style="margin-bottom:12px">
        <span class="green"><i></i>Allowed</span><span><i></i>Backend-gated</span><span class="red"><i></i>Blocked</span>
      </div>
      <div class="cl-authority-wrap">
        <div class="cl-authority-table" role="table" aria-label="Authority matrix">
          <div class="cl-auth-row cl-auth-head" role="row">
            ${['Capability','Admin','Dispatcher','Officer','AI','Camera'].map(x => `<div class="cl-auth-cell" role="columnheader">${x}</div>`).join('')}
          </div>
          ${rows.map(r => `<div class="cl-auth-row" role="row"><div class="cl-auth-cell" role="cell">${r[0]}</div>${r.slice(1).map(v => `<div class="cl-auth-cell" role="cell"><span class="cl-permission ${v}">${label(v)}</span></div>`).join('')}</div>`).join('')}
        </div>
      </div>
      <div class="cl-authority-cards">
        ${simpleNode('H','Human-in-the-loop','Only dispatchers commit dispatch decisions.')}
        ${simpleNode('AI','AI is constrained','The model reports detections, never commands response.')}
        ${simpleNode('BK','Backend-gated control','Camera PTZ/alarm actions run only through protected backend routes.')}
      </div>`;
    return visualShell('authority', 'Access Governance', 'Authority Matrix by actor', body, 'Least privilege');
  }

  function testStructureDiagram(){
    const items = [
      ['Modules/Police/tests/Feature/','dispatcher, incidents, citizen tips, crimes, officers, panic, BOLO','Feature','Critical path'],
      ['Modules/Camera/tests/Feature/','control, recording, scene extraction, tamper, gateway sync','Feature','Evidence'],
      ['Modules/AiModel/tests/Feature/','login, IP/HMAC, encryption, alert-to-incident, heartbeat','Feature','Machine API'],
      ['Modules/Admin/tests/Feature/','stations, AI models, settings, auth, camera health','Feature','Console'],
      ['Modules/Core/tests/Feature/','chat, settings, ledger','Feature','Shared core'],
      ['tests/Browser/','end-to-end smoke flows for React consoles','Browser','Playwright']
    ];
    const body = html`
      <div class="cl-test-summary">
        <div class="cl-test-stat"><strong>884</strong><span>Pest cases</span></div>
        <div class="cl-test-stat"><strong>148</strong><span>Laravel files</span></div>
        <div class="cl-test-stat"><strong>38</strong><span>Flutter files</span></div>
      </div>
      <div class="cl-test-grid">
        ${items.map(([path,desc,a,b]) => `<div class="cl-test-item"><div class="cl-test-path">${path}</div><div class="cl-test-desc">${desc}</div><div class="cl-test-tags"><span>${a}</span><span>${b}</span></div></div>`).join('')}
      </div>`;
    return visualShell('testing-structure', 'Test Suite Structure', 'Where each quality gate lives', body, 'Quality gates');
  }

  function apply(){
    const root = $('#page-root');
    if(!root) return;
    const s = slug();

    // Global visual replacements when matching ASCII diagrams are present.
    replace(findCode(['AI detection', 'Priority Engine scores it']), approachDiagram());
    replace(findCode(['Laravel 13 Modular Monolith', 'PostgreSQL']), architectureDiagram());

    if(s === 'workflow'){
      replace(findCode(['AI Service', 'pending_review', 'escalate']), workflowPipeline());
      replace(findCode(['assigned → accept', 'not_visited']), fieldResponseDiagram());
    }

    if(s === 'dispatch'){
      replace(findCode(['pending_review', 'rejected_false_alarm', 'expired']), dispatchStatusDiagram());
      replace(findCode(['Pending Queue', 'Selected Incident Panel']), dispatcherConsoleDiagram());
    }

    if(s === 'crime-lifecycle'){
      replace(findCode(['assigned ──accept', 'not_visited', 'reassigned']), crimeStatusDiagram());
    }

    if(s === 'actors'){
      replace(findFirstTableAfterHeading('authority-matrix'), authorityMatrix());
    }

    if(s === 'testing'){
      replace(findCode(['Modules/Police/tests/Feature', 'tests/Browser']), testStructureDiagram());
    }
  }

  function schedule(){
    clearTimeout(state.timer);
    state.timer = setTimeout(apply, 35);
  }

  function startObserver(){
    const root = $('#page-root');
    if(!root || state.observer) return;
    state.observer = new MutationObserver(schedule);
    state.observer.observe(root, { childList:true, subtree:true });
  }

  window.addEventListener('hashchange', schedule);
  document.addEventListener('DOMContentLoaded', () => { startObserver(); schedule(); });
  window.addEventListener('load', () => { startObserver(); schedule(); });
  setTimeout(() => { startObserver(); apply(); }, 120);
})();

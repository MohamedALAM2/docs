(() => {
  function enhanceApproachFlow(){
    document.querySelectorAll('.code-card code').forEach(code => {
      const text = (code.textContent || '').replace(/\s+/g, ' ').trim();
      const isTarget = text.includes('AI detection') && text.includes('Incident (pending_review)') && text.includes('Priority Engine scores it');
      if(!isTarget) return;
      const card = code.closest('.code-card');
      if(!card || card.dataset.flowEnhanced === 'true') return;
      card.dataset.flowEnhanced = 'true';
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
      card.replaceWith(flow);
    });
  }

  const scheduleEnhance = () => requestAnimationFrame(() => setTimeout(enhanceApproachFlow, 0));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnhance);
  else scheduleEnhance();
  window.addEventListener('hashchange', scheduleEnhance);
  document.addEventListener('click', event => {
    if(event.target.closest('a[href^="#/docs/"]')) scheduleEnhance();
  }, true);
})();

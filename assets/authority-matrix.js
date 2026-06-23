(() => {
  const matrixRows = [
    ['Configure system / stations', '✅', '—', '—', '—', '—'],
    ['Review & dispatch incidents', '—', '✅', '—', '—', '—'],
    ['Create manual incident', '—', '✅', '—', '—', '—'],
    ['Report detection (alert/crime)', '—', '—', '—', '✅', '—'],
    ['Accept / resolve assigned crime', '—', '—', '✅', '—', '—'],
    ['Command camera (PTZ/alarm)', 'via backend', 'via backend', '—', '❌', 'receives'],
    ['Stream GPS / panic', '—', '—', '✅', '—', '—'],
    ['Submit a tip', '—', '—', '—', '—', '—']
  ];
  const headers = ['Capability', 'Admin', 'Dispatcher', 'Officer', 'AI', 'Camera'];

  function badge(value) {
    const text = String(value).trim();
    let kind = 'none';
    let label = text;
    if (text === '✅') { kind = 'allowed'; label = '✓'; }
    else if (text === '❌') { kind = 'blocked'; label = '×'; }
    else if (text === 'via backend') { kind = 'limited'; label = 'Backend'; }
    else if (text === 'receives') { kind = 'receive'; label = 'Receives'; }
    else if (text === '—') { kind = 'none'; label = '—'; }
    return `<span class="authority-badge ${kind}" title="${text.replace(/"/g, '&quot;')}">${label}</span>`;
  }

  function buildAuthorityMatrix() {
    return `
      <section class="authority-matrix-card" aria-label="CrimeLens authority matrix">
        <div class="authority-matrix-head">
          <div>
            <span class="authority-matrix-kicker">Access Governance</span>
            <h3>Authority Matrix</h3>
            <p>A clean view of who is allowed to act inside CrimeLens. The system keeps operational power split: humans dispatch, officers respond, AI reports, and cameras only receive backend-controlled commands.</p>
          </div>
          <div class="authority-matrix-legend" aria-label="Legend">
            <span class="authority-chip"><i class="authority-dot"></i>Allowed</span>
            <span class="authority-chip"><i class="authority-dot limited"></i>Backend-gated</span>
            <span class="authority-chip"><i class="authority-dot blocked"></i>Blocked</span>
          </div>
        </div>
        <div class="authority-matrix-wrap">
          <table class="authority-matrix-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${matrixRows.map(row => `
                <tr>
                  <td>${row[0]}</td>
                  ${row.slice(1).map(value => `<td>${badge(value)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="authority-insights">
          <div class="authority-insight"><strong>Human-in-the-loop</strong><span>Only dispatchers review and commit incidents into crimes.</span></div>
          <div class="authority-insight"><strong>AI is constrained</strong><span>The model reports detections but cannot dispatch or control cameras.</span></div>
          <div class="authority-insight"><strong>Camera control is gated</strong><span>PTZ and alarms are routed through backend security controls.</span></div>
        </div>
      </section>`;
  }

  function findAuthorityHeading() {
    return [...document.querySelectorAll('.prose h2, .prose h3')]
      .find(h => h.textContent.trim().toLowerCase() === 'authority matrix');
  }

  function removeOldMatrixAfter(heading) {
    let node = heading.nextElementSibling;
    while (node) {
      const next = node.nextElementSibling;
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      const tag = node.tagName;
      const isMatrixTable = tag === 'TABLE' && text.includes('Capability') && text.includes('Dispatcher') && text.includes('Camera');
      const isFlattenedMatrix = text.includes('| Capability | Admin | Dispatcher') ||
        (text.includes('Configure system / stations') && text.includes('Review & dispatch incidents'));
      if (isMatrixTable || isFlattenedMatrix || tag === 'PRE' || tag === 'CODE') {
        node.remove();
        node = next;
        continue;
      }
      if (/^Continue to End-to-End Workflow\.?$/i.test(text)) break;
      if (/^Continue to /i.test(text)) break;
      if (/^h[23]$/i.test(tag)) break;
      if (text.length === 0) {
        node.remove();
        node = next;
        continue;
      }
      break;
    }
  }

  function enhanceAuthorityMatrix() {
    const root = document.querySelector('.prose');
    if (!root || root.querySelector('.authority-matrix-card')) return;
    const heading = findAuthorityHeading();
    if (!heading) return;
    removeOldMatrixAfter(heading);
    heading.insertAdjacentHTML('afterend', buildAuthorityMatrix());
  }

  function scheduleEnhance() {
    requestAnimationFrame(() => setTimeout(enhanceAuthorityMatrix, 20));
  }

  window.addEventListener('hashchange', scheduleEnhance);
  document.addEventListener('DOMContentLoaded', scheduleEnhance);
  scheduleEnhance();
})();

if (!window.__copycatSopMapperLoaded) {
  window.__copycatSopMapperLoaded = true;

  // ── Countdown overlay ──
  function showCountdown() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'copycat-countdown-overlay';
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 2147483647;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: opacity 0.3s;
      `;

      const label = document.createElement('div');
      label.textContent = 'Starting recording in';
      label.style.cssText = 'color: #a5b4fc; font-size: 18px; margin-bottom: 12px; letter-spacing: 0.5px;';

      const number = document.createElement('div');
      number.textContent = '3';
      number.style.cssText = `
        color: #fff; font-size: 96px; font-weight: 800; line-height: 1;
        text-shadow: 0 0 40px rgba(99,102,241,0.6);
        transition: transform 0.2s, opacity 0.2s;
      `;

      overlay.appendChild(label);
      overlay.appendChild(number);
      document.body.appendChild(overlay);

      let count = 3;
      const tick = () => {
        if (count <= 0) {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 300);
          resolve();
          return;
        }
        number.textContent = count;
        number.style.transform = 'scale(1.2)';
        number.style.opacity = '0.5';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            number.style.transform = 'scale(1)';
            number.style.opacity = '1';
          });
        });
        count--;
        setTimeout(tick, 1000);
      };
      tick();
    });
  }

  // ── XPath generator ──
  function getXPath(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return '//*[@id="' + el.id + '"]';

    const parts = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      parts.unshift(current.nodeName.toLowerCase() + '[' + index + ']');
      current = current.parentNode;
    }
    return '/' + parts.join('/');
  }

  function truncate(str, max) {
    if (!str) return '';
    str = str.trim();
    return str.length > max ? str.slice(0, max) + '...' : str;
  }

  // ── Track the last right-clicked element ──
  let lastRightClickedEl = null;

  document.addEventListener('contextmenu', (e) => {
    lastRightClickedEl = e.target;
  }, true);

  // ── XPath Picker Modal ──
  function showXPathModal(el) {
    // Remove existing modal if any
    const existing = document.getElementById('copycat-xpath-modal-overlay');
    if (existing) existing.remove();

    const xpath = getXPath(el);
    const tag = el.tagName.toLowerCase();
    const elText = truncate(el.textContent, 60);
    const elId = el.id || '';
    const elName = el.name || el.getAttribute('name') || '';

    // Auto-detect likely type
    let autoType = 'click';
    if (tag === 'input' || tag === 'textarea') autoType = 'input';
    if (tag === 'select') autoType = 'select';
    if (tag === 'a') autoType = 'click';

    const overlay = document.createElement('div');
    overlay.id = 'copycat-xpath-modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 12px;
      padding: 20px; width: 380px; color: #eee; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="font-size:15px; font-weight:700; color:#a5b4fc;">Save XPath</div>
        <button id="copycat-modal-close" style="
          background:none; border:none; color:#6b7280; font-size:18px; cursor:pointer; padding:0 4px;
        ">&times;</button>
      </div>

      <div style="background:#0f0f1a; border-radius:6px; padding:10px; margin-bottom:12px; font-size:11px;">
        <div style="color:#6b7280; margin-bottom:4px;">Element</div>
        <div style="color:#818cf8; font-family:monospace; word-break:break-all;">&lt;${tag}&gt; ${elText ? '"' + elText + '"' : ''}</div>
        <div style="color:#6b7280; margin-top:6px; margin-bottom:2px;">XPath</div>
        <div style="color:#c4b5fd; font-family:monospace; word-break:break-all; font-size:10px;">${xpath}</div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12px; color:#9ca3af; display:block; margin-bottom:4px;">Type</label>
        <div style="display:flex; gap:6px; flex-wrap:wrap;" id="copycat-type-btns">
          <button data-type="click" style="padding:6px 12px; border-radius:6px; border:1px solid #3b3b5c; background:${autoType === 'click' ? '#6366f1' : '#1e1e36'}; color:#fff; font-size:12px; cursor:pointer;">Click</button>
          <button data-type="input" style="padding:6px 12px; border-radius:6px; border:1px solid #3b3b5c; background:${autoType === 'input' ? '#6366f1' : '#1e1e36'}; color:#fff; font-size:12px; cursor:pointer;">Input</button>
          <button data-type="select" style="padding:6px 12px; border-radius:6px; border:1px solid #3b3b5c; background:${autoType === 'select' ? '#6366f1' : '#1e1e36'}; color:#fff; font-size:12px; cursor:pointer;">Select</button>
          <button data-type="extract" style="padding:6px 12px; border-radius:6px; border:1px solid #3b3b5c; background:#1e1e36; color:#fff; font-size:12px; cursor:pointer;">Extract</button>
          <button data-type="wait" style="padding:6px 12px; border-radius:6px; border:1px solid #3b3b5c; background:#1e1e36; color:#fff; font-size:12px; cursor:pointer;">Wait For</button>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-size:12px; color:#9ca3af; display:block; margin-bottom:4px;">Label</label>
        <input id="copycat-label-input" type="text" placeholder="e.g. Login button, Email field..."
          style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid #3b3b5c;
          background:#0f0f1a; color:#eee; font-size:13px; outline:none; box-sizing:border-box;"
          value=""
        />
      </div>

      <div style="display:flex; gap:8px;">
        <button id="copycat-modal-save" style="
          flex:1; padding:10px; border:none; border-radius:6px;
          background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          font-size:13px; font-weight:600; cursor:pointer;
        ">Save XPath</button>
        <button id="copycat-modal-cancel" style="
          padding:10px 16px; border:1px solid #3b3b5c; border-radius:6px;
          background:#1e1e36; color:#c4b5fd; font-size:13px; cursor:pointer;
        ">Cancel</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // State
    let selectedType = autoType;

    // Type button toggling
    const typeBtns = modal.querySelectorAll('#copycat-type-btns button');
    typeBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedType = btn.dataset.type;
        typeBtns.forEach((b) => {
          b.style.background = b.dataset.type === selectedType ? '#6366f1' : '#1e1e36';
        });
      });
    });

    const labelInput = modal.querySelector('#copycat-label-input');
    labelInput.focus();

    // Auto-suggest label from element
    if (elText && elText.length < 40) {
      labelInput.value = elText;
    } else if (elId) {
      labelInput.value = elId;
    } else if (elName) {
      labelInput.value = elName;
    }
    labelInput.select();

    function closeModal() {
      overlay.remove();
    }

    function saveXPath() {
      const label = labelInput.value.trim() || 'Unlabeled';

      chrome.runtime.sendMessage({
        type: 'USER_INTERACTION',
        data: {
          type: selectedType,
          xpath: xpath,
          label: label,
          tag: tag,
          text: truncate(el.textContent, 100),
          id: el.id || null,
          name: elName || null,
          classes: el.className || null,
          inputType: el.type || null,
          url: location.href,
          timestamp: new Date().toISOString(),
        },
      });

      // Show brief confirmation
      modal.innerHTML = `
        <div style="text-align:center; padding:20px 0;">
          <div style="font-size:28px; margin-bottom:8px;">&#10003;</div>
          <div style="color:#a5b4fc; font-size:14px; font-weight:600;">Saved!</div>
          <div style="color:#6b7280; font-size:12px; margin-top:4px;">${label} (${selectedType})</div>
        </div>
      `;
      setTimeout(closeModal, 800);
    }

    modal.querySelector('#copycat-modal-save').addEventListener('click', (e) => {
      e.stopPropagation();
      saveXPath();
    });
    modal.querySelector('#copycat-modal-cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });
    modal.querySelector('#copycat-modal-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });

    // Enter to save, Escape to close
    labelInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') saveXPath();
      if (e.key === 'Escape') closeModal();
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Stop clicks inside modal from propagating
    modal.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── Message listener ──
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SHOW_COUNTDOWN') {
      showCountdown().then(() => sendResponse({ done: true }));
      return true;
    }
    if (msg.type === 'SAVE_XPATH') {
      if (lastRightClickedEl) {
        showXPathModal(lastRightClickedEl);
      }
      sendResponse({ ok: true });
    }
    if (msg.type === 'TRIGGER_DOWNLOAD') {
      chrome.runtime.sendMessage({ type: 'GET_PENDING_DOWNLOAD' }, (dl) => {
        if (!dl || !dl.json) return;
        const blob = new Blob([dl.json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = dl.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      sendResponse({ ok: true });
    }
  });
}

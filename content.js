// ── XPath generator ──
function getXPath(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';

  // Prefer ID-based short path
  if (el.id) {
    return '//*[@id="' + el.id + '"]';
  }

  const parts = [];
  let current = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;
    while (sibling) {
      if (
        sibling.nodeType === Node.ELEMENT_NODE &&
        sibling.nodeName === current.nodeName
      ) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    const tag = current.nodeName.toLowerCase();
    parts.unshift(tag + '[' + index + ']');
    current = current.parentNode;
  }
  return '/' + parts.join('/');
}

function truncate(str, max) {
  if (!str) return '';
  str = str.trim();
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Click tracking ──
document.addEventListener(
  'click',
  (e) => {
    const el = e.target;
    chrome.runtime.sendMessage({
      type: 'USER_INTERACTION',
      data: {
        type: 'click',
        xpath: getXPath(el),
        tag: el.tagName.toLowerCase(),
        text: truncate(el.textContent, 100),
        id: el.id || null,
        classes: el.className || null,
        url: location.href,
        timestamp: new Date().toISOString(),
      },
    });
  },
  true
);

// ── Input tracking (debounced) ──
const inputTimers = new WeakMap();

document.addEventListener(
  'input',
  (e) => {
    const el = e.target;
    // Debounce — only send after user pauses typing
    if (inputTimers.has(el)) clearTimeout(inputTimers.get(el));
    inputTimers.set(
      el,
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'USER_INTERACTION',
          data: {
            type: 'input',
            xpath: getXPath(el),
            tag: el.tagName.toLowerCase(),
            inputType: el.type || null,
            value: el.value || '',
            id: el.id || null,
            name: el.name || null,
            url: location.href,
            timestamp: new Date().toISOString(),
          },
        });
      }, 500)
    );
  },
  true
);

// ── Select/dropdown tracking ──
document.addEventListener(
  'change',
  (e) => {
    const el = e.target;
    if (el.tagName === 'SELECT') {
      chrome.runtime.sendMessage({
        type: 'USER_INTERACTION',
        data: {
          type: 'select',
          xpath: getXPath(el),
          tag: 'select',
          value: el.value,
          id: el.id || null,
          name: el.name || null,
          url: location.href,
          timestamp: new Date().toISOString(),
        },
      });
    }
  },
  true
);

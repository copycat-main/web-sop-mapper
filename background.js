// ── State ──
let recording = false;
let recordingTabId = null;
let startTime = null;
let networkRequests = [];
let navigations = [];
let interactions = []; // clicks & inputs from content script

// ── Noise filters ──
const NOISE_PATTERNS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /facebook\.com\/tr/,
  /doubleclick\.net/,
  /hotjar\.com/,
  /sentry\.io/,
  /cdn\.segment\.com/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /\.woff2?(\?|$)/,
  /\.ttf(\?|$)/,
  /favicon\.ico/,
  /chrome-extension:\/\//,
];

function isNoise(url) {
  return NOISE_PATTERNS.some((p) => p.test(url));
}

// ── Network capture via webRequest ──
function onBeforeRequest(details) {
  if (!recording) return;
  if (details.tabId !== recordingTabId) return;
  if (isNoise(details.url)) return;

  // Only capture XHR & fetch (xmlhttprequest covers both in webRequest)
  if (details.type !== 'xmlhttprequest') return;

  networkRequests.push({
    _id: details.requestId,
    startedDateTime: new Date().toISOString(),
    url: details.url,
    method: details.method,
    type: details.type,
    requestBody: details.requestBody || null,
    response: null,
    timing: { startTime: Date.now() },
  });
}

function onHeadersReceived(details) {
  if (!recording) return;
  if (details.tabId !== recordingTabId) return;

  const entry = networkRequests.find((r) => r._id === details.requestId);
  if (!entry) return;

  entry.response = {
    status: details.statusCode,
    statusLine: details.statusLine,
    headers: details.responseHeaders || [],
  };
  entry.timing.endTime = Date.now();
  entry.timing.duration = entry.timing.endTime - entry.timing.startTime;
}

function startListeners() {
  chrome.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    { urls: ['<all_urls>'] },
    ['requestBody']
  );
  chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceived,
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );
}

function stopListeners() {
  chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
  chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceived);
}

// ── Tab navigation tracking ──
function onTabUpdated(tabId, changeInfo) {
  if (!recording || tabId !== recordingTabId) return;
  if (changeInfo.url) {
    navigations.push({
      url: changeInfo.url,
      timestamp: new Date().toISOString(),
    });
  }
}

// ── Build HAR ──
function buildHAR() {
  const entries = networkRequests.map((req) => {
    const reqHeaders = [];
    const resHeaders = req.response?.headers || [];
    return {
      startedDateTime: req.startedDateTime,
      time: req.timing.duration || 0,
      request: {
        method: req.method,
        url: req.url,
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: reqHeaders,
        queryString: parseQuery(req.url),
        postData: req.requestBody
          ? {
              mimeType: 'application/json',
              text: JSON.stringify(req.requestBody),
            }
          : undefined,
        headersSize: -1,
        bodySize: -1,
      },
      response: {
        status: req.response?.status || 0,
        statusText: req.response?.statusLine || '',
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: resHeaders.map((h) => ({ name: h.name, value: h.value })),
        content: { size: -1, mimeType: 'application/json' },
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
      },
      cache: {},
      timings: {
        send: 0,
        wait: req.timing.duration || 0,
        receive: 0,
      },
    };
  });

  return {
    log: {
      version: '1.2',
      creator: { name: 'CopyCat SOP Mapper', version: '1.0.0' },
      pages: [
        {
          startedDateTime: startTime,
          id: 'page_1',
          title: 'SOP Recording',
          pageTimings: { onLoad: -1 },
        },
      ],
      entries,
    },
  };
}

function parseQuery(url) {
  try {
    const u = new URL(url);
    return [...u.searchParams].map(([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
}

// ── Build CopyCat Steps ──
function buildCopyCatSteps() {
  // Merge navigations + interactions + network calls into a timeline
  const events = [];

  for (const nav of navigations) {
    events.push({ ts: nav.timestamp, kind: 'nav', data: nav });
  }
  for (const action of interactions) {
    events.push({ ts: action.timestamp, kind: action.type, data: action });
  }
  for (const req of networkRequests) {
    events.push({ ts: req.startedDateTime, kind: 'xhr', data: req });
  }

  events.sort((a, b) => new Date(a.ts) - new Date(b.ts));

  const steps = [];
  let stepIndex = 0;

  for (const evt of events) {
    stepIndex++;
    if (evt.kind === 'nav') {
      steps.push({
        step: stepIndex,
        function: 'go_to_url',
        display_name: 'Go to URL',
        category: 'navigation',
        params: {
          url: evt.data.url,
        },
        timestamp: evt.ts,
      });
    } else if (evt.kind === 'click') {
      steps.push({
        step: stepIndex,
        function: 'click_element',
        display_name: 'Click Element',
        category: 'interaction',
        params: {
          xpath: evt.data.xpath,
        },
        meta: {
          tag: evt.data.tag,
          text: evt.data.text,
          id: evt.data.id,
          classes: evt.data.classes,
          url: evt.data.url,
        },
        timestamp: evt.ts,
      });
    } else if (evt.kind === 'input') {
      steps.push({
        step: stepIndex,
        function: 'input_text',
        display_name: 'Type Text',
        category: 'interaction',
        params: {
          xpath: evt.data.xpath,
          text: evt.data.value,
        },
        meta: {
          tag: evt.data.tag,
          inputType: evt.data.inputType,
          id: evt.data.id,
          name: evt.data.name,
          url: evt.data.url,
        },
        timestamp: evt.ts,
      });
    } else if (evt.kind === 'select') {
      steps.push({
        step: stepIndex,
        function: 'select_dropdown_option',
        display_name: 'Select Dropdown Option',
        category: 'interaction',
        params: {
          xpath: evt.data.xpath,
          option: evt.data.value,
        },
        meta: {
          tag: evt.data.tag,
          id: evt.data.id,
          name: evt.data.name,
          url: evt.data.url,
        },
        timestamp: evt.ts,
      });
    } else if (evt.kind === 'xhr') {
      steps.push({
        step: stepIndex,
        function: 'call_api',
        display_name: 'API Call (observed)',
        category: 'external',
        params: {
          url: evt.data.url,
          method: evt.data.method,
        },
        response: {
          status: evt.data.response?.status || null,
        },
        timestamp: evt.ts,
      });
    }
  }

  return {
    name: 'Recorded SOP',
    created: startTime,
    steps,
  };
}

// ── Message handler ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    sendResponse({
      recording,
      xhrCount: networkRequests.length,
      navCount: navigations.length,
      clickCount: interactions.filter((i) => i.type === 'click').length,
      inputCount: interactions.filter((i) => i.type === 'input' || i.type === 'select').length,
    });
    return true;
  }

  if (msg.type === 'START_RECORDING') {
    // Reset
    networkRequests = [];
    navigations = [];
    interactions = [];
    startTime = new Date().toISOString();
    recording = true;

    // Get the active tab to scope recording
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        recordingTabId = tabs[0].id;
        // Capture initial URL
        navigations.push({
          url: tabs[0].url,
          timestamp: startTime,
        });
        // Inject content script if not already
        chrome.scripting.executeScript({
          target: { tabId: recordingTabId },
          files: ['content.js'],
        }).catch(() => {});
      }
      startListeners();
      chrome.tabs.onUpdated.addListener(onTabUpdated);
      sendResponse({ ok: true });
    });
    return true; // async
  }

  if (msg.type === 'STOP_RECORDING') {
    recording = false;
    stopListeners();
    chrome.tabs.onUpdated.removeListener(onTabUpdated);

    const har = buildHAR();
    const steps = buildCopyCatSteps();

    sendResponse({ har, steps });
    recordingTabId = null;
    return true;
  }

  // Content script forwarding interactions
  if (msg.type === 'USER_INTERACTION' && recording) {
    if (sender.tab && sender.tab.id === recordingTabId) {
      interactions.push(msg.data);
    }
  }
});

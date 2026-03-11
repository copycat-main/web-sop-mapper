const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const dlHar = document.getElementById('dlHar');
const dlXpath = document.getElementById('dlXpath');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const xhrCount = document.getElementById('xhrCount');
const navCount = document.getElementById('navCount');
const xpathCount = document.getElementById('xpathCount');

let lastHar = null;
let lastSteps = null;

function setRecordingUI(isRecording) {
  startBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
  statusDot.className = 'status-dot ' + (isRecording ? 'recording' : 'idle');
  statusText.textContent = isRecording ? 'Recording…' : 'Idle';
  if (isRecording) {
    dlHar.disabled = true;
    dlXpath.disabled = true;
    lastHar = null;
    lastSteps = null;
  }
}

function setDownloadsReady() {
  dlHar.disabled = !lastHar;
  dlXpath.disabled = !lastSteps;
}

function updateStats(stats) {
  xhrCount.textContent = stats.xhrCount || 0;
  navCount.textContent = stats.navCount || 0;
  xpathCount.textContent = stats.xpathCount || 0;
}

function downloadJSON(obj, filename) {
  // Open a new tab with the JSON content that auto-triggers download
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/octet-stream' });
  const reader = new FileReader();
  reader.onload = function () {
    const base64 = reader.result;
    chrome.tabs.create({
      url: base64,
      active: false,
    }, (tab) => {
      // Use chrome.downloads from background
      chrome.runtime.sendMessage({
        type: 'SAVE_FILE',
        base64: reader.result,
        filename: filename,
      });
    });
  };
  reader.readAsDataURL(blob);
}

// Poll state on open
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
  if (res) {
    setRecordingUI(res.recording);
    updateStats(res);
    if (res.hasData) {
      chrome.runtime.sendMessage({ type: 'GET_DATA' }, (data) => {
        if (data) {
          lastHar = data.har;
          lastSteps = data.steps;
          setDownloadsReady();
        }
      });
    }
  }
});

startBtn.addEventListener('click', () => {
  startBtn.disabled = true;
  statusText.textContent = 'Starting…';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.scripting.executeScript(
      { target: { tabId: tabs[0].id }, files: ['content.js'] },
      () => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_COUNTDOWN' }, () => {
          chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (res) => {
            if (res && res.ok) setRecordingUI(true);
          });
        });
      }
    );
  });
});

stopBtn.addEventListener('click', () => {
  stopBtn.disabled = true;
  statusText.textContent = 'Stopped';

  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (res) => {
    if (res && res.har && res.steps) {
      lastHar = res.har;
      lastSteps = res.steps;
      setRecordingUI(false);
      statusText.textContent = 'Ready to download';
      setDownloadsReady();
    }
  });
});

dlHar.addEventListener('click', () => {
  if (!lastHar) return;
  chrome.runtime.sendMessage({
    type: 'SAVE_FILE',
    json: JSON.stringify(lastHar, null, 2),
    filename: 'sop-capture.har',
  });
});

dlXpath.addEventListener('click', () => {
  if (!lastSteps) return;
  chrome.runtime.sendMessage({
    type: 'SAVE_FILE',
    json: JSON.stringify(lastSteps, null, 2),
    filename: 'sop-xpath-steps.json',
  });
});

// Live stats refresh
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
    if (chrome.runtime.lastError) return;
    if (res) {
      if (res.recording) setRecordingUI(true);
      updateStats(res);
    }
  });
}, 1000);

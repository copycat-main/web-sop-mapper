const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const xhrCount = document.getElementById('xhrCount');
const navCount = document.getElementById('navCount');
const clickCount = document.getElementById('clickCount');
const inputCount = document.getElementById('inputCount');

function setRecordingUI(recording) {
  startBtn.disabled = recording;
  stopBtn.disabled = !recording;
  statusDot.className = 'status-dot ' + (recording ? 'recording' : 'idle');
  statusText.textContent = recording ? 'Recording…' : 'Idle';
}

function updateStats(stats) {
  xhrCount.textContent = stats.xhrCount || 0;
  navCount.textContent = stats.navCount || 0;
  clickCount.textContent = stats.clickCount || 0;
  inputCount.textContent = stats.inputCount || 0;
}

// Poll state on open
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
  if (res) {
    setRecordingUI(res.recording);
    updateStats(res);
  }
});

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (res) => {
    if (res && res.ok) setRecordingUI(true);
  });
});

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (res) => {
    if (res && res.har && res.steps) {
      // Download HAR file
      downloadJSON(res.har, 'sop-capture.har');
      // Download CopyCat steps file
      setTimeout(() => downloadJSON(res.steps, 'sop-steps.json'), 300);
      setRecordingUI(false);
      updateStats({ xhrCount: 0, navCount: 0, clickCount: 0, inputCount: 0 });
    }
  });
});

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: true }, () => {
    URL.revokeObjectURL(url);
  });
}

// Live stats refresh
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
    if (chrome.runtime.lastError) return;
    if (res) {
      setRecordingUI(res.recording);
      updateStats(res);
    }
  });
}, 1000);

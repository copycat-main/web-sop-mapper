chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OFFSCREEN_DOWNLOAD') {
    const blob = new Blob([msg.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = msg.filename;
    a.click();
    // Don't revoke immediately — give Chrome time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
});

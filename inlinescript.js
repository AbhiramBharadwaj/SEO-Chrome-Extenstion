document.addEventListener('DOMContentLoaded', () => {
    // Get the current active tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const url = new URL(tabs[0].url);
        const domainName = url.hostname;
        document.getElementById('domainName').textContent = domainName;
      } else {
        document.getElementById('domainName').textContent = 'No active tab';
      }
    });
  });
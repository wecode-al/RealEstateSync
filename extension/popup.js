// Track status for each site
const siteStatuses = {
  'merrjep.al': { pending: true },
  'njoftime.com': { pending: true },
  'gazetacelesi.al': { pending: true },
  'njoftime.al': { pending: true }
};

// Show posting status in popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_STATUS') {
    updateStatus(request.data);
  }
});

function updateStatus(data) {
  const container = document.getElementById('status-container');
  const siteDiv = getSiteDiv(data.site);

  // Update site status
  siteStatuses[data.site] = {
    success: data.success,
    message: data.message,
    pending: false
  };

  // Update UI
  siteDiv.innerHTML = `
    <div class="site-name">${data.site}</div>
    <div class="status ${data.success ? 'success' : 'error'}">
      ${data.message}
    </div>
  `;
}

function getSiteDiv(site) {
  const container = document.getElementById('status-container');
  let siteDiv = document.getElementById(`site-${site}`);

  if (!siteDiv) {
    siteDiv = document.createElement('div');
    siteDiv.id = `site-${site}`;
    siteDiv.className = 'site-status';
    siteDiv.innerHTML = `
      <div class="site-name">${site}</div>
      <div class="status pending">Pending...</div>
    `;
    container.appendChild(siteDiv);
  }

  return siteDiv;
}

// Initialize status display for all sites
document.addEventListener('DOMContentLoaded', () => {
  Object.keys(siteStatuses).forEach(site => {
    getSiteDiv(site);
  });
});
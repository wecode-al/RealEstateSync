// Track status for each site
let siteStatuses = {
  "merrjep.al": { pending: true },
};

// Show posting status in popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup received message:', request);
  if (request.type === "UPDATE_STATUS") {
    updateStatus(request.data);
  }
});

function updateStatus(data) {
  console.log('Updating status:', data);
  const container = document.getElementById("status-container");
  const siteDiv = getSiteDiv(data.site);

  // Update site status
  siteStatuses[data.site] = {
    success: data.success,
    message: data.message,
    pending: false,
  };

  // Update UI with appropriate styling
  let statusClass = data.success ? "success" : "error";
  if (data.message.toLowerCase().includes('opening') || 
      data.message.toLowerCase().includes('starting')) {
    statusClass = "pending";
  }

  // Update UI
  siteDiv.innerHTML = `
    <div class="site-name">${data.site}</div>
    <div class="status ${statusClass}">
      ${data.message}
      ${!data.success && data.message.toLowerCase().includes('log in') ? 
        '<br><small>Please <a href="https://www.merrjep.al/login" target="_blank" style="color: #0066cc; text-decoration: underline;">log in to your Merrjep.al account</a> first.</small>' : 
        ''}
    </div>
  `;
}

function getSiteDiv(site) {
  const container = document.getElementById("status-container");
  let siteDiv = document.getElementById(`site-${site}`);

  if (!siteDiv) {
    siteDiv = document.createElement("div");
    siteDiv.id = `site-${site}`;
    siteDiv.className = "site-status";
    siteDiv.innerHTML = `
      <div class="site-name">${site}</div>
      <div class="status pending">Waiting to start...</div>
    `;
    container.appendChild(siteDiv);
  }

  return siteDiv;
}

// Initialize status display
document.addEventListener("DOMContentLoaded", () => {
  console.log('Popup loaded, initializing status display');
  // Only show Merrjep.al for now
  getSiteDiv('merrjep.al');
});
// Debug logging helper
function log(...args) {
  console.log('[Background]', ...args);
}

// Track content script states
const contentScriptStates = new Map();

// Listen for messages from web app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received message:', request);

  // Handle connection check
  if (request.type === 'CHECK_CONNECTION') {
    log('Connection check received');
    sendResponse({ success: true, message: 'Extension connected' });
    return true;
  }

  // Handle content script ready notification
  if (request.type === 'CONTENT_SCRIPT_READY') {
    log('Content script ready on:', request.url);
    if (sender.tab?.id) {
      contentScriptStates.set(sender.tab.id, {
        url: request.url,
        frameId: request.frameId,
        ready: true,
        timestamp: request.timestamp
      });
    }
    sendResponse({ success: true, message: 'Ready state acknowledged' });
    return true;
  }

  if (request.type === 'POST_PROPERTY') {
    log('Starting property posting process');
    handlePropertyPosting(request.data)
      .then(() => {
        log('Property posting initiated successfully');
      })
      .catch(error => {
        log('Property posting failed:', error);
        // Update popup with error
        chrome.runtime.sendMessage({
          type: 'UPDATE_STATUS',
          data: {
            site: 'merrjep.al',
            success: false,
            message: error.message
          }
        });
      });

    // Send immediate acknowledgment
    sendResponse({ success: true, message: 'Starting property posting...' });
    return true;
  }

  return true;
});

async function pingContentScript(tabId, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, response => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      if (response?.success) {
        return true;
      }
    } catch (error) {
      log(`Ping attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

async function handlePropertyPosting(propertyData) {
  let currentTab = null;
  try {
    const site = {
      name: 'merrjep.al',
      url: 'https://www.merrjep.al/post-new',
      mapping: {
        title: 'input[name="title"]',
        description: 'textarea[name="description"]',
        price: 'input[name="price"]',
        bedrooms: 'select[name="bedrooms"]',
        bathrooms: 'select[name="bathrooms"]',
        squareMeters: 'input[name="surface"]',
        address: 'input[name="location"]',
        images: 'input[type="file"]'
      }
    };

    log('Opening Merrjep.al tab...');
    currentTab = await new Promise((resolve) => {
      chrome.tabs.create({ 
        url: site.url,
        active: true
      }, tab => resolve(tab));
    });

    // Update popup status
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: site.name,
        success: true,
        message: 'Opening Merrjep.al...'
      }
    });

    // Wait and verify content script is ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    const isReady = await pingContentScript(currentTab.id);

    if (!isReady) {
      throw new Error('Failed to initialize content script. Please refresh the page and try again.');
    }

    // Send property data to content script
    log('Sending data to content script:', propertyData);
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Content script took too long to respond'));
      }, 5000);

      chrome.tabs.sendMessage(
        currentTab.id,
        {
          type: 'FILL_FORM',
          data: propertyData,
          mapping: site.mapping
        },
        response => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else if (!response?.success) {
            reject(new Error(response?.error || 'Failed to fill form'));
          } else {
            resolve(response);
          }
        }
      );
    });

    log('Property posting completed successfully');
    return response;

  } catch (error) {
    log('Property posting error:', error);
    if (currentTab?.id) {
      try {
        chrome.tabs.remove(currentTab.id);
      } catch (e) {
        log('Error closing tab:', e);
      }
    }
    throw error;
  }
}

// Clean up content script states when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  contentScriptStates.delete(tabId);
});
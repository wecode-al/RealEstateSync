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
        ready: true,
        timestamp: request.timestamp
      });
    }
    sendResponse({ success: true, message: 'Ready state acknowledged' });
    return true;
  }

  if (request.type === 'POST_PROPERTY') {
    log('Starting property posting process');

    // Send immediate response to acknowledge receipt
    sendResponse({ success: true, message: 'Starting property posting...' });

    // Handle the property posting
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

    // Return true to indicate we'll respond asynchronously
    return true;
  }

  // Return true to indicate we'll respond asynchronously
  return true;
});

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

    // Wait for the page to load completely
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Function to retry sending message to content script
    const sendMessageWithRetry = async (tab, message, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`Attempt ${attempt}: Sending message to content script`);
          const response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, message, response => {
              if (chrome.runtime.lastError) {
                log(`Attempt ${attempt} failed:`, chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
          return response;
        } catch (error) {
          if (attempt === maxRetries) {
            throw error;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    };

    // Check if content script is ready
    const contentState = contentScriptStates.get(currentTab.id);
    if (!contentState?.ready) {
      log('Waiting for content script to be ready...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Send property data to content script with retry
    log('Sending data to content script:', propertyData);
    const response = await sendMessageWithRetry(currentTab, {
      type: 'FILL_FORM',
      data: propertyData,
      mapping: site.mapping
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to fill form');
    }

    // Success!
    log('Property posting completed:', response);
    return response;

  } catch (error) {
    log('Property posting error:', error);
    // If tab is still open, try to close it
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
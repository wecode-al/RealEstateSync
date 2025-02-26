// Debug logging helper
function log(...args) {
  console.log('[Background]', ...args);
}

// Listen for messages from web app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received message:', request);

  // Handle connection check
  if (request.type === 'CHECK_CONNECTION') {
    log('Connection check received');
    sendResponse({ success: true, message: 'Extension connected' });
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

    return true; // Keep message channel open
  }

  // Return true to indicate we'll respond asynchronously
  return true;
});

async function handlePropertyPosting(propertyData) {
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

  try {
    log('Opening Merrjep.al tab...');
    const tab = await chrome.tabs.create({ 
      url: site.url,
      active: true
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

    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send property data to content script
    log('Sending data to content script:', propertyData);
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_FORM',
      data: propertyData,
      mapping: site.mapping
    });

    // If we get here without an error, the form was filled successfully
    log('Property posting completed:', response);
    return response;

  } catch (error) {
    log('Property posting error:', error);
    throw error;
  }
}
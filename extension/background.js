// Listen for external messages from web app
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('Background script received external message:', request);

  if (request.type === 'POST_PROPERTY') {
    console.log('Starting property posting process');
    handlePropertyPosting(request.data)
      .then(() => {
        console.log('Property posting initiated successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Property posting failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Listen for internal messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received internal message:', request);

  if (request.type === 'UPDATE_STATUS') {
    // Forward status updates to popup
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: request.data
    });
    sendResponse({ success: true });
  }

  return true; // Keep message channel open
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
    console.log('Opening Merrjep.al tab...');
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
    console.log('Sending data to content script:', propertyData);
    return await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_FORM',
      data: propertyData,
      mapping: site.mapping
    });

  } catch (error) {
    console.error('Property posting error:', error);
    throw error;
  }
}
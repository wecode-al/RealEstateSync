// Listen for messages from the web app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.type === 'CHECK_EXTENSION') {
    console.log('Sending CHECK_EXTENSION response');
    sendResponse({ success: true });
    return true;
  }

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
    return true;
  }
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
    // Create new tab for posting
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
    await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_FORM',
      data: propertyData,
      mapping: site.mapping
    });

  } catch (error) {
    console.error('Property posting error:', error);
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: site.name,
        success: false,
        message: `Error: ${error.message}`
      }
    });
    throw error;
  }
}
// Handle communication between our app and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'POST_PROPERTY') {
    handlePropertyPosting(request.data);
    // Send immediate response to acknowledge receipt
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'CHECK_EXTENSION') {
    // Immediately respond to extension check
    sendResponse({ success: true });
    return true;
  }
});

async function handlePropertyPosting(propertyData) {
  // For testing, only handle Merrjep.al first
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
    console.log('Starting property posting to Merrjep.al');

    // Create new tab for posting
    const tab = await chrome.tabs.create({ 
      url: site.url, 
      active: true  // Set to true for testing to see what happens
    });

    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send property data to content script
    console.log('Sending data to content script:', propertyData);
    await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_FORM',
      data: propertyData,
      mapping: site.mapping
    });

    // Update popup with status
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: site.name,
        success: true,
        message: `Successfully started posting to ${site.name}`
      }
    });
  } catch (error) {
    console.error(`Failed to post to ${site.name}:`, error);
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: site.name,
        success: false,
        message: `Failed to post to ${site.name}: ${error.message}`
      }
    });
  }
}
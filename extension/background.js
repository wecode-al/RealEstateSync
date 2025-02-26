// Handle communication between our app and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'POST_PROPERTY') {
    handlePropertyPosting(request.data, sender.tab.id);
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

async function handlePropertyPosting(propertyData, tabId) {
  const sites = {
    'merrjep.al': {
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
    },
    'njoftime.com': {
      url: 'https://www.njoftime.com/shto-njoftim',
      mapping: {
        title: '#title',
        description: '#description',
        price: '#price',
        bedrooms: 'select[name="dhoma"]',
        bathrooms: 'select[name="tualete"]',
        squareMeters: '#siperfaqja',
        address: '#address',
        images: 'input[name="photos[]"]'
      }
    },
    'gazetacelesi.al': {
      url: 'https://gazetacelesi.al/shto-pronesi',
      mapping: {
        title: 'input[name="property_title"]',
        description: 'textarea[name="property_description"]',
        price: 'input[name="property_price"]',
        bedrooms: 'select[name="property_bedrooms"]',
        bathrooms: 'select[name="property_bathrooms"]',
        squareMeters: 'input[name="property_size"]',
        address: 'input[name="property_address"]',
        images: 'input[name="property_images[]"]'
      }
    },
    'njoftime.al': {
      url: 'https://www.njoftime.al/posto',
      mapping: {
        title: '#ad_title',
        description: '#ad_description',
        price: '#ad_price',
        bedrooms: 'select[name="bedrooms"]',
        bathrooms: 'select[name="bathrooms"]',
        squareMeters: '#ad_size',
        address: '#ad_location',
        images: 'input[type="file"][multiple]'
      }
    }
  };

  for (const [site, config] of Object.entries(sites)) {
    try {
      // Create new tab for posting
      const tab = await chrome.tabs.create({ url: config.url, active: false });

      // Send property data to content script
      await chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FORM',
        data: propertyData,
        mapping: config.mapping
      });

      // Update popup with status
      chrome.runtime.sendMessage({
        type: 'UPDATE_STATUS',
        data: {
          site,
          success: true,
          message: `Successfully posted to ${site}`
        }
      });
    } catch (error) {
      console.error(`Failed to post to ${site}:`, error);
      chrome.runtime.sendMessage({
        type: 'UPDATE_STATUS',
        data: {
          site,
          success: false,
          message: `Failed to post to ${site}: ${error.message}`
        }
      });
    }
  }
}
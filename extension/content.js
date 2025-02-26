// Handle form filling on listing sites
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FILL_FORM') {
    console.log('Received FILL_FORM message:', request);
    fillForm(request.data, request.mapping);
    return true;
  }
});

async function fillForm(propertyData, mapping) {
  try {
    console.log('Starting to fill form with data:', propertyData);
    console.log('Using field mapping:', mapping);

    // Wait for form to load
    const firstSelector = Object.values(mapping)[0];
    console.log('Waiting for form element:', firstSelector);
    await waitForElement(firstSelector);
    console.log('Form element found, proceeding to fill fields');

    // Fill each field
    for (const [field, selector] of Object.entries(mapping)) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element not found for selector: ${selector}`);
        continue;
      }

      console.log(`Filling field "${field}" with selector "${selector}"`);
      console.log('Element found:', element.tagName, element.type);

      if (element.tagName === 'SELECT') {
        // Handle select elements
        const value = propertyData[field]?.toString();
        console.log('Handling SELECT element with value:', value);
        const option = Array.from(element.options)
          .find(opt => opt.text.toLowerCase().includes(value.toLowerCase()));
        if (option) {
          element.value = option.value;
          console.log('Selected option:', option.text);
        } else {
          console.warn('No matching option found for:', value);
        }
      } else if (element.tagName === 'TEXTAREA') {
        // Handle textareas
        console.log('Handling TEXTAREA');
        element.value = propertyData[field];
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
      } else if (element.type === 'file' && propertyData.images?.length) {
        // Handle image uploads
        console.log('Found file input, images:', propertyData.images);
        // For now, just log that we found the image field
        console.log('Image upload field found:', selector);
      } else {
        // Handle regular inputs
        console.log('Handling regular input');
        element.value = propertyData[field];
      }

      // Trigger change event to activate any site-specific scripts
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      console.log(`Field "${field}" filled successfully`);
    }

    console.log('Form filled successfully');
    // Let the extension know we're done
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: 'merrjep.al',
        success: true,
        message: 'Form filled successfully'
      }
    });
  } catch (error) {
    console.error('Error filling form:', error);
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: 'merrjep.al',
        success: false,
        message: `Error filling form: ${error.message}`
      }
    });
    throw error;
  }
}

function waitForElement(selector) {
  console.log('Waiting for element:', selector);
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      console.log('Element found immediately:', selector);
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        console.log('Element found after waiting:', selector);
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    // Start observing with a timeout
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Add timeout to avoid infinite waiting
    setTimeout(() => {
      observer.disconnect();
      console.error('Timeout waiting for element:', selector);
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, 30000);
  });
}

// Helper function to handle image uploads when needed
async function handleImageUpload(input, imageUrls) {
  // This would need to be implemented based on how you want to handle image uploads
  // For example, you might need to download images first and then upload them
  console.log('Image upload handling needed for:', imageUrls);
}
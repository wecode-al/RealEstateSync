// Handle form filling on listing sites
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FILL_FORM') {
    fillForm(request.data, request.mapping);
    return true;
  }
});

async function fillForm(propertyData, mapping) {
  try {
    // Wait for form to load
    await waitForElement(Object.values(mapping)[0]);
    console.log('Form loaded, starting to fill fields');

    // Fill each field
    for (const [field, selector] of Object.entries(mapping)) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element not found for selector: ${selector}`);
        continue;
      }

      if (element.tagName === 'SELECT') {
        // Handle select elements
        const value = propertyData[field]?.toString();
        const option = Array.from(element.options)
          .find(opt => opt.text.toLowerCase().includes(value.toLowerCase()));
        if (option) {
          element.value = option.value;
        }
      } else if (element.tagName === 'TEXTAREA') {
        // Handle textareas
        element.value = propertyData[field];
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
      } else if (element.type === 'file' && propertyData.images?.length) {
        // Handle image uploads
        // Note: This needs to be handled differently as we can't directly set file input values
        console.log('Image upload field found:', selector);
      } else {
        // Handle regular inputs
        element.value = propertyData[field];
      }

      // Trigger change event to activate any site-specific scripts
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    console.log('Form filled successfully');
  } catch (error) {
    console.error('Error filling form:', error);
    throw error;
  }
}

function waitForElement(selector) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
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
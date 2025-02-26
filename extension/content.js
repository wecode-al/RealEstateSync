// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.type === 'FILL_FORM') {
    fillForm(request.data, request.mapping)
      .then(() => {
        console.log('Form filled successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Form filling failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function fillForm(propertyData, mapping) {
  try {
    console.log('Starting to fill form with:', propertyData);

    // Wait for form to load
    const firstField = await waitForElement(Object.values(mapping)[0]);
    console.log('Form loaded, starting to fill fields');

    // Fill each field
    for (const [field, selector] of Object.entries(mapping)) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element not found: ${selector}`);
        continue;
      }

      console.log(`Filling ${field} using ${selector}`);

      if (element.tagName === 'SELECT') {
        const value = propertyData[field]?.toString();
        const option = Array.from(element.options)
          .find(opt => opt.text.toLowerCase().includes(value.toLowerCase()));

        if (option) {
          element.value = option.value;
          console.log(`Selected option: ${option.text}`);
        }
      } else if (element.tagName === 'TEXTAREA') {
        element.value = propertyData[field];
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
      } else if (element.type === 'file') {
        // Skip file inputs for now
        console.log('Skipping file input:', selector);
      } else {
        element.value = propertyData[field];
      }

      // Trigger events
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Update status
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: 'merrjep.al',
        success: true,
        message: 'Form filled successfully!'
      }
    });

  } catch (error) {
    console.error('Error filling form:', error);
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      data: {
        site: 'merrjep.al',
        success: false,
        message: `Error: ${error.message}`
      }
    });
    throw error;
  }
}

function waitForElement(selector) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Add timeout
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, 30000);
  });
}
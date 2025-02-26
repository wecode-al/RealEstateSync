// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.type === 'FILL_FORM') {
    checkLoginStatus()
      .then(isLoggedIn => {
        if (!isLoggedIn) {
          throw new Error('Please log in to Merrjep.al first before publishing');
        }
        return fillForm(request.data, request.mapping);
      })
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

async function checkLoginStatus() {
  try {
    // First check for user-related elements in the DOM
    const profileElements = document.querySelectorAll('.my-profile, .user-menu, .logout-button');
    const hasProfileElements = profileElements.length > 0;

    if (hasProfileElements) {
      console.log('Found profile elements, user appears to be logged in');
      return true;
    }

    // Check if we're on a login/auth page
    if (window.location.href.includes('login') || window.location.href.includes('auth')) {
      console.log('On login page, user is not logged in');
      throw new Error('Please log in first at www.merrjep.al/login before trying to publish');
    }

    // Check for authentication-related cookies
    const authRelatedCookies = document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith('pazarwebcookie=') || 
      cookie.trim().startsWith('VisitorTest1=')
    );

    if (!authRelatedCookies) {
      console.log('No auth cookies found, user appears to be logged out');
      throw new Error('You need to be logged in to Merrjep.al to publish properties. Please log in first at www.merrjep.al/login');
    }

    return true;
  } catch (error) {
    console.error('Error checking login status:', error);
    throw error;
  }
}

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
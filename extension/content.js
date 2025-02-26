// Handle messages from background script
let isInitialized = false;

function initialize() {
  if (isInitialized) return;
  console.log('[Content] Initializing content script on:', window.location.href);

  // Notify background script that frame is ready
  function notifyReady() {
    chrome.runtime.sendMessage({ 
      type: 'CONTENT_SCRIPT_READY',
      url: window.location.href,
      frameId: window?.frameElement?.id || 'main',
      timestamp: Date.now()
    }).catch(err => {
      console.warn('[Content] Failed to notify ready state:', err);
    });
  }

  // Try to notify immediately and also after a short delay
  notifyReady();
  setTimeout(notifyReady, 500);
  setTimeout(notifyReady, 1500); // Extra retry

  isInitialized = true;
}

// Initialize both on DOMContentLoaded and immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Handle extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content] Received message:', request);

  // Always respond immediately to keep the port open
  const respond = (response) => {
    try {
      sendResponse(response);
    } catch (err) {
      console.error('[Content] Failed to send response:', err);
    }
  };

  if (request.type === 'PING') {
    respond({ success: true, frameReady: true });
    return true;
  }

  if (request.type === 'FILL_FORM') {
    checkLoginStatus()
      .then(isLoggedIn => {
        if (!isLoggedIn) {
          throw new Error('Please log in to Merrjep.al first before publishing');
        }
        return fillForm(request.data, request.mapping);
      })
      .then(() => {
        console.log('[Content] Form filled successfully');
        respond({ success: true });
      })
      .catch(error => {
        console.error('[Content] Form filling failed:', error);
        respond({ success: false, error: error.message });
      });
    return true;
  }

  // Return true to keep message channel open
  return true;
});

async function checkLoginStatus() {
  try {
    // First check for user-related elements in the DOM
    const profileElements = document.querySelectorAll('.my-profile, .user-menu, .logout-button');
    const hasProfileElements = profileElements.length > 0;

    if (hasProfileElements) {
      console.log('[Content] Found profile elements, user appears to be logged in');
      return true;
    }

    // Check if we're on a login/auth page
    if (window.location.href.includes('login') || window.location.href.includes('auth')) {
      console.log('[Content] On login page, user is not logged in');
      throw new Error('Please log in first at www.merrjep.al/login before trying to publish');
    }

    // Check for authentication-related cookies
    const authRelatedCookies = document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith('pazarwebcookie=') || 
      cookie.trim().startsWith('VisitorTest1=')
    );

    if (!authRelatedCookies) {
      console.log('[Content] No auth cookies found, user appears to be logged out');
      throw new Error('You need to be logged in to Merrjep.al to publish properties. Please log in first at www.merrjep.al/login');
    }

    return true;
  } catch (error) {
    console.error('[Content] Error checking login status:', error);
    throw error;
  }
}

async function fillForm(propertyData, mapping) {
  try {
    console.log('[Content] Starting to fill form with:', propertyData);

    // Wait for form to load
    const firstField = await waitForElement(Object.values(mapping)[0], 'First form field');
    console.log('[Content] Form loaded, starting to fill fields');

    // Fill each field
    for (const [field, selector] of Object.entries(mapping)) {
      const element = await waitForElement(selector, `Form field ${field}`);
      if (!element) {
        console.warn(`[Content] Element not found: ${selector}`);
        continue;
      }

      console.log(`[Content] Filling ${field} using ${selector}`);

      if (element.tagName === 'SELECT') {
        const value = propertyData[field]?.toString();
        const option = Array.from(element.options)
          .find(opt => opt.text.toLowerCase().includes(value.toLowerCase()));

        if (option) {
          element.value = option.value;
          console.log(`[Content] Selected option: ${option.text}`);
        }
      } else if (element.tagName === 'TEXTAREA') {
        element.value = propertyData[field];
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
      } else if (element.type === 'file') {
        // Skip file inputs for now
        console.log('[Content] Skipping file input:', selector);
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
    console.error('[Content] Error filling form:', error);
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

function waitForElement(selector: string, elementName: string) {
  console.log(`[Content] Waiting for ${elementName} (${selector})`);
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`[Content] Found ${elementName} immediately`);
      return resolve(element);
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`[Content] Found ${elementName} after waiting`);
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
      console.error(`[Content] Timeout waiting for ${elementName}`);
      reject(new Error(`Timeout waiting for ${selector}`));
    }, 30000);
  });
}
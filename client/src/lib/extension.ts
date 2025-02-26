// Communication with Chrome extension
export async function postToLocalSites(property: any) {
  try {
    console.log('Starting extension communication process...');

    // First check if we're in Chrome
    const isChrome = /Chrome/.test(navigator.userAgent);
    console.log('Browser check:', { 
      isChrome, 
      userAgent: navigator.userAgent,
      location: window.location.href
    });

    if (!isChrome) {
      throw new Error('Please use Google Chrome browser to use this feature.');
    }

    // Then check if extension API is available
    const hasExtensionApi = typeof chrome !== 'undefined' && !!chrome.runtime;
    console.log('Extension API check:', { hasExtensionApi });

    if (!hasExtensionApi) {
      throw new Error('Chrome extension not detected. Please install the extension and refresh the page.');
    }

    // Check if extension is accessible
    console.log('Testing extension accessibility...');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Extension not responding. Please check if the extension is enabled in chrome://extensions'));
      }, 3000);

      try {
        chrome.runtime.sendMessage(
          { 
            type: 'CHECK_CONNECTION',
            source: 'replit-app',
            timestamp: Date.now()
          },
          response => {
            clearTimeout(timeout);
            console.log('Extension response:', response);

            if (chrome.runtime.lastError) {
              console.error('Extension error:', chrome.runtime.lastError);
              reject(new Error('Extension not found. Please make sure it is installed correctly in chrome://extensions'));
              return;
            }

            if (!response?.success) {
              reject(new Error('Extension not working properly. Please try reinstalling it from the extension folder.'));
              return;
            }

            resolve(response);
          }
        );
      } catch (err) {
        clearTimeout(timeout);
        console.error('Extension connection error:', err);
        reject(new Error('Failed to connect to extension. Please check chrome://extensions to ensure it is enabled.'));
      }
    });

    // If we got here, extension is working. Now send the property data
    console.log('Extension connected, sending property data...');
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Extension took too long to respond. Please refresh the page and try again.'));
      }, 5000);

      try {
        chrome.runtime.sendMessage(
          {
            type: 'POST_PROPERTY',
            data: property,
            source: 'replit-app',
            timestamp: Date.now()
          },
          response => {
            clearTimeout(timeout);
            console.log('Property posting response:', response);

            if (chrome.runtime.lastError) {
              console.error('Property posting error:', chrome.runtime.lastError);
              reject(new Error('Failed to send data to extension. Please check chrome://extensions and ensure it is enabled.'));
              return;
            }

            if (response?.success) {
              resolve(response);
            } else {
              const errorMsg = response?.error || 'Failed to start posting';
              if (errorMsg.toLowerCase().includes('log in')) {
                reject(new Error('You need to log in to Merrjep.al first. Please open https://www.merrjep.al/login to log in, then try again.'));
              } else {
                reject(new Error(`${errorMsg}. Please make sure the extension is properly installed.`));
              }
            }
          }
        );
      } catch (err) {
        clearTimeout(timeout);
        console.error('Property posting error:', err);
        reject(new Error('Failed to communicate with extension. Please check if it is enabled in chrome://extensions'));
      }
    });

  } catch (error) {
    console.error('Extension operation failed:', error);
    throw error;
  }
}

// Type declarations for window.chrome
declare global {
  interface Window {
    chrome?: {
      runtime: {
        sendMessage: (message: any, callback: (response: any) => void) => void;
        lastError?: { message: string };
      };
    };
  }
}
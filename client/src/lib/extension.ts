// Communication with Chrome extension
export async function postToLocalSites(property: any) {
  try {
    console.log('Checking Chrome extension availability...');

    // First check if Chrome runtime exists
    if (typeof chrome === 'undefined') {
      console.error('Chrome object not found');
      throw new Error('Please use Google Chrome browser');
    }

    if (!chrome.runtime) {
      console.error('Chrome runtime not found');
      throw new Error('Chrome extension not installed. Please install the extension first.');
    }

    console.log('Chrome extension is available');

    // Now send the actual property data
    console.log('Sending property data to extension:', property);
    return new Promise((resolve, reject) => {
      try {
        // Send message directly using runtime.sendMessage
        chrome.runtime.sendMessage(
          {
            type: 'POST_PROPERTY',
            data: property
          },
          response => {
            // Check for runtime errors first
            if (chrome.runtime.lastError) {
              console.error('Chrome extension error:', chrome.runtime.lastError);
              reject(new Error('Failed to communicate with extension. Please refresh the page and try again.'));
              return;
            }

            console.log('Extension response:', response);
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Failed to start posting. Please make sure you are logged into Merrjep.al'));
            }
          }
        );
      } catch (err) {
        console.error('Error sending message to extension:', err);
        reject(new Error('Failed to communicate with extension. Please refresh the page and try again.'));
      }
    });

  } catch (error) {
    console.error('Extension error:', error);
    throw error;
  }
}

// Add type declaration for window.chrome
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
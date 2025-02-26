// Communication with Chrome extension
export async function postToLocalSites(property: any) {
  try {
    console.log('Checking Chrome extension availability...');

    // Check Chrome runtime exists
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('Chrome runtime not found');
      throw new Error('Chrome extension not installed. Please install the extension first and refresh this page.');
    }

    // Now send the property data
    return new Promise((resolve, reject) => {
      try {
        // Send message through runtime
        chrome.runtime.sendMessage(
          {
            type: 'POST_PROPERTY',
            data: property,
            origin: window.location.origin
          },
          response => {
            if (chrome.runtime.lastError) {
              console.error('Chrome extension error:', chrome.runtime.lastError);
              reject(new Error('Failed to communicate with extension. Please refresh this page and try again.'));
              return;
            }

            console.log('Extension response:', response);
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Failed to start posting process. Please make sure you are logged into Merrjep.al'));
            }
          }
        );
      } catch (err) {
        console.error('Error sending message to extension:', err);
        reject(new Error('Failed to communicate with extension. Please refresh this page and try again.'));
      }
    });

  } catch (error) {
    console.error('Extension error:', error);
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
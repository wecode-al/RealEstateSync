// Communication with Chrome extension
export async function postToLocalSites(property: any) {
  try {
    console.log('Attempting to communicate with extension...');

    // Extract the extension ID from the URL if available
    const extensionId = window.location.hash.slice(1) || 'Albanian Property Poster';
    console.log('Using extension ID:', extensionId);

    // First check if extension is installed and working
    await new Promise((resolve, reject) => {
      if (!window.chrome?.runtime) {
        reject(new Error('Chrome extension not installed'));
        return;
      }

      // Try to send a test message first
      chrome.runtime.sendMessage(
        extensionId,
        { type: 'TEST_CONNECTION' },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Extension test failed:', chrome.runtime.lastError);
            reject(new Error('Failed to connect to extension. Please reinstall the extension.'));
            return;
          }
          resolve(response);
        }
      );
    });

    // Now send the actual property data
    console.log('Sending property data to extension:', property);
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        extensionId,
        {
          type: 'POST_PROPERTY',
          data: property
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Chrome extension error:', chrome.runtime.lastError);
            reject(new Error('Failed to send data to extension. Please make sure the extension is installed correctly.'));
            return;
          }

          console.log('Extension response:', response);
          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to start posting. Make sure you are logged into Merrjep.al'));
          }
        }
      );
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
        sendMessage: (id: string, message: any, callback: (response: any) => void) => void;
        lastError?: { message: string };
      };
    };
  }
}
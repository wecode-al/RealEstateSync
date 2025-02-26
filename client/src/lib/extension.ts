export async function postToLocalSites(property: any) {
  try {
    // Check if extension is installed
    if (!window.chrome?.runtime) {
      throw new Error('Chrome extension not installed. Please install the extension first.');
    }

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'POST_PROPERTY',
          data: property
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Chrome extension error:', chrome.runtime.lastError);
            reject(new Error('Failed to communicate with extension. Try reinstalling the extension.'));
            return;
          }

          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to start publishing. Make sure you are logged into Merrjep.al'));
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
        sendMessage: (message: any, callback: (response: any) => void) => void;
        lastError?: { message: string };
      };
    };
  }
}
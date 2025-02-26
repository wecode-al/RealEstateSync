// Helper to communicate with the Chrome extension
export async function postToLocalSites(property: any) {
  try {
    // Check if extension is installed
    if (!window.chrome?.runtime) {
      throw new Error('Chrome extension not installed');
    }

    // Try to send a message to the extension to verify it's working
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'POST_PROPERTY',
          data: property
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Chrome extension error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          console.log('Extension response:', response);
          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to communicate with extension'));
          }
        }
      );
    });
  } catch (error) {
    console.error('Extension error:', error);
    throw error;
  }
}

// Helper to check if extension is installed and working
export async function checkExtension(): Promise<boolean> {
  try {
    console.log('Checking for Chrome extension...');

    if (!window.chrome?.runtime) {
      console.log('Chrome runtime not found');
      return false;
    }

    return new Promise((resolve) => {
      console.log('Sending CHECK_EXTENSION message...');
      chrome.runtime.sendMessage(
        { type: 'CHECK_EXTENSION' },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Chrome extension check error:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          console.log('Extension check response:', response);
          resolve(!!response?.success);
        }
      );
    });
  } catch (error) {
    console.error('Extension check error:', error);
    return false;
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
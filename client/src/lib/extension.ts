// Communication with Chrome extension
export async function postToLocalSites(property: any) {
  try {
    console.log('Attempting to communicate with extension...');

    // First check if Chrome runtime exists
    if (!window.chrome?.runtime) {
      console.error('Chrome runtime not found');
      throw new Error('Chrome extension not installed. Please install the extension first.');
    }

    // Try to send message to the extension
    return await new Promise((resolve, reject) => {
      // Chrome extensions can receive messages without specifying an ID when using externally_connectable
      chrome.runtime.sendMessage(
        {
          type: 'POST_PROPERTY',
          data: property
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Chrome extension error:', chrome.runtime.lastError);
            reject(new Error('Failed to communicate with extension. Please reload the extension.'));
            return;
          }

          console.log('Extension response:', response);
          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to communicate with extension. Please make sure you are logged into Merrjep.al'));
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
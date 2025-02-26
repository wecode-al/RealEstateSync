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
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

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
    if (!window.chrome?.runtime) {
      return false;
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'CHECK_EXTENSION' },
        response => {
          if (chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(true);
        }
      );
    });
  } catch {
    return false;
  }
}
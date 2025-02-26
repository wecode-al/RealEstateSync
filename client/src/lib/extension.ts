// Helper to communicate with the Chrome extension
export async function postToLocalSites(property: any) {
  return new Promise((resolve, reject) => {
    // Check if extension is installed
    if (!window.chrome?.runtime) {
      reject(new Error('Chrome extension not installed'));
      return;
    }

    // Send property data to extension
    chrome.runtime.sendMessage(
      {
        type: 'POST_PROPERTY',
        data: property
      },
      response => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

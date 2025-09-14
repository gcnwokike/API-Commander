// Function to create the context menu item
function createContextMenuItem() {
  chrome.contextMenus.create({
    id: "openApiCommander", // A unique ID for your menu item
    title: "Open API Commander", // The text that appears in the context menu
    contexts: ["page", "selection", "link"], // Where the menu item will appear:
  });

  // You can also add sub-menus
}

// Create the context menu item when the extension is installed or updated
// It's crucial to create context menus only once, typically on `onInstalled`
chrome.runtime.onInstalled.addListener(() => {
  createContextMenuItem();
});

// Listener for when a context menu item is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openApiCommander") {
    // --- Option 1: Open the extension's popup in a new tab/window ---
    // You cannot programmatically open the default_popup of the action button.
    // Instead, you open it as a new tab or a new pop-up window.

    const popupUrl = chrome.runtime.getURL("index.html"); // Your popup HTML file
    chrome.tabs.create({ url: popupUrl });
  }
  // Add more `else if` conditions for other menu items as needed
});

// Optional: If your service worker is idle, it might suspend.
// To ensure context menus are always recreated if it restarts, you can also
// add a listener for `chrome.runtime.onStartup`. However, `onInstalled` is
// generally sufficient as Chrome keeps context menus registered.
/*
chrome.runtime.onStartup.addListener(() => {
  // Clear existing context menus to avoid duplicates if you're frequently
  // modifying them. For static menus, onInstalled is enough.
  chrome.contextMenus.removeAll(() => {
    createContextMenuItem();
  });
});
*/

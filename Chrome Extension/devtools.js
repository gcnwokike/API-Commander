chrome.devtools.panels.create(
  "API Commander", // Title of the panel
  "icon.png", // Icon for the panel (optional)
  "panel.html", // The HTML file for your panel's content
  function (panel) {
    // Code to run after the panel is created
    console.log("My custom DevTools panel created!");
  }
);

console.log("Kuviyam Background Script Loaded");

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("Kuviyam installed");
});

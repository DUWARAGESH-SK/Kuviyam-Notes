import { storage } from './utils/storage';
import type { NoteDraft } from './types';

console.log("Kuviyam Background Script Loaded");

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "save-to-kuviyam",
        title: "Save to Kuviyam",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-to-kuviyam" && info.selectionText) {
        const draft: NoteDraft = {
            title: tab?.title || "Clipped Note",
            content: info.selectionText,
            tags: ["clipped"],
            url: tab?.url,
            domain: tab?.url ? new URL(tab.url).hostname : undefined,
            pinned: false
        };

        try {
            await storage.createNote(draft);
            chrome.action.setBadgeText({ text: "OK" });
            setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
        } catch (err) {
            console.error("Failed to save note", err);
        }
    }
});

// ✅ KEYBOARD SHORTCUT HANDLER
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-panel") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId) {
                // Check if we can sendMessage (skip restricted pages check here, let content script handle or fail silently)
                chrome.tabs.sendMessage(tabId, {
                    type: "KUV_TOGGLE_PANEL"
                }).catch(() => {
                    // Content script might not be loaded on this tab (e.g. edge://)
                    console.log("Could not send toggle command to tab", tabId);
                });
            }
        });
    }
});

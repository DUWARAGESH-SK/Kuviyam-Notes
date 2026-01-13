import { storage } from './utils/storage';
import { NoteDraft } from './types';

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
            // Optional: Notify user
            chrome.action.setBadgeText({ text: "OK" });
            setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
        } catch (err) {
            console.error("Failed to save note", err);
        }
    }
});

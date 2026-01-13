import { createRoot } from 'react-dom/client';
import type { Note, NoteDraft, PanelLayout } from './types';
import { storage } from './utils/storage';
import { FloatingPanel } from './components/FloatingPanel';

// Create container for floating notes
const container = document.createElement('div');
container.id = 'kuviyam-root';
document.body.appendChild(container);

// Use Shadow DOM to isolate styles
const shadowRoot = container.attachShadow({ mode: 'open' });
const root = createRoot(shadowRoot);

// Inject styles manually since we are in Shadow DOM and might miss global styles
const style = document.createElement('style');
style.textContent = `
  :host { font-family: sans-serif; }
  * { box-sizing: border-box; }
`;
shadowRoot.appendChild(style);

// Inject Tailwind styles (rudimentary approach for content script)
// In a real prod env, we'd import the css file as string, but for MVP we rely on component inline styles + basic defaults.

async function init() {
    // 1. Get Layout
    const layout = await storage.getPanelLayout();

    // 2. Get Global Scratchpad Note (or create one)
    const notes = await storage.getNotes();
    let scratchpad = notes.find(n => n.id === 'global-scratchpad');

    if (!scratchpad) {
        // Create it seamlessly
        scratchpad = await storage.createNote({
            title: 'Global Scratchpad',
            content: '',
            tags: ['scratchpad'],
            pinned: true
        });
        // Hack: force ID to be constant for easy retrieval
        scratchpad.id = 'global-scratchpad';
        await storage.saveNote(scratchpad);
    }

    renderPanel(layout, scratchpad);
}

function renderPanel(layout: PanelLayout, note: Note) {
    // Re-render function
    const handleLayoutChange = async (newLayout: PanelLayout) => {
        await storage.savePanelLayout(newLayout);
        // Force re-render not strictly needed as internal state handles it, 
        // but if we want to sync across tabs in real-time we'd listen to storage changes.
    };

    const handleSaveNote = async (draft: NoteDraft, id?: string) => {
        // For the scratchpad, we always update the same ID
        const updatedNote: Note = {
            ...note,
            ...draft,
            id: 'global-scratchpad', // Ensure it stays global
            updatedAt: Date.now()
        };
        await storage.saveNote(updatedNote);
    };

    root.render(
        <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 999999 }}>
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                <FloatingPanel
                    initialLayout={layout}
                    onLayoutChange={handleLayoutChange}
                    note={note}
                    onSaveNote={handleSaveNote}
                />
            </div>
        </div>
    );
}

// Listen for storage changes to auto-update (e.g. if updated in another tab)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.panelLayout || changes.notes) {
            // Simplified: just re-init to fetch fresh data
            init();
        }
    }
});

// Initial load
init();

import { createRoot } from 'react-dom/client';
import type { Note } from './types';
import { storage } from './utils/storage';
import { FloatingNote } from './components/FloatingNote';

// Create container for floating notes
const container = document.createElement('div');
container.id = 'kuviyam-root';
document.body.appendChild(container);

// Use Shadow DOM to isolate styles
const shadowRoot = container.attachShadow({ mode: 'open' });
const root = createRoot(shadowRoot);

async function init() {
    const currentDomain = window.location.hostname;
    // const currentUrl = window.location.href; // For exact URL matching if needed

    const notes = await storage.getNotes();
    const siteNotes = notes.filter(n => n.domain === currentDomain);

    if (siteNotes.length > 0) {
        renderNotes(siteNotes);
    }
}

function renderNotes(notes: Note[]) {
    root.render(
        <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 99999 }}>
            {/* Reset pointer events for children so they can be clicked */}
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                {notes.map(note => (
                    <FloatingNote
                        key={note.id}
                        note={note}
                        onUpdate={handleUpdatePosition}
                    />
                ))}
            </div>
        </div>
    );
}

const handleUpdatePosition = async (id: string, position: { x: number, y: number }) => {
    const notes = await storage.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index >= 0) {
        notes[index] = { ...notes[index], position };
        await chrome.storage.local.set({ notes });
    }
};

// Listen for storage changes to auto-update
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.notes) {
        init();
    }
});

// Initial load
init();

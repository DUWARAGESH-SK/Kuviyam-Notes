import type { Note, NoteDraft, PanelLayout } from '../types';

export const storage = {
    async getNotes(): Promise<Note[]> {
        const result = await chrome.storage.local.get('notes');
        return (result.notes as Note[]) || [];
    },

    async saveNote(note: Note): Promise<void> {
        const notes = await this.getNotes();
        const index = notes.findIndex(n => n.id === note.id);
        if (index >= 0) {
            notes[index] = note;
        } else {
            notes.unshift(note);
        }
        await chrome.storage.local.set({ notes });
    },

    async createNote(draft: NoteDraft): Promise<Note> {
        const newNote: Note = {
            ...draft,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            pinned: false,
            tags: draft.tags || [],
        };
        await this.saveNote(newNote);
        return newNote;
    },

    async deleteNote(id: string): Promise<void> {
        const notes = await this.getNotes();
        const filtered = notes.filter(n => n.id !== id);
        await chrome.storage.local.set({ notes: filtered });
    },

    async getPanelLayout(): Promise<PanelLayout> {
        const result = await chrome.storage.local.get('panelLayout');
        return (result.panelLayout as PanelLayout) || { x: 50, y: 50, width: 320, height: 400, isMinimized: false, isOpen: true };
    },

    async savePanelLayout(layout: PanelLayout): Promise<void> {
        await chrome.storage.local.set({ panelLayout: layout });
    }
};

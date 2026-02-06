import type { Note, NoteDraft, PanelLayout, Folder } from '../types';

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
            folderIds: draft.folderIds || []
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
    },

    async getFolders(): Promise<Folder[]> {
        const result = await chrome.storage.local.get('folders');
        return (result.folders as Folder[]) || [];
    },

    async saveFolder(folder: Folder): Promise<void> {
        const folders = await this.getFolders();
        const index = folders.findIndex(f => f.id === folder.id);
        if (index >= 0) {
            folders[index] = folder;
        } else {
            folders.unshift(folder);
        }
        await chrome.storage.local.set({ folders });
    },

    async createFolder(name: string, parentId?: string): Promise<Folder> {
        const newFolder: Folder = {
            id: crypto.randomUUID(),
            name,
            createdAt: Date.now(),
            itemCount: 0,
            parentId
        };
        await this.saveFolder(newFolder);
        return newFolder;
    },

    async deleteFolder(id: string): Promise<void> {
        const folders = await this.getFolders();
        const filtered = folders.filter(f => f.id !== id);
        await chrome.storage.local.set({ folders: filtered });
    },

    async getNotesInFolder(folderId: string): Promise<Note[]> {
        const notes = await this.getNotes();
        return notes.filter(n => n.folderIds?.includes(folderId));
    },

    async getSubfolders(parentId: string): Promise<Folder[]> {
        const folders = await this.getFolders();
        return folders.filter(f => f.parentId === parentId);
    }
};

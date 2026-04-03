/**
 * Cross-browser storage helpers.
 * Uses the `api` shim so this works on both Chrome and Firefox.
 *
 * This is the canonical storage module — prefer this over src/utils/storage.ts.
 */
import { api } from './api';
import type { Note, NoteDraft, PanelLayout, Folder, AppSettings } from '../types';

const generateId = (): string => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const storage = {
    async getNotes(): Promise<Note[]> {
        const result = await api.storage.local.get('notes');
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
        await api.storage.local.set({ notes });
    },

    async createNote(draft: NoteDraft): Promise<Note> {
        const newNote: Note = {
            ...draft,
            id: generateId(),
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
        await api.storage.local.set({ notes: filtered });
    },

    async getPanelLayout(): Promise<PanelLayout> {
        const result = await api.storage.local.get('panelLayout');
        return (result.panelLayout as PanelLayout) || { x: 50, y: 50, width: 320, height: 400, isMinimized: false, isOpen: true };
    },

    async savePanelLayout(layout: PanelLayout): Promise<void> {
        await api.storage.local.set({ panelLayout: layout });
    },

    async getFolders(): Promise<Folder[]> {
        const result = await api.storage.local.get('folders');
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
        await api.storage.local.set({ folders });
    },

    async createFolder(name: string, parentId?: string): Promise<Folder> {
        const newFolder: Folder = {
            id: generateId(),
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
        await api.storage.local.set({ folders: filtered });
    },

    async getNotesInFolder(folderId: string): Promise<Note[]> {
        const notes = await this.getNotes();
        return notes.filter(n => n.folderIds?.includes(folderId));
    },

    async getSubfolders(parentId: string): Promise<Folder[]> {
        const folders = await this.getFolders();
        return folders.filter(f => f.parentId === parentId);
    },

    async getSettings(): Promise<AppSettings> {
        const result = await api.storage.local.get('settings');
        return (result.settings as AppSettings) || { stickMode: 'global' };
    },

    async saveSettings(settings: AppSettings): Promise<void> {
        await api.storage.local.set({ settings });
    },

    async getTravelHistory(): Promise<string[]> {
        const res = await api.storage.local.get('travelHistory');
        return (res.travelHistory as string[]) || [];
    },

    async addTravelHistory(domain: string): Promise<void> {
        if (!domain) return;
        const history = await this.getTravelHistory();
        const set = new Set([domain, ...history]);
        const arr = Array.from(set).slice(0, 30);
        await api.storage.local.set({ travelHistory: arr });
    },

    async getAllowedDomains(): Promise<string[]> {
        const res = await api.storage.local.get('allowedDomains');
        return (res.allowedDomains as string[]) || [];
    },

    async saveAllowedDomains(domains: string[]): Promise<void> {
        await api.storage.local.set({ allowedDomains: domains });
    }
};

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { storage } from '../utils/storage';
import type { Note, Folder } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteAll: () => void; // Or handle more granular deletes
}

type Tab = 'sync' | 'download' | 'delete' | 'websites';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onDeleteAll }) => {
    const [activeTab, setActiveTab] = useState<Tab>('sync');
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);

    // Download State
    const [selectedDownloadType, setSelectedDownloadType] = useState<'notes' | 'folders'>('notes');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);

    // Website List State
    const [linkedWebsites, setLinkedWebsites] = useState<{ domain: string, url: string, count: number, favicon?: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        const allNotes = await storage.getNotes();
        const allFolders = await storage.getFolders();
        setNotes(allNotes);
        setFolders(allFolders);

        // Process Websites
        const sites = new Map<string, { domain: string, url: string, count: number, favicon?: string }>();
        allNotes.forEach(note => {
            if (note.url && note.domain) {
                const existing = sites.get(note.domain) || { domain: note.domain, url: note.url, count: 0, favicon: note.favicon };
                existing.count++;
                sites.set(note.domain, existing);
            }
        });
        setLinkedWebsites(Array.from(sites.values()).sort((a, b) => b.count - a.count));
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const zip = new JSZip();

        // Filter items
        // If single note selected -> text file download (handled separately usually, but here unified)

        if (selectedDownloadType === 'notes') {
            const notesToDownload = selectedItemIds.length === 0
                ? notes // If nothing selected, maybe assume all? Or disable button? Let's say Select All is explicit.
                : notes.filter(n => selectedItemIds.includes(n.id));

            if (notesToDownload.length === 1) {
                downloadSingleNote(notesToDownload[0]);
                setIsDownloading(false);
                return;
            }

            notesToDownload.forEach(note => {
                const updatedTime = new Date(note.updatedAt).toISOString().replace(/[:.]/g, '-');
                zip.file(`${note.title || 'Untitled'}_${updatedTime}.txt`,
                    `Title: ${note.title}\nURL: ${note.url || ''}\n\n${note.content}`);
            });
        } else {
            // Folders
            const foldersToDownload = selectedItemIds.length === 0
                ? folders
                : folders.filter(f => selectedItemIds.includes(f.id));

            for (const folder of foldersToDownload) {
                const folderNotes = notes.filter(n => n.folderIds?.includes(folder.id));
                const folderZip = zip.folder(folder.name);
                folderNotes.forEach(note => {
                    const updatedTime = new Date(note.updatedAt).toISOString().replace(/[:.]/g, '-');
                    folderZip?.file(`${note.title || 'Untitled'}_${updatedTime}.txt`,
                        `Title: ${note.title}\nURL: ${note.url || ''}\n\n${note.content}`);
                });
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `antigravity_backup_${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };

    const downloadSingleNote = (note: Note) => {
        const text = `Title: ${note.title}\nURL: ${note.url || ''}\n\n${note.content}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${note.title || 'Untitled'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleSelection = (id: string) => {
        setSelectedItemIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        const targetIds = selectedDownloadType === 'notes' ? notes.map(n => n.id) : folders.map(f => f.id);
        if (selectedItemIds.length === targetIds.length) {
            setSelectedItemIds([]);
        } else {
            setSelectedItemIds(targetIds);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in font-display">
            <div className="w-full max-w-2xl bg-white dark:bg-[#0F1115] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/10 animate-scale-in">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Settings</h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                        <span className="material-symbols-rounded text-slate-500 dark:text-white/50">close</span>
                    </button>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-slate-200 dark:border-white/5 p-4 space-y-2 bg-slate-50/30 dark:bg-black/20">
                        {[
                            { id: 'sync', icon: 'sync', label: 'Sync' },
                            { id: 'download', icon: 'download', label: 'Download' },
                            { id: 'websites', icon: 'grid_view', label: 'Website List' },
                            { id: 'delete', icon: 'delete', label: 'Delete', danger: true }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === tab.id
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                    : tab.danger
                                        ? 'text-rose-500 hover:bg-rose-500/10'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <span className={`material-symbols-rounded ${tab.danger && activeTab !== tab.id ? 'text-rose-500' : ''}`}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0F1115]">

                        {/* 1. SYNC TAB */}
                        {activeTab === 'sync' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                                        <span className="material-symbols-rounded text-3xl text-indigo-500">cloud_sync</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Sync is active</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">Your notes are automatically synced to your local storage. Cloud sync coming soon.</p>
                                </div>
                            </div>
                        )}

                        {/* 2. DOWNLOAD TAB */}
                        {activeTab === 'download' && (
                            <div className="space-y-6 h-full flex flex-col">
                                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                                    <button
                                        onClick={() => { setSelectedDownloadType('notes'); setSelectedItemIds([]); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'notes' ? 'bg-white dark:bg-[#0F1115] shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                    >
                                        Download Notes
                                    </button>
                                    <button
                                        onClick={() => { setSelectedDownloadType('folders'); setSelectedItemIds([]); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'folders' ? 'bg-white dark:bg-[#0F1115] shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                    >
                                        Download Folders
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 py-2 border-b border-slate-200 dark:border-white/10">
                                    <input
                                        type="checkbox"
                                        checked={selectedItemIds.length > 0 && selectedItemIds.length === (selectedDownloadType === 'notes' ? notes.length : folders.length)}
                                        onChange={toggleAll}
                                        className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                    />
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Select All</span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[200px]">
                                    {(selectedDownloadType === 'notes' ? notes : folders).map(item => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                                            <input
                                                type="checkbox"
                                                checked={selectedItemIds.includes(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                            />
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{selectedDownloadType === 'notes' ? (item as Note).title || 'Untitled' : (item as Folder).name}</div>
                                                {selectedDownloadType === 'notes' && <div className="text-xs text-slate-400 truncate">{(item as Note).content.substring(0, 40)}...</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {(selectedDownloadType === 'notes' ? notes : folders).length === 0 && (
                                        <div className="text-center py-12 text-slate-400 opacity-60">Nothing to download</div>
                                    )}
                                </div>

                                <button
                                    onClick={handleDownload}
                                    disabled={selectedItemIds.length === 0 || isDownloading}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isDownloading ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : <span className="material-symbols-rounded">download</span>}
                                    {isDownloading ? 'Processing...' : `Download ${selectedItemIds.length} Item${selectedItemIds.length !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        )}

                        {/* 3. WEBSITES TAB */}
                        {activeTab === 'websites' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    {linkedWebsites.map((site, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 transition-all hover:shadow-lg group relative overflow-hidden">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-white dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/10 shrink-0">
                                                    {site.favicon ? (
                                                        <img src={site.favicon} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : (
                                                        <span className="material-symbols-rounded text-slate-400">public</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm">{site.domain}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{site.count} Note{site.count !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <a
                                                href={site.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full text-center py-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300"
                                            >
                                                Visit Website
                                            </a>
                                        </div>
                                    ))}
                                    {linkedWebsites.length === 0 && (
                                        <div className="col-span-2 text-center py-12 text-slate-400 opacity-60">No linked websites yet</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. DELETE TAB */}
                        {activeTab === 'delete' && (
                            <div className="space-y-6 flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                                    <span className="material-symbols-rounded text-4xl text-rose-500">delete_forever</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">Delete All Data?</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">This action cannot be undone. All notes, folders, and preferences will be permanently removed.</p>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you absolutely sure you want to delete everything?')) {
                                            onDeleteAll();
                                            onClose();
                                        }
                                    }}
                                    className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95"
                                >
                                    Yes, Delete Everything
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

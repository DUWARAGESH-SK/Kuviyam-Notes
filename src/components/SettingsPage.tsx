import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { storage } from '../utils/storage';
import type { Note, Folder } from '../types';

interface SettingsPageProps {
    onDeleteAll?: () => void;
}

type Tab = 'sync' | 'download' | 'delete' | 'websites';

export const SettingsPage: React.FC<SettingsPageProps> = ({ onDeleteAll }) => {
    const [activeTab, setActiveTab] = useState<Tab>('sync');
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);

    // Download State
    const [selectedDownloadType, setSelectedDownloadType] = useState<'notes' | 'folders'>('notes');
    const [selectedDownloadIds, setSelectedDownloadIds] = useState<string[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);

    // Delete State
    const [selectedDeleteType, setSelectedDeleteType] = useState<'notes' | 'folders'>('notes');
    const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter State
    const [downloadFilter, setDownloadFilter] = useState<'alpha-asc' | 'alpha-desc' | 'recent' | 'oldest'>('alpha-asc');
    const [deleteFilter, setDeleteFilter] = useState<'alpha-asc' | 'alpha-desc' | 'recent' | 'oldest'>('alpha-asc');
    const [showDownloadFilter, setShowDownloadFilter] = useState(false);
    const [showDeleteFilter, setShowDeleteFilter] = useState(false);

    // Website List State
    const [linkedWebsites, setLinkedWebsites] = useState<{ domain: string, url: string, count: number, favicon?: string }[]>([]);

    useEffect(() => {
        loadData();
    }, []);

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
        setLinkedWebsites(Array.from(sites.values()).sort((a, b) => a.domain.localeCompare(b.domain)));
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const zip = new JSZip();

        if (selectedDownloadType === 'notes') {
            const notesToDownload = selectedDownloadIds.length === 0
                ? notes
                : notes.filter(n => selectedDownloadIds.includes(n.id));

            if (notesToDownload.length === 1) {
                downloadSingleNote(notesToDownload[0]);
                setIsDownloading(false);
                return;
            }

            notesToDownload.forEach(note => {
                const updatedTime = new Date(note.updatedAt).toISOString().replace(/[:.]/g, '-');
                const fileName = `${note.title || 'Untitled'}_${updatedTime}.txt`;
                const content = `Title: ${note.title}\nURL: ${note.url || ''}\nDomain: ${note.domain || ''}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;
                zip.file(fileName, content);
            });
        } else {
            const foldersToDownload = selectedDownloadIds.length === 0
                ? folders
                : folders.filter(f => selectedDownloadIds.includes(f.id));

            for (const folder of foldersToDownload) {
                const folderNotes = notes.filter(n => n.folderIds?.includes(folder.id));
                const folderZip = zip.folder(folder.name);

                folderNotes.forEach(note => {
                    const updatedTime = new Date(note.updatedAt).toISOString().replace(/[:.]/g, '-');
                    const fileName = `${note.title || 'Untitled'}_${updatedTime}.txt`;
                    const content = `Title: ${note.title}\nURL: ${note.url || ''}\nDomain: ${note.domain || ''}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;

                    if (folderZip) {
                        folderZip.file(fileName, content);
                    }
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
        const text = `Title: ${note.title}\nURL: ${note.url || ''}\nDomain: ${note.domain || ''}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${note.title || 'Untitled'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDelete = async () => {
        const itemCount = selectedDeleteIds.length;
        const itemType = selectedDeleteType === 'notes' ? 'note' : 'folder';

        if (!confirm(`Are you sure you want to delete ${itemCount} ${itemType}${itemCount !== 1 ? 's' : ''}? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);

        if (selectedDeleteType === 'notes') {
            for (const id of selectedDeleteIds) {
                await storage.deleteNote(id);
            }
        } else {
            for (const id of selectedDeleteIds) {
                await storage.deleteFolder(id);
            }
        }

        await loadData();
        setSelectedDeleteIds([]);
        setIsDeleting(false);
    };

    const toggleDownloadSelection = (id: string) => {
        setSelectedDownloadIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDownloadAll = () => {
        const targetIds = selectedDownloadType === 'notes' ? notes.map(n => n.id) : folders.map(f => f.id);
        if (selectedDownloadIds.length === targetIds.length) {
            setSelectedDownloadIds([]);
        } else {
            setSelectedDownloadIds(targetIds);
        }
    };

    const toggleDeleteSelection = (id: string) => {
        setSelectedDeleteIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDeleteAll = () => {
        const targetIds = selectedDeleteType === 'notes' ? notes.map(n => n.id) : folders.map(f => f.id);
        if (selectedDeleteIds.length === targetIds.length) {
            setSelectedDeleteIds([]);
        } else {
            setSelectedDeleteIds(targetIds);
        }
    };

    // Apply filters
    const applyFilter = (items: (Note | Folder)[], filter: string, type: 'notes' | 'folders') => {
        const sorted = [...items];
        if (filter === 'alpha-asc') {
            sorted.sort((a, b) => {
                const nameA = type === 'notes' ? (a as Note).title || 'Untitled' : (a as Folder).name;
                const nameB = type === 'notes' ? (b as Note).title || 'Untitled' : (b as Folder).name;
                return nameA.localeCompare(nameB);
            });
        } else if (filter === 'alpha-desc') {
            sorted.sort((a, b) => {
                const nameA = type === 'notes' ? (a as Note).title || 'Untitled' : (a as Folder).name;
                const nameB = type === 'notes' ? (b as Note).title || 'Untitled' : (b as Folder).name;
                return nameB.localeCompare(nameA);
            });
        } else if (filter === 'recent') {
            sorted.sort((a, b) => {
                const timeA = type === 'notes' ? (a as Note).updatedAt : (a as Folder).createdAt;
                const timeB = type === 'notes' ? (b as Note).updatedAt : (b as Folder).createdAt;
                return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
        } else if (filter === 'oldest') {
            sorted.sort((a, b) => {
                const timeA = type === 'notes' ? (a as Note).updatedAt : (a as Folder).createdAt;
                const timeB = type === 'notes' ? (b as Note).updatedAt : (b as Folder).createdAt;
                return new Date(timeA).getTime() - new Date(timeB).getTime();
            });
        }
        return sorted;
    };

    const downloadItems = applyFilter(
        selectedDownloadType === 'notes' ? notes : folders,
        downloadFilter,
        selectedDownloadType
    );
    const deleteItems = applyFilter(
        selectedDeleteType === 'notes' ? notes : folders,
        deleteFilter,
        selectedDeleteType
    );

    return (
        <div className="w-full h-full flex bg-white dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display">
            {/* LEFT PANEL - 30% Compact Options */}
            <div className="w-[30%] border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/30 flex flex-col">
                {/* Header */}
                <div className="px-6 py-8 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-4 mb-2">
                        <img src="/logo.png" alt="Kuviyam" className="w-12 h-12 rounded-xl shadow-md border border-slate-200/50 dark:border-white/10 object-cover" />
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight pt-1">Settings</h2>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your preferences</p>
                </div>

                {/* Options List */}
                <div className="flex-1 p-3 space-y-1">
                    {[
                        { id: 'sync', icon: 'sync', label: 'Sync', danger: false },
                        { id: 'download', icon: 'download', label: 'Download', danger: false },
                        { id: 'delete', icon: 'delete', label: 'Delete', danger: true },
                        { id: 'websites', icon: 'language', label: 'Website List', danger: false }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === tab.id
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : tab.danger
                                    ? 'text-rose-500 hover:bg-rose-500/10'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <span className={`material-symbols-rounded text-[20px] ${tab.danger && activeTab !== tab.id ? 'text-rose-500' : ''}`}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL - 70% Expanded Content */}
            <div className="flex-1 flex flex-col bg-white dark:bg-background-dark overflow-y-auto custom-scrollbar">
                <div className="p-8 max-w-4xl mx-auto w-full">

                    {/* 1. SYNC TAB */}
                    {activeTab === 'sync' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-3xl text-indigo-500">cloud_sync</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Sync Status</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Your data synchronization settings</p>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-rounded text-2xl text-indigo-500">check_circle</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Sync is Active</h4>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                                            Your notes are automatically synced to your local storage. All changes are saved in real-time.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                                            <span className="material-symbols-rounded text-[14px]">schedule</span>
                                            <span>Last synced: Just now</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">Coming Soon</h4>
                                <p className="text-slate-500 dark:text-slate-500 text-sm">Cloud sync across devices will be available in a future update.</p>
                            </div>
                        </div>
                    )}

                    {/* 2. DOWNLOAD TAB */}
                    {activeTab === 'download' && (
                        <div className="space-y-6 h-full flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-3xl text-blue-500">download</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Download Your Data</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Export notes and folders as files</p>
                                </div>
                            </div>

                            {downloadItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-700 mb-4">inbox</span>
                                    <h4 className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-2">No content to download yet</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-sm">Create some {selectedDownloadType} first to download them</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                                        <button
                                            onClick={() => { setSelectedDownloadType('notes'); setSelectedDownloadIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'notes' ? 'bg-white dark:bg-background-dark shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Download Notes
                                        </button>
                                        <button
                                            onClick={() => { setSelectedDownloadType('folders'); setSelectedDownloadIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'folders' ? 'bg-white dark:bg-background-dark shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Download Folders
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedDownloadIds.length > 0 && selectedDownloadIds.length === downloadItems.length}
                                                onChange={toggleDownloadAll}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                            />
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Select All ({downloadItems.length})</span>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowDownloadFilter(!showDownloadFilter)}
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-slate-600 dark:text-slate-400 text-[20px]">filter_list</span>
                                            </button>
                                            {showDownloadFilter && (
                                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 w-48 z-50">
                                                    {[
                                                        { id: 'alpha-asc', label: 'A → Z', icon: 'sort_by_alpha' },
                                                        { id: 'alpha-desc', label: 'Z → A', icon: 'sort_by_alpha' },
                                                        { id: 'recent', label: 'Most Recent', icon: 'schedule' },
                                                        { id: 'oldest', label: 'Oldest First', icon: 'history' }
                                                    ].map(option => (
                                                        <button
                                                            key={option.id}
                                                            onClick={() => { setDownloadFilter(option.id as any); setShowDownloadFilter(false); }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${downloadFilter === option.id ? 'bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                        >
                                                            <span className="material-symbols-rounded text-[16px]">{option.icon}</span>
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[200px] max-h-[400px]">
                                        {downloadItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDownloadIds.includes(item.id)}
                                                    onChange={() => toggleDownloadSelection(item.id)}
                                                    className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{selectedDownloadType === 'notes' ? (item as Note).title || 'Untitled' : (item as Folder).name}</div>
                                                    {selectedDownloadType === 'notes' && <div className="text-xs text-slate-400 truncate">{(item as Note).content.substring(0, 40)}...</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleDownload}
                                        disabled={selectedDownloadIds.length === 0 || isDownloading}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDownloading ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : <span className="material-symbols-rounded">download</span>}
                                        {isDownloading ? 'Processing...' : `Download ${selectedDownloadIds.length} Item${selectedDownloadIds.length !== 1 ? 's' : ''}`}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 3. DELETE TAB */}
                    {activeTab === 'delete' && (
                        <div className="space-y-6 h-full flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-3xl text-rose-500">delete</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Delete Your Data</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Permanently remove notes and folders</p>
                                </div>
                            </div>

                            {deleteItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-700 mb-4">shield</span>
                                    <h4 className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-2">Nothing to delete</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-sm">Your {selectedDeleteType} are safe</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                                        <button
                                            onClick={() => { setSelectedDeleteType('notes'); setSelectedDeleteIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDeleteType === 'notes' ? 'bg-white dark:bg-background-dark shadow text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Delete Notes
                                        </button>
                                        <button
                                            onClick={() => { setSelectedDeleteType('folders'); setSelectedDeleteIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDeleteType === 'folders' ? 'bg-white dark:bg-background-dark shadow text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Delete Folders
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedDeleteIds.length > 0 && selectedDeleteIds.length === deleteItems.length}
                                                onChange={toggleDeleteAll}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-rose-600 focus:ring-rose-500/40"
                                            />
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Select All ({deleteItems.length})</span>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowDeleteFilter(!showDeleteFilter)}
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-slate-600 dark:text-slate-400 text-[20px]">filter_list</span>
                                            </button>
                                            {showDeleteFilter && (
                                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 w-48 z-50">
                                                    {[
                                                        { id: 'alpha-asc', label: 'A → Z', icon: 'sort_by_alpha' },
                                                        { id: 'alpha-desc', label: 'Z → A', icon: 'sort_by_alpha' },
                                                        { id: 'recent', label: 'Most Recent', icon: 'schedule' },
                                                        { id: 'oldest', label: 'Oldest First', icon: 'history' }
                                                    ].map(option => (
                                                        <button
                                                            key={option.id}
                                                            onClick={() => { setDeleteFilter(option.id as any); setShowDeleteFilter(false); }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${deleteFilter === option.id ? 'bg-rose-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                        >
                                                            <span className="material-symbols-rounded text-[16px]">{option.icon}</span>
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[200px] max-h-[400px]">
                                        {deleteItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDeleteIds.includes(item.id)}
                                                    onChange={() => toggleDeleteSelection(item.id)}
                                                    className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-rose-600 focus:ring-rose-500/40"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{selectedDeleteType === 'notes' ? (item as Note).title || 'Untitled' : (item as Folder).name}</div>
                                                    {selectedDeleteType === 'notes' && <div className="text-xs text-slate-400 truncate">{(item as Note).content.substring(0, 40)}...</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleDelete}
                                        disabled={selectedDeleteIds.length === 0 || isDeleting}
                                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : <span className="material-symbols-rounded">delete</span>}
                                        {isDeleting ? 'Deleting...' : `Delete ${selectedDeleteIds.length} Item${selectedDeleteIds.length !== 1 ? 's' : ''}`}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 4. WEBSITES TAB */}
                    {activeTab === 'websites' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-3xl text-teal-500">language</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Linked Websites</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">All websites connected to your notes</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {linkedWebsites.map((site, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/10 shrink-0">
                                            {site.favicon ? (
                                                <img src={site.favicon} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : (
                                                <span className="material-symbols-rounded text-slate-400 text-[16px]">public</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">{site.domain}</h4>
                                            <p className="text-xs text-slate-400 truncate">{site.url}</p>
                                        </div>

                                        <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{site.count} Note{site.count !== 1 ? 's' : ''}</span>
                                        </div>

                                        <a
                                            href={site.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"
                                        >
                                            Visit
                                            <span className="material-symbols-rounded text-[14px]">open_in_new</span>
                                        </a>
                                    </div>
                                ))}
                                {linkedWebsites.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 opacity-60">No linked websites yet</div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

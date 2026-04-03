import React, { useState, useMemo, useEffect } from 'react';
import type { Note, Folder } from '../../../types';
import { storage } from '../../../shared/storage';

interface TagModalProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Note[];
    selectedTag: string | null;
    onTagSelect: (tag: string | null) => void;
}

type SortOption = 'most-used' | 'alphabetical' | 'recent' | 'folders';

export const TagModal: React.FC<TagModalProps> = ({
    isOpen,
    onClose,
    notes,
    selectedTag,
    onTagSelect,
}) => {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('most-used');
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            storage.getFolders().then(setFolders);
        }
    }, [isOpen]);

    const displayItems = useMemo(() => {
        // If sorting by folders and no folder selected, show folders
        if (sortBy === 'folders' && !selectedFolderId) {
            let result = [...folders];
            if (search) {
                result = result.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
            }
            return result.map(f => ({ type: 'folder' as const, data: f }));
        }

        // Calculate tag stats based on current scope
        const scopedNotes = (sortBy === 'folders' && selectedFolderId)
            ? notes.filter(n => n.folderIds?.includes(selectedFolderId))
            : notes;

        const stats: Record<string, { name: string; count: number; lastUsed: number }> = {};
        scopedNotes.forEach(note => {
            note.tags.forEach(tag => {
                if (!stats[tag]) {
                    stats[tag] = { name: tag, count: 0, lastUsed: 0 };
                }
                stats[tag].count++;
                stats[tag].lastUsed = Math.max(stats[tag].lastUsed, note.updatedAt);
            });
        });

        let result = Object.values(stats);

        if (search) {
            result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
        }

        switch (sortBy) {
            case 'most-used':
            case 'folders': // When folder selected, default to most-used logic for tags
                result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                break;
            case 'alphabetical':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'recent':
                result.sort((a, b) => b.lastUsed - a.lastUsed);
                break;
        }

        return result.map(t => ({ type: 'tag' as const, data: t }));
    }, [notes, folders, search, sortBy, selectedFolderId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-background-dark animate-slide-up font-display">
            {/* Header */}
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors px-0 cursor-pointer"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-extrabold text-[#1E293B] dark:text-white tracking-tight">Browse Tags</h2>
                        {sortBy === 'folders' && selectedFolderId && (
                            <div className="flex items-center gap-1 text-xs font-bold text-primary cursor-pointer" onClick={() => setSelectedFolderId(null)}>
                                <span className="material-symbols-rounded text-sm">arrow_back</span>
                                <span>Back to Folders</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 pb-32">
                {/* Search & Sort */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                            <span className="material-symbols-rounded">search</span>
                        </div>
                        <input
                            className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 text-slate-600 dark:text-slate-200"
                            placeholder={sortBy === 'folders' && !selectedFolderId ? "Search folders..." : "Search tags..."}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {(['most-used', 'alphabetical', 'recent', 'folders'] as SortOption[]).map(option => (
                            <button
                                key={option}
                                onClick={() => {
                                    setSortBy(option);
                                    if (option !== 'folders') setSelectedFolderId(null);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${sortBy === option
                                    ? 'bg-primary text-slate-900 shadow-md'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                            >
                                {option.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {displayItems.map((item, idx) => {
                        if (item.type === 'folder') {
                            const folder = item.data;
                            return (
                                <button
                                    key={folder.id}
                                    onClick={() => {
                                        setSelectedFolderId(folder.id);
                                        setSearch('');
                                    }}
                                    className="p-4 rounded-3xl border flex flex-col gap-2 transition-all group bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg"
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="material-symbols-rounded text-2xl text-amber-400">folder</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{folder.itemCount} items</span>
                                    </div>
                                    <span className="font-bold text-lg truncate text-slate-800 dark:text-white">{folder.name}</span>
                                </button>
                            );
                        } else {
                            const tag = item.data;
                            return (
                                <button
                                    key={tag.name}
                                    onClick={() => {
                                        onTagSelect(tag.name === selectedTag ? null : tag.name);
                                        onClose();
                                    }}
                                    className={`p-4 rounded-3xl border flex flex-col gap-2 transition-all group ${selectedTag === tag.name
                                        ? 'bg-primary border-transparent shadow-xl ring-2 ring-primary ring-offset-4 dark:ring-offset-slate-900'
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`material-symbols-rounded text-2xl ${selectedTag === tag.name ? 'text-slate-900' : 'text-primary'
                                            }`}>tag</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${selectedTag === tag.name ? 'text-slate-700' : 'text-slate-400'
                                            }`}>
                                            {tag.count} notes
                                        </span>
                                    </div>
                                    <span className={`font-bold text-lg truncate ${selectedTag === tag.name ? 'text-slate-900' : 'text-slate-800 dark:text-white'
                                        }`}>
                                        {tag.name}
                                    </span>
                                </button>
                            );
                        }
                    })}

                    {displayItems.length === 0 && (
                        <div className="col-span-2 py-20 flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <span className="material-symbols-rounded text-6xl mb-4">label_off</span>
                            <p className="font-bold tracking-wide">No items found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

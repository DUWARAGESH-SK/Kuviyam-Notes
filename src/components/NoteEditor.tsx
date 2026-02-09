import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft } from '../types';
import { storage } from '../utils/storage';
import { FolderSelectionModal } from './FolderSelectionModal';

interface NoteEditorProps {
    initialNote?: Note | null;
    onSave: (draft: NoteDraft, id?: string) => void;
    onCancel: () => void;
    isDark: boolean;
    onToggleTheme: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ initialNote, onSave, onCancel, isDark, onToggleTheme }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [showStatus, setShowStatus] = useState<string | null>(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
    const [isFocusMode, setIsFocusMode] = useState(false);

    // Additional state for matching StickyNotes logic
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (initialNote) {
            setTitle(initialNote.title || '');
            setContent(initialNote.content || '');
            setIsPinned(initialNote.pinned || false);
            setSelectedFolderIds(initialNote.folderIds || []);
        }
    }, [initialNote]);

    const handleSave = () => {
        if (!title.trim() && !content.trim()) return;

        const draft: NoteDraft = {
            title: title || 'Untitled',
            content,
            tags: [], // Following StickyNotes pattern
            pinned: isPinned,
            domain: initialNote?.domain || window.location.hostname,
            url: initialNote?.url || window.location.href,
            favicon: initialNote?.favicon,
            folderIds: selectedFolderIds
        };
        onSave(draft, initialNote?.id);
        displayStatus('Note Saved!');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    // Date formatting matching StickyNotes
    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase().replace(/(\d+)/, '$1,');

    const domain = initialNote?.domain || window.location.hostname || 'chat.deepseek.com';

    return (
        <div
            className={`font-display flex flex-col relative transition-all duration-300 h-full ${isDark ? 'dark' : ''} ${isFocusMode ? 'fixed inset-0 z-[2147483647]' : ''}`}
            style={{
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                color: isDark ? 'white' : '#1e293b'
            }}
        >
            {/* Header */}
            <header
                className="px-8 py-6 flex items-center justify-between select-none border-b border-slate-50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl z-20"
            >
                <div className="flex items-center gap-6 flex-shrink-0">
                    <button
                        onClick={onCancel}
                        className="w-11 h-11 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0 shadow-sm"
                    >
                        <span className="material-symbols-rounded text-slate-500 text-[24px] flex-shrink-0">chevron_left</span>
                    </button>
                    <span className="text-[18px] font-extrabold text-[#94A3B8] dark:text-white/40 tracking-wider whitespace-nowrap">EDIT NOTE</span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    <button onClick={onToggleTheme} className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-[#4F46E5] dark:hover:text-white transition-colors cursor-pointer flex-shrink-0">
                        <span className="material-symbols-rounded text-[24px] flex-shrink-0">{isDark ? 'dark_mode' : 'light_mode'}</span>
                    </button>
                    <button onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-[#4F46E5] dark:hover:text-white transition-colors cursor-pointer flex-shrink-0">
                        <span className="material-symbols-rounded text-[24px] flex-shrink-0">{isFocusMode ? 'close_fullscreen' : 'expand_content'}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-[#4F46E5] text-white px-9 py-2.5 rounded-full font-bold text-[16px] hover:bg-[#4338CA] active:scale-95 transition-all shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] ml-2 flex-shrink-0"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0F1115]">
                <div className={`flex-1 overflow-y-auto px-10 pt-10 pb-32 custom-scrollbar ${isFocusMode ? 'max-w-4xl mx-auto w-full' : ''}`}>

                    {/* Date and Action Pill */}
                    <div className="flex items-center justify-between mb-10">
                        <span className="text-[#94A3B8] dark:text-white/30 text-[14px] font-bold tracking-[0.1em] whitespace-nowrap">{formattedDate}</span>

                        <div className="flex items-center gap-1 bg-[#F8FAFC] dark:bg-white/5 p-1.5 rounded-full border border-slate-100 dark:border-white/5 flex-shrink-0">
                            <button onClick={() => setIsPinned(!isPinned)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${isPinned ? 'text-[#4F46E5]' : 'text-[#94A3B8] hover:text-slate-600 dark:hover:text-white'}`}>
                                <span className={`material-symbols-rounded text-[22px] flex-shrink-0 ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1 flex-shrink-0"></div>
                            <button onClick={() => setIsFolderModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-slate-600 dark:hover:text-white transition-colors flex-shrink-0">
                                <span className="material-symbols-rounded text-[22px] flex-shrink-0">create_new_folder</span>
                            </button>
                            <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-slate-600 dark:hover:text-white transition-colors flex-shrink-0">
                                <span className="material-symbols-rounded text-[22px] flex-shrink-0">more_vert</span>
                            </button>
                        </div>
                    </div>

                    {/* Linked Domain Pill */}
                    <div className="mb-12">
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#EEF2FF] dark:bg-indigo-500/5 border border-[#E0E7FF] dark:border-indigo-500/10 rounded-2xl text-[#4F46E5] dark:text-indigo-400 font-bold text-[14px] flex-shrink-0">
                            <span className="material-symbols-rounded text-[20px] flex-shrink-0">language</span>
                            <span className="whitespace-nowrap">Linked to {domain}</span>
                            <span className="material-symbols-rounded text-[18px] ml-1 opacity-50 flex-shrink-0">open_in_new</span>
                        </div>
                    </div>

                    {/* Primary Content Editor (Big Text) */}
                    <textarea
                        className="w-full bg-transparent text-[52px] font-black text-[#1E293B] dark:text-white mb-2 outline-none border-none focus:ring-0 placeholder-slate-200 dark:placeholder-white/5 leading-[1.1] tracking-tighter p-0 resize-none font-display overflow-hidden"
                        placeholder="Type something amazing..."
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />

                    {/* Secondary Title Area (# Hashtag) */}
                    <div className="flex items-center gap-2 mb-8 group">
                        <span className="text-[#94A3B8] dark:text-white/20 text-[22px] font-bold flex-shrink-0">#</span>
                        <textarea
                            rows={1}
                            className="flex-1 bg-transparent text-[22px] font-bold text-[#94A3B8] dark:text-white/30 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/10 p-0 resize-none font-display overflow-hidden"
                            placeholder="Actualize Tags"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />
                    </div>
                </div>
            </main>

            {showStatus && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] px-8 py-4 bg-slate-900 text-white rounded-2xl shadow-2xl font-bold animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {showStatus}
                </div>
            )}

            <FolderSelectionModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                initialSelectedFolderIds={selectedFolderIds}
                onSave={setSelectedFolderIds}
            />
        </div>
    );
};


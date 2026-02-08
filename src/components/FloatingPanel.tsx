import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import { FolderSelectionModal } from './FolderSelectionModal';
import type { PanelLayout, NoteDraft } from '../types';

interface FloatingPanelProps {
    onClose: () => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({ onClose }) => {
    const [layout, setLayout] = useState<PanelLayout>({
        x: 50,
        y: 50,
        width: 480,
        height: 750,
        isMinimized: false,
        isOpen: true
    });

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const [isPinned, setIsPinned] = useState(false);
    const [showStatus, setShowStatus] = useState<string | null>(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        storage.getPanelLayout().then(setLayout);

        chrome.storage.local.get(['panelDraft']).then((res) => {
            const draft = res.panelDraft as any;
            if (draft) {
                setTitle(draft.title || '');
                setContent(draft.content || '');
                setTagsInput(draft.tags ? draft.tags.join(', ') : '');
                setIsPinned(draft.pinned || false);
                setSelectedFolderIds(draft.folderIds || []);
            } else {
                setTitle('');
                setTagsInput('');
            }
        });

        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            if (recognitionRef.current) {
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;

                recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                    }
                    if (finalTranscript) insertTextAtCursor(finalTranscript + ' ');
                };
                recognitionRef.current.onend = () => setIsListening(false);
                recognitionRef.current.onerror = () => setIsListening(false);
            }
        }
    }, []);

    useEffect(() => {
        const draft = {
            title,
            content,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
            pinned: isPinned,
            folderIds: selectedFolderIds,
            updatedAt: Date.now()
        };
        chrome.storage.local.set({ panelDraft: draft });
    }, [title, content, tagsInput, isPinned, selectedFolderIds]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStart.current.x;
                const newY = Math.max(0, e.clientY - dragStart.current.y);
                setLayout(prev => ({ ...prev, x: newX, y: newY }));
            } else if (isResizing) {
                const newW = Math.max(380, resizeStart.current.w + (e.clientX - resizeStart.current.x));
                const newH = Math.max(500, resizeStart.current.h + (e.clientY - resizeStart.current.y));
                setLayout(prev => ({ ...prev, width: newW, height: newH }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
                storage.savePanelLayout(layout);
            }
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, layout]);

    const handleDragDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - layout.x, y: e.clientY - layout.y };
    };

    const handleResizeDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY, w: layout.width, h: layout.height };
    };

    const insertTextAtCursor = (text: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const newContent = content.substring(0, start) + text + content.substring(end);
            setContent(newContent);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
                    textareaRef.current.focus();
                }
            }, 0);
        } else {
            setContent(prev => prev + text);
        }
    };

    const toggleVoice = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const draft: NoteDraft = {
            title: title || 'Untitled',
            content,
            tags,
            pinned: isPinned,
            color: '#8B5CF6', // Default fallback, but removing UI control
            domain: window.location.hostname,
            url: window.location.href,
            folderIds: selectedFolderIds
        };
        await storage.createNote(draft); // This function needs to exist in your storage interface
        displayStatus('Note Saved!');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    return (
        <div
            className={`font-display flex flex-col relative transition-all duration-300 ${isDark ? 'dark' : ''} ${isFocusMode ? 'fixed inset-0 z-[2147483647]' : ''}`}
            style={!isFocusMode ? {
                position: 'fixed',
                left: `${layout.x}px`,
                top: `${layout.y}px`,
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                borderRadius: '32px',
                boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                color: isDark ? 'white' : '#1e293b'
            } : {
                width: '100vw',
                height: '100vh',
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                pointerEvents: 'auto',
                zIndex: 2147483647,
                color: isDark ? 'white' : '#1e293b'
            }}
        >
            {/* 1. Primary Header - Minimal & Floating */}
            <header
                onMouseDown={handleDragDown}
                className="px-8 py-6 flex items-center justify-between cursor-move select-none z-20"
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
                    >
                        <span className="material-symbols-rounded text-slate-500 dark:text-white/50 text-[20px]">chevron_left</span>
                    </button>
                    {!isFocusMode && <span className="text-[16px] font-bold text-slate-400 dark:text-white/40 tracking-wide uppercase">New Note</span>}
                </div>

                <div className="flex items-center gap-3" onMouseDown={e => e.stopPropagation()}>
                    <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white rounded-full transition-colors cursor-pointer" title={isDark ? 'Light Mode' : 'Dark Mode'}>
                        <span className="material-symbols-rounded text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                    </button>
                    <button onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white rounded-full transition-colors cursor-pointer" title="Focus Mode">
                        <span className="material-symbols-rounded text-[20px]">{isFocusMode ? 'close_fullscreen' : 'open_in_full'}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold text-[14px] hover:bg-indigo-500 active:scale-95 transition-all shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] cursor-pointer"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* 2. Content Body - Layout Engine */}
            <main className={`flex-1 flex flex-col relative overflow-hidden transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full pt-12' : ''}`}>

                {/* Secondary Actions (Discrete Folder & Fav) */}
                <div className="px-10 flex items-center justify-between mb-8">
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400 dark:text-white/20 text-xs font-bold uppercase tracking-wider">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-1.5 rounded-full backdrop-blur-md">
                        <button
                            onClick={() => setIsPinned(!isPinned)}
                            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 ${isPinned ? 'text-rose-500' : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'}`}
                            title="Add to Favorites"
                        >
                            <span className={`material-symbols-rounded text-[20px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                        </button>
                        <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10"></div>
                        <button
                            onClick={() => setIsFolderModalOpen(true)}
                            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 ${selectedFolderIds.length > 0 ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'}`}
                            title="Organize"
                        >
                            <span className={`material-symbols-rounded text-[20px] ${selectedFolderIds.length > 0 ? 'fill-current' : ''}`}>create_new_folder</span>
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5 transition-all cursor-pointer">
                            <span className="material-symbols-rounded text-[20px]">more_vert</span>
                        </button>
                    </div>
                </div>

                {/* Scroll Container - Only scrolls when needed */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-32 custom-scrollbar">

                    {/* Title */}
                    <textarea
                        rows={1}
                        className="w-full bg-transparent text-[40px] font-black text-slate-800 dark:text-white mb-6 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/20 leading-[1.1] tracking-tight p-0 resize-none font-display overflow-hidden"
                        placeholder="Untitled"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8 animate-fade-in">
                            {tags.map((tag, idx) => (
                                <span key={idx} className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-[13px] font-bold border border-indigo-500/20">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Tag Input Trigger (Hidden/Discrete) */}
                    <button
                        onClick={() => {
                            const newTag = prompt('Add tags (comma separated):', tagsInput);
                            if (newTag !== null) setTagsInput(newTag);
                        }}
                        className="text-slate-400 dark:text-white/20 text-sm font-bold hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mb-8 flex items-center gap-2 group w-fit"
                    >
                        <span className="material-symbols-rounded text-lg group-hover:scale-110 transition-transform">tag</span>
                        Actualize Tags
                    </button>

                    {/* Editor Content - Auto expanding, left aligned */}
                    <textarea
                        ref={textareaRef}
                        placeholder="Type something amazing..."
                        className="w-full min-h-[60vh] bg-transparent text-slate-700 dark:text-slate-300 text-[20px] font-medium resize-none outline-none border-none focus:ring-0 leading-[1.7] placeholder-slate-400 dark:placeholder-white/10 p-0 font-display text-left"
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            // Auto-height logic if needed, but flex-1 handles scroll
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.max(e.target.scrollHeight, 400) + 'px';
                        }}
                    />
                </div>
            </main>

            {/* 3. Floating Tools - Bottom Right */}
            <div className={`absolute bottom-8 right-8 flex flex-col items-center gap-4 transition-all ${isFocusMode ? 'bottom-12 right-12' : ''}`}>
                <div className="flex flex-col gap-2 bg-white/10 backdrop-blur-xl p-2 rounded-[20px] border border-white/10 shadow-2xl scale-0 group-hover:scale-100 transition-all origin-bottom-center hidden">
                    {/* Rich text tools could go here as popup */}
                </div>
                <button
                    onClick={toggleVoice}
                    className={`w-[70px] h-[70px] rounded-full flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] transition-all hover:scale-105 active:scale-95 z-50 cursor-pointer backdrop-blur-md border border-white/20 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600/90 text-white hover:bg-indigo-600'}`}
                >
                    <span className="material-symbols-rounded text-[32px]">mic</span>
                </button>
            </div>

            {/* Resizer */}
            {!isFocusMode && (
                <div
                    onMouseDown={handleResizeDown}
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-[60] flex items-end justify-end p-1.5 opacity-0 hover:opacity-100 transition-opacity"
                >
                    <div className="w-2 h-2 rounded-full bg-white/20"></div>
                </div>
            )}

            {showStatus && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] px-8 py-4 bg-black/80 backdrop-blur-xl text-white rounded-2xl shadow-2xl font-bold text-[16px] animate-in fade-in zoom-in duration-200 border border-white/10">
                    {showStatus}
                </div>
            )}

            <FolderSelectionModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                initialSelectedFolderIds={selectedFolderIds}
                onSave={(ids) => {
                    setSelectedFolderIds(ids);
                    displayStatus('Folders updated');
                }}
            />
        </div>
    );
};

export default FloatingPanel;


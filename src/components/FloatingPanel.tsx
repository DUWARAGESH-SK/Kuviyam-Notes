import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
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

    // Note state (from PanelDraft)
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [noteColor, setNoteColor] = useState('#8B5CF6');
    const [isDark, setIsDark] = useState(false);
    const [showStatus, setShowStatus] = useState<string | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Load layout
        storage.getPanelLayout().then(setLayout);

        // Load theme
        const savedTheme = localStorage.getItem('theme');
        setIsDark(savedTheme === 'dark');

        // Load draft
        chrome.storage.local.get(['panelDraft']).then((res) => {
            if (res.panelDraft) {
                const draft = res.panelDraft;
                setTitle(draft.title || '');
                setContent(draft.content || '');
                setTagsInput(draft.tags ? draft.tags.join(', ') : '');
                setIsPinned(draft.pinned || false);
                setNoteColor(draft.color || '#8B5CF6');
            }
        });

        // Speech Recognition Setup
        if ('webkitSpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) insertTextAtCursor(finalTranscript + ' ');
            };
            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onerror = () => setIsListening(false);
        }
    }, []);

    // Save draft automatically
    useEffect(() => {
        const draft = {
            title,
            content,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
            pinned: isPinned,
            color: noteColor,
            updatedAt: Date.now()
        };
        chrome.storage.local.set({ panelDraft: draft });
    }, [title, content, tagsInput, isPinned, noteColor]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStart.current.x;
                const newY = Math.max(0, e.clientY - dragStart.current.y);
                setLayout(prev => ({ ...prev, x: newX, y: newY }));
            } else if (isResizing) {
                const newW = Math.max(350, resizeStart.current.w + (e.clientX - resizeStart.current.x));
                const newH = Math.max(450, resizeStart.current.h + (e.clientY - resizeStart.current.y));
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
            color: noteColor,
            domain: window.location.hostname,
            url: window.location.href
        };
        await storage.createNote(draft);
        displayStatus('Note Saved to Kuviyam!');
    };

    const handleExport = () => {
        const textToExport = `Title: ${title || 'Untitled'}\n\n${content}\n\nTags: ${tagsInput}\nSource: ${window.location.href}`;
        const blob = new Blob([textToExport], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(title || 'Note').replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        displayStatus('Exported as .txt');
    };

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        localStorage.setItem('theme', newDark ? 'dark' : 'light');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    const toggleColor = () => {
        const colors = ['#8B5CF6', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6'];
        const nextIdx = (colors.indexOf(noteColor) + 1) % colors.length;
        setNoteColor(colors[nextIdx]);
    };

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    return (
        <div
            className={`font-display bg-[#FCFCFF] dark:bg-[#0B0F1A] flex flex-col relative transition-colors duration-300 ${isDark ? 'dark' : ''}`}
            style={{
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: isFocusMode ? '100vw' : layout.width,
                height: isFocusMode ? '100vh' : layout.height,
                left: isFocusMode ? 0 : layout.x,
                top: isFocusMode ? 0 : layout.y,
                borderRadius: isFocusMode ? '0' : '32px',
                boxShadow: isFocusMode ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                border: isFocusMode ? 'none' : '1px solid rgba(112, 112, 255, 0.1)',
            }}
        >
            {/* Header Cluster / Drag Handle */}
            {!isFocusMode && (
                <header
                    onMouseDown={handleDragDown}
                    className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] cursor-move select-none"
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="w-11 h-11 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm bg-white dark:bg-slate-900 px-0 cursor-pointer"
                        >
                            <span className="material-symbols-rounded text-[#1E293B] dark:text-slate-300">chevron_left</span>
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[19px] font-[900] text-[#1E293B] dark:text-white leading-[1.1]">Sticky</span>
                            <span className="text-[19px] font-[900] text-[#1E293B] dark:text-white leading-[1.1]">Note</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3" onMouseDown={e => e.stopPropagation()}>
                        <div className="flex bg-[#F8FAFC] dark:bg-slate-800/50 p-1 rounded-[20px] gap-0 border border-slate-100 dark:border-slate-700/50">
                            <button
                                onClick={toggleTheme}
                                className="w-11 h-11 flex items-center justify-center text-amber-400 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors px-0 cursor-pointer"
                                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                <span className="material-symbols-rounded text-[24px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                            </button>
                            <button
                                onClick={handleExport}
                                className="w-11 h-11 flex items-center justify-center text-[#F97316] hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors px-0 cursor-pointer"
                                title="Export as .txt"
                            >
                                <span className="material-symbols-rounded text-[24px]">download</span>
                            </button>
                            <button
                                onClick={() => setIsFocusMode(true)}
                                className="w-11 h-11 flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors px-0 cursor-pointer"
                                title="Focus Mode"
                            >
                                <span className="material-symbols-rounded text-[24px]">open_in_full</span>
                            </button>
                        </div>
                        <button
                            onClick={handleSave}
                            className="bg-[#7070FF] text-white px-9 py-3 rounded-[18px] font-black text-sm shadow-[0_8px_25px_-4px_rgba(112,112,255,0.5)] hover:brightness-110 transition-all active:scale-95 tracking-wide px-0 cursor-pointer"
                        >
                            Save
                        </button>
                    </div>
                </header>
            )}

            {isFocusMode && (
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="fixed top-6 right-6 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-[10000] text-slate-500 hover:text-primary transition-colors px-0 cursor-pointer shadow-lg"
                    title="Exit Focus Mode"
                >
                    <span className="material-symbols-rounded">close_fullscreen</span>
                </button>
            )}

            {/* Main Body */}
            <main className={`flex-1 overflow-auto px-10 pb-32 transition-all ${isFocusMode ? 'pt-24 max-w-4xl mx-auto w-full' : 'pt-10'}`}>
                {/* Meta Bar */}
                {!isFocusMode && (
                    <div className="flex items-center justify-between mb-10">
                        <button onClick={onClose} className="flex items-center gap-2 group px-0 cursor-pointer">
                            <span className="material-symbols-rounded text-[#7070FF] text-lg font-bold">arrow_back</span>
                            <span className="text-[#7070FF] font-[900] text-[12px] tracking-[0.14em] uppercase">Drafts</span>
                        </button>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setIsPinned(!isPinned)}
                                className={`transition-all duration-300 hover:scale-125 px-0 cursor-pointer ${isPinned ? 'text-[#F43F5E]' : 'text-slate-300'}`}
                                title={isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
                            >
                                <span className={`material-symbols-rounded text-[24px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                            </button>
                            <button
                                onClick={toggleColor}
                                className="w-7 h-7 rounded-[6px] shadow-sm ring-2 ring-transparent hover:ring-slate-200 transition-all active:scale-90 px-0 cursor-pointer"
                                style={{ backgroundColor: noteColor }}
                                title="Change Note Color"
                            ></button>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors px-0 cursor-pointer">
                                <span className="material-symbols-rounded text-[26px]">more_horiz</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Title */}
                <input
                    type="text"
                    placeholder="Note Title"
                    className="w-full bg-transparent text-[38px] font-[900] text-[#0F172A] dark:text-white mb-6 outline-none border-none focus:ring-0 placeholder-slate-200 dark:placeholder-slate-800 leading-tight uppercase tracking-tight p-0"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Tags */}
                <div className="flex flex-wrap gap-3 mb-12 items-center">
                    {tags.map((tag, idx) => (
                        <div
                            key={idx}
                            className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-[14px] font-bold shadow-sm ${idx % 2 === 0
                                    ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#064E3B] dark:text-[#34D399]'
                                    : 'bg-[#FEF9C3] text-[#854D0E] dark:bg-[#78350F] dark:text-[#FBBF24]'
                                }`}
                        >
                            #{tag.toLowerCase()}
                            <button
                                onClick={() => setTagsInput(tags.filter((_, i) => i !== idx).join(', '))}
                                className="opacity-50 hover:opacity-100 flex items-center px-0 cursor-pointer"
                            >
                                <span className="material-symbols-rounded text-[16px]">close</span>
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newTag = prompt('Enter new tag:');
                            if (newTag) setTagsInput(prev => prev ? `${prev}, ${newTag}` : newTag);
                        }}
                        className="text-[#7070FF] font-black text-[14px] ml-2 hover:bg-[#7070FF]/5 px-3 py-1.5 rounded-lg transition-colors px-0 cursor-pointer"
                    >
                        + Add tags
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 mb-12 px-7 py-4 bg-white dark:bg-slate-800 rounded-[24px] shadow-[0_12px_40px_-5px_rgba(0,0,0,0.1)] border border-slate-50 dark:border-slate-700/50 w-fit mx-auto sticky top-6 z-10 transition-shadow">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(content);
                            displayStatus('Copied!');
                        }}
                        className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-3 hover:text-[#0F172A] dark:hover:text-white transition-colors px-0 cursor-pointer"
                    >Copy</button>
                    <div className="w-[2px] h-5 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button
                        onClick={async () => {
                            const text = await navigator.clipboard.readText();
                            insertTextAtCursor(text);
                        }}
                        className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-3 hover:text-[#0F172A] dark:hover:text-white transition-colors px-0 cursor-pointer"
                    >Paste</button>
                    <div className="w-[2px] h-5 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('**bold** ')} className="text-[#1E293B] dark:text-white font-[900] text-[19px] px-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors px-0 cursor-pointer">B</button>
                    <button onClick={() => insertTextAtCursor('*italic* ')} className="text-[#1E293B] dark:text-white italic text-[19px] px-3 serif hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors px-0 cursor-pointer">I</button>
                    <div className="w-[2px] h-5 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('- ')} className="flex items-center gap-2 text-[#64748B] dark:text-white font-black text-[15px] px-3 hover:text-[#0F172A] dark:hover:text-white transition-colors px-0 cursor-pointer">
                        <span className="w-2 h-2 rounded-full bg-[#7070FF]"></span>
                        List
                    </button>
                </div>

                <div className="relative min-h-[500px]">
                    <textarea
                        ref={textareaRef}
                        placeholder="Start your masterpiece here..."
                        className="w-full h-full min-h-[500px] bg-transparent text-[#64748B] dark:text-slate-400 text-[23px] font-medium resize-none outline-none border-none focus:ring-0 leading-[1.7] placeholder-slate-200 dark:placeholder-slate-800 p-0"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </main>

            {/* Voice FAB */}
            <button
                onClick={toggleVoice}
                className={`fixed bottom-12 right-12 w-[84px] h-[84px] rounded-full flex items-center justify-center shadow-[0_20px_50px_-8px_rgba(112,112,255,0.45)] transition-all hover:scale-105 active:scale-95 group z-50 px-0 cursor-pointer ${isListening
                        ? 'bg-[#F43F5E] animate-pulse text-white'
                        : 'bg-[#7070FF] text-white'
                    }`}
            >
                <span className="material-symbols-rounded text-[38px]">mic</span>
            </button>

            {/* Footer */}
            {!isFocusMode && (
                <footer className="px-10 py-7 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between text-[#94A3B8] dark:text-slate-500 bg-white/50 dark:bg-[#0B0F1A]/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-[20px]">link</span>
                        <span className="text-[14px] font-bold">Linked to:</span>
                        <span className="text-[#7070FF] font-black text-[14px]">{window.location.hostname}</span>
                    </div>
                    <div className="relative w-6 h-6 overflow-hidden">
                        <div className="absolute top-0 right-0 w-[141%] h-[141%] bg-[#7070FF]/10 rotate-45 translate-x-[50%] translate-y-[50%] transition-colors"></div>
                    </div>
                </footer>
            )}

            {/* Resize Tool */}
            {!isFocusMode && (
                <div
                    onMouseDown={handleResizeDown}
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-[100] flex items-end justify-end p-1.5 group"
                >
                    <div className="w-4 h-4 border-r-4 border-b-4 border-[#7070FF]/20 group-hover:border-[#7070FF]/50 transition-colors rounded-[2px]"></div>
                </div>
            )}

            {/* Status Toast */}
            {showStatus && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 bg-[#1E293B] text-white rounded-2xl shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    {showStatus}
                </div>
            )}
        </div>
    );
};

export default FloatingPanel;

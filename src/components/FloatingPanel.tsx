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

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [noteColor, setNoteColor] = useState('#8B5CF6'); // Purple from image
    const [isDark, setIsDark] = useState(false);
    const [showStatus, setShowStatus] = useState<string | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        storage.getPanelLayout().then(setLayout);
        const savedTheme = localStorage.getItem('theme');
        setIsDark(savedTheme === 'dark');

        chrome.storage.local.get(['panelDraft']).then((res) => {
            const draft = res.panelDraft as any;
            if (draft) {
                setTitle(draft.title || 'RMD ENGINEERING COLLEGE');
                setContent(draft.content || '');
                setTagsInput(draft.tags ? draft.tags.join(', ') : 'education, college');
                setIsPinned(draft.pinned || false);
                setNoteColor(draft.color || '#8B5CF6');
            } else {
                setTitle('RMD ENGINEERING COLLEGE');
                setTagsInput('education, college');
            }
        });

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
            color: noteColor,
            domain: window.location.hostname,
            url: window.location.href
        };
        await storage.createNote(draft);
        displayStatus('Note Saved!');
    };

    const handleExport = () => {
        const textToExport = `Title: ${title}\n\n${content}\n\nTags: ${tagsInput}`;
        const blob = new Blob([textToExport], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        displayStatus('Exported!');
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
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                borderRadius: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                backgroundColor: isDark ? '#0B0F1A' : '#FFFFFF',
                border: '1px solid rgba(112, 112, 255, 0.1)',
            } : {
                width: '100vw',
                height: '100vh',
                backgroundColor: isDark ? '#0B0F1A' : '#FFFFFF',
                pointerEvents: 'auto',
            }}
        >
            {/* 1. Header Cluster */}
            <header
                onMouseDown={handleDragDown}
                className="px-7 py-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] cursor-move select-none"
            >
                <div className="flex items-center gap-5">
                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 transition-colors px-0 cursor-pointer"
                    >
                        <span className="material-symbols-rounded text-[#475569] dark:text-slate-400">chevron_left</span>
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[20px] font-black text-[#1E293B] dark:text-white leading-[1.05]">Sticky</span>
                        <span className="text-[20px] font-black text-[#1E293B] dark:text-white leading-[1.05]">Note</span>
                    </div>
                </div>

                <div className="flex items-center gap-4" onMouseDown={e => e.stopPropagation()}>
                    <div className="flex bg-[#F8FAFC] dark:bg-slate-800/50 p-1.5 rounded-full gap-0 border border-slate-50 dark:border-slate-700/50">
                        <button className="w-10 h-10 flex items-center justify-center text-[#EAB308] hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors px-0 cursor-pointer">
                            <span className="material-symbols-rounded text-[22px] fill-current">lightbulb</span>
                        </button>
                        <button onClick={handleExport} className="w-10 h-10 flex items-center justify-center text-[#F97316] hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors px-0 cursor-pointer" title="Export to .txt">
                            <span className="material-symbols-rounded text-[22px]">ios_share</span>
                        </button>
                        <button onClick={() => setIsFocusMode(true)} className="w-10 h-10 flex items-center justify-center text-[#8B5CF6] hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors px-0 cursor-pointer" title="Focus Mode">
                            <span className="material-symbols-rounded text-[22px]">open_in_full</span>
                        </button>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-[#7070FF] text-white px-9 py-3 rounded-[18px] font-black text-[15px] shadow-[0_10px_30px_-5px_rgba(112,112,255,0.45)] hover:brightness-110 active:scale-95 transition-all tracking-tight px-0 cursor-pointer"
                    >
                        Save
                    </button>
                </div>
            </header>

            {isFocusMode && (
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="fixed top-8 right-8 w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-[10000] text-slate-500 hover:text-[#7070FF] transition-all shadow-xl px-0 cursor-pointer"
                >
                    <span className="material-symbols-rounded text-2xl">close_fullscreen</span>
                </button>
            )}

            {/* 2. Content Body */}
            <main className={`flex-1 overflow-auto px-10 pb-32 transition-all ${isFocusMode ? 'pt-24 max-w-4xl mx-auto w-full' : 'pt-12'}`}>
                {/* Meta Bar */}
                {!isFocusMode && (
                    <div className="flex items-center justify-between mb-10">
                        <button onClick={onClose} className="flex items-center gap-2 group px-0 cursor-pointer">
                            <span className="material-symbols-rounded text-[#7070FF] text-lg font-black">arrow_back</span>
                            <span className="text-[#7070FF] font-black text-[13px] tracking-[0.15em] uppercase">Drafts</span>
                        </button>
                        <div className="flex items-center gap-7">
                            <button
                                onClick={() => setIsPinned(!isPinned)}
                                className={`transition-all duration-300 hover:scale-125 px-0 cursor-pointer ${isPinned ? 'text-[#F43F5E]' : 'text-[#FDA4AF]/50'}`}
                            >
                                <span className={`material-symbols-rounded text-[26px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                            </button>
                            <button
                                onClick={() => {
                                    const cols = ['#8B5CF6', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6'];
                                    setNoteColor(cols[(cols.indexOf(noteColor) + 1) % cols.length]);
                                }}
                                className="w-7 h-7 rounded-[6px] shadow-sm ring-2 ring-transparent hover:ring-slate-200 transition-all active:scale-90 px-0 cursor-pointer"
                                style={{ backgroundColor: noteColor }}
                            ></button>
                            <button className="text-slate-300 hover:text-slate-500 transition-colors px-0 cursor-pointer">
                                <span className="material-symbols-rounded text-[28px]">more_horiz</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Title */}
                <input
                    type="text"
                    className="w-full bg-transparent text-[38px] font-black text-[#1E293B] dark:text-white mb-8 outline-none border-none focus:ring-0 placeholder-[#E2E8F0] dark:placeholder-slate-800 leading-tight tracking-tight p-0 uppercase"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Tags Pill Cluster */}
                <div className="flex flex-wrap gap-3.5 mb-14 items-center">
                    {tags.map((tag, idx) => (
                        <div
                            key={idx}
                            className={`px-5 py-2.5 rounded-full flex items-center gap-3 text-[14px] font-black shadow-sm ${idx === 0
                                ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#064E3B] dark:text-[#34D399]'
                                : 'bg-[#FEF9C3] text-[#854D0E] dark:bg-[#78350F] dark:text-[#FBBF24]'
                                }`}
                        >
                            #{tag.toLowerCase()}
                            <button onClick={() => setTagsInput(tags.filter((_, i) => i !== idx).join(', '))} className="opacity-40 hover:opacity-100 flex items-center px-0 cursor-pointer">
                                <span className="material-symbols-rounded text-[16px]">close</span>
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newTag = prompt('Add tag:');
                            if (newTag) setTagsInput(prev => prev ? `${prev}, ${newTag}` : newTag);
                        }}
                        className="text-[#7070FF] font-black text-[14px] ml-1 hover:bg-[#7070FF]/5 px-3 py-1.5 rounded-xl transition-colors px-0 cursor-pointer"
                    >
                        + Add tags
                    </button>
                </div>

                {/* Rich Toolbar */}
                <div className="flex items-center gap-1 mb-14 px-8 py-5 bg-white dark:bg-slate-800 rounded-[28px] shadow-[0_15px_45px_-10px_rgba(0,0,0,0.12)] border border-slate-50 dark:border-slate-700/50 w-fit mx-auto sticky top-8 z-10 transition-shadow">
                    <button onClick={() => { navigator.clipboard.writeText(content); displayStatus('Copied!'); }} className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-4 hover:text-[#1E293B] dark:hover:text-white transition-colors px-0 cursor-pointer">Copy</button>
                    <div className="w-[1.5px] h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={async () => insertTextAtCursor(await navigator.clipboard.readText())} className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-4 hover:text-[#1E293B] dark:hover:text-white transition-colors px-0 cursor-pointer">Paste</button>
                    <div className="w-[1.5px] h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('**bold** ')} className="text-[#1E293B] dark:text-white font-black text-[19px] px-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl px-0 cursor-pointer">B</button>
                    <button onClick={() => insertTextAtCursor('*italic* ')} className="text-[#1E293B] dark:text-white italic text-[19px] px-4 serif hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl px-0 cursor-pointer">I</button>
                    <div className="w-[1.5px] h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('- ')} className="flex items-center gap-2.5 px-4 h-10 text-[15px] font-black text-[#64748B] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl px-0 cursor-pointer">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7070FF]"></span>
                        List
                    </button>
                </div>

                <div className="relative min-h-[400px]">
                    <textarea
                        ref={textareaRef}
                        placeholder="Start your masterpiece here..."
                        className="w-full h-full min-h-[400px] bg-transparent text-[#64748B] dark:text-slate-300 text-[24px] font-medium resize-none outline-none border-none focus:ring-0 leading-[1.75] placeholder-[#E2E8F0] dark:placeholder-slate-800 p-0"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </main>

            {/* 3. Real Mic FAB */}
            <button
                onClick={toggleVoice}
                className={`fixed bottom-14 right-12 w-[92px] h-[92px] rounded-full flex items-center justify-center shadow-[0_25px_60px_-10px_rgba(112,112,255,0.45)] transition-all hover:scale-105 active:scale-95 z-50 px-0 cursor-pointer ${isListening ? 'bg-[#F43F5E] animate-pulse text-white' : 'bg-[#7070FF] text-white'
                    }`}
            >
                <span className="material-symbols-rounded text-[42px]">mic</span>
            </button>

            {/* 4. Footer & Triangle Accent */}
            {!isFocusMode && (
                <footer className="px-10 py-8 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between bg-white/50 dark:bg-[#0B0F1A]/50 backdrop-blur-md">
                    <div className="flex items-center gap-3.5 text-[#94A3B8] dark:text-slate-500 font-bold text-[14px]">
                        <span className="material-symbols-rounded text-[18px]">link</span>
                        <span>Linked to:</span>
                        <a href={`https://${window.location.hostname}`} target="_blank" className="text-[#7070FF] font-black hover:underline">{window.location.hostname}</a>
                    </div>
                    {/* The Blue Triangle Accent */}
                    <div className="absolute bottom-0 right-0 w-10 h-10 overflow-hidden pointer-events-none">
                        <div className="absolute bottom-[-20px] right-[-20px] w-10 h-10 bg-[#7070FF]/20 rotate-45"></div>
                    </div>
                </footer>
            )}

            {/* Resize Tool */}
            {!isFocusMode && (
                <div onMouseDown={handleResizeDown} className="absolute bottom-0 right-0 w-12 h-12 cursor-nwse-resize z-[100] bg-transparent"></div>
            )}

            {showStatus && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] px-7 py-3.5 bg-[#1E293B] text-white rounded-2xl shadow-2xl font-black text-[14px] animate-in fade-in slide-in-from-top-4 duration-300">
                    {showStatus}
                </div>
            )}
        </div>
    );
};

export default FloatingPanel;

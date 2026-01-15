import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft } from '../types';

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
    const [tagsInput, setTagsInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [noteColor, setNoteColor] = useState('#8B5CF6'); // Default purple
    const [showStatus, setShowStatus] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (initialNote) {
            setTitle(initialNote.title);
            setContent(initialNote.content);
            setTagsInput(initialNote.tags.join(', '));
            setIsPinned(initialNote.pinned || false);
            setNoteColor(initialNote.color || '#8B5CF6');
        }

        if ('webkitSpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    insertTextAtCursor(finalTranscript + ' ');
                }
            };

            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onerror = () => setIsListening(false);
        }
    }, [initialNote]);

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

    const handleSave = () => {
        if (!title.trim() && !content.trim()) return;
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        onSave({
            title: title || 'Untitled',
            content,
            tags,
            domain: initialNote?.domain,
            url: initialNote?.url,
            pinned: isPinned,
            color: noteColor
        }, initialNote?.id);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        displayStatus('Copied to clipboard!');
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            insertTextAtCursor(text);
        } catch (err) {
            displayStatus('Paste failed');
        }
    };

    const handleExport = () => {
        const textToExport = `Title: ${title || 'Untitled'}\n\n${content}\n\nTags: ${tagsInput}\nSource: ${initialNote?.url || 'N/A'}`;
        const blob = new Blob([textToExport], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(title || 'Note').replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        displayStatus('Note exported as .txt');
    };

    const handleToggleFavorite = () => {
        const newPinned = !isPinned;
        setIsPinned(newPinned);

        // Immediate save for favorite state if note exists
        if (initialNote?.id) {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            onSave({
                title: title || 'Untitled',
                content,
                tags,
                domain: initialNote?.domain,
                url: initialNote?.url,
                pinned: newPinned,
                color: noteColor
            }, initialNote?.id);
        }

        displayStatus(newPinned ? 'Added to Favorites' : 'Removed from Favorites');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            insertTextAtCursor(text + '\n');
        }
    };

    const toggleColor = () => {
        const colors = ['#8B5CF6', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6'];
        const nextIdx = (colors.indexOf(noteColor) + 1) % colors.length;
        setNoteColor(colors[nextIdx]);
    };

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    return (
        <div
            className={`flex flex-col h-full bg-[#FCFCFF] dark:bg-[#0B0F1A] transition-all duration-300 relative font-display ${isFocusMode ? 'fixed inset-0 z-[9999]' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {/* Header Cluster */}
            <header className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B0F1A]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="w-11 h-11 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm bg-white dark:bg-slate-900"
                    >
                        <span className="material-symbols-rounded text-[#1E293B] dark:text-slate-300">chevron_left</span>
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[19px] font-[900] text-[#1E293B] dark:text-white leading-[1.1]">Sticky</span>
                        <span className="text-[19px] font-[900] text-[#1E293B] dark:text-white leading-[1.1]">Note</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-[#F8FAFC] dark:bg-slate-800/50 p-1 rounded-[20px] gap-0 border border-slate-100 dark:border-slate-700/50">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={onToggleTheme}
                            className="w-11 h-11 flex items-center justify-center text-amber-400 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors"
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <span className="material-symbols-rounded text-[24px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                        </button>
                        {/* Export to TXT Button */}
                        <button
                            onClick={handleExport}
                            className="w-11 h-11 flex items-center justify-center text-[#F97316] hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors"
                            title="Export as .txt"
                        >
                            <span className="material-symbols-rounded text-[24px]">download</span>
                        </button>
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${isFocusMode ? 'text-[#7070FF] bg-white dark:bg-slate-700' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}
                            title="Focus Mode"
                        >
                            <span className="material-symbols-rounded text-[24px]">open_in_full</span>
                        </button>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-[#7070FF] text-white px-9 py-3 rounded-[18px] font-black text-sm shadow-[0_8px_25px_-4px_rgba(112,112,255,0.5)] hover:brightness-110 transition-all active:scale-95 tracking-wide"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Content Body */}
            <div className={`flex-1 overflow-auto px-10 pt-10 pb-32 transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full' : ''}`}>
                {/* Meta Bar */}
                <div className="flex items-center justify-between mb-10">
                    <button onClick={onCancel} className="flex items-center gap-2 group">
                        <span className="material-symbols-rounded text-[#7070FF] text-lg font-bold">arrow_back</span>
                        <span className="text-[#7070FF] font-[900] text-[12px] tracking-[0.14em] uppercase">Drafts</span>
                    </button>
                    <div className="flex items-center gap-6">
                        {/* Heart Option for Favorites */}
                        <button
                            onClick={handleToggleFavorite}
                            className={`transition-all duration-300 hover:scale-125 ${isPinned ? 'text-[#F43F5E]' : 'text-slate-300'}`}
                            title={isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
                        >
                            <span className={`material-symbols-rounded text-[24px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                        </button>
                        <button
                            onClick={toggleColor}
                            className="w-7 h-7 rounded-[6px] shadow-sm ring-2 ring-transparent hover:ring-slate-200 transition-all active:scale-90"
                            style={{ backgroundColor: noteColor }}
                            title="Change Note Color"
                        ></button>
                        <button
                            onClick={() => displayStatus('Additional options coming soon!')}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-symbols-rounded text-[26px]">more_horiz</span>
                        </button>
                    </div>
                </div>

                {/* Title Input */}
                <input
                    type="text"
                    placeholder="Note Title"
                    className="w-full bg-transparent text-[38px] font-[900] text-[#0F172A] dark:text-white mb-6 outline-none placeholder-slate-200 dark:placeholder-slate-800 leading-tight uppercase tracking-tight"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Tag Cluster */}
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
                                onClick={() => {
                                    const newTags = tags.filter((_, i) => i !== idx);
                                    setTagsInput(newTags.join(', '));
                                }}
                                className="opacity-50 hover:opacity-100 flex items-center"
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
                        className="text-[#7070FF] font-black text-[14px] ml-2 hover:bg-[#7070FF]/5 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        + Add tags
                    </button>
                </div>

                {/* Floating Rich Text Toolbar */}
                <div className="flex items-center gap-1 mb-12 px-7 py-4 bg-white dark:bg-slate-800 rounded-[24px] shadow-[0_12px_40px_-5px_rgba(0,0,0,0.1)] border border-slate-50 dark:border-slate-700/50 w-fit mx-auto sticky top-6 z-10 transition-shadow">
                    <button onClick={handleCopy} className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-3 hover:text-[#0F172A] dark:hover:text-white transition-colors">Copy</button>
                    <div className="w-[2px] h-5 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={handlePaste} className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-3 hover:text-[#0F172A] dark:hover:text-white transition-colors">Paste</button>
                    <div className="w-[2px] h-5 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('**bold** ')} className="text-[#1E293B] dark:text-white font-[900] text-[19px] px-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">B</button>
                    <button onClick={() => insertTextAtCursor('*italic* ')} className="text-[#1E293B] dark:text-white italic text-[19px] px-3 serif hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">I</button>
                    <div className="w-[2px] h-5 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('- ')} className="flex items-center gap-2 text-[#64748B] dark:text-white font-black text-[15px] px-3 hover:text-[#0F172A] dark:hover:text-white transition-colors">
                        <span className="w-2 h-2 rounded-full bg-[#7070FF]"></span>
                        List
                    </button>
                </div>

                {/* Main Text Surface */}
                <div className="relative min-h-[500px]">
                    <textarea
                        ref={textareaRef}
                        placeholder="Start your masterpiece here..."
                        className="w-full h-full min-h-[500px] bg-transparent text-[#64748B] dark:text-slate-400 text-[23px] font-medium resize-none outline-none leading-[1.7] placeholder-slate-200 dark:placeholder-slate-800"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </div>

            {/* Voice Dictation FAB */}
            <button
                onClick={toggleVoice}
                className={`fixed bottom-12 right-12 w-[88px] h-[88px] rounded-full flex items-center justify-center shadow-[0_20px_50px_-8px_rgba(112,112,255,0.45)] transition-all hover:scale-105 active:scale-95 group z-50 ${isListening
                        ? 'bg-[#F43F5E] animate-pulse text-white'
                        : 'bg-[#7070FF] text-white'
                    }`}
                title={isListening ? 'Stop Listening' : 'Start Dictation'}
            >
                <span className="material-symbols-rounded text-[40px]">mic</span>
                {!isListening && (
                    <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                )}
            </button>

            {/* Context Footer */}
            <footer className="px-10 py-7 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between text-[#94A3B8] dark:text-slate-500 bg-white/50 dark:bg-[#0B0F1A]/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-[20px]">link</span>
                    <span className="text-[14px] font-bold">Linked to:</span>
                    <a
                        href={initialNote?.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7070FF] font-black text-[14px] hover:underline"
                    >
                        {initialNote?.domain || 'localhost'}
                    </a>
                </div>
                {/* Decorative Triangle Accent */}
                <div className="relative w-6 h-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[141%] h-[141%] bg-[#7070FF]/10 rotate-45 translate-x-[50%] translate-y-[50%] transition-colors group-hover:bg-[#7070FF]/20"></div>
                </div>
            </footer>

            {/* Status Toast */}
            {showStatus && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 bg-[#1E293B] text-white rounded-2xl shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    {showStatus}
                </div>
            )}
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft } from '../types';

interface NoteEditorProps {
    initialNote?: Note | null;
    onSave: (draft: NoteDraft, id?: string) => void;
    onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ initialNote, onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (initialNote) {
            setTitle(initialNote.title);
            setContent(initialNote.content);
            setTagsInput(initialNote.tags.join(', '));
        }

        // Setup Speech Recognition (Browser support check)
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
            // Defer cursor update
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
            title,
            content,
            tags,
            domain: initialNote?.domain,
            url: initialNote?.url,
            pinned: initialNote?.pinned || false
        }, initialNote?.id);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            insertTextAtCursor(text);
        } catch (err) {
            console.error('Failed to read clipboard');
        }
    };

    // Drag & Drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            insertTextAtCursor(text + '\n');
        }
    };

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    return (
        <div
            className={`flex flex-col h-full bg-[#FCFCFF] dark:bg-slate-900 transition-all duration-300 relative ${isFocusMode ? 'p-0' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {/* Main Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-rounded text-slate-600 dark:text-slate-400">chevron_left</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-extrabold text-[#1E293B] dark:text-white leading-tight">Sticky</h1>
                        <h1 className="text-xl font-extrabold text-[#1E293B] dark:text-white leading-tight">Note</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl gap-1">
                        <button className="w-10 h-10 flex items-center justify-center text-amber-400">
                            <span className="material-symbols-rounded">lightbulb</span>
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center text-orange-500">
                            <span className="material-symbols-rounded">ios_share</span>
                        </button>
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={`w-10 h-10 flex items-center justify-center ${isFocusMode ? 'text-primary' : 'text-slate-400'}`}
                        >
                            <span className="material-symbols-rounded">open_in_full</span>
                        </button>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/30 hover:brightness-110 transition-all active:scale-95"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className={`flex-1 overflow-auto px-8 pt-8 pb-32 transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full' : ''}`}>
                {/* Meta Bar */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary text-sm">arrow_back</span>
                        <span className="text-primary font-bold text-xs tracking-widest uppercase">Drafts</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="text-rose-400">
                            <span className="material-symbols-rounded fill-current">favorite</span>
                        </button>
                        <button className="w-6 h-6 rounded bg-violet-500"></button>
                        <button className="text-slate-400">
                            <span className="material-symbols-rounded text-xl">more_horiz</span>
                        </button>
                    </div>
                </div>

                {/* Title */}
                <input
                    type="text"
                    placeholder="Note Title"
                    className="w-full bg-transparent text-4xl font-extrabold text-[#1E293B] dark:text-white mb-6 outline-none placeholder-slate-200 dark:placeholder-slate-700 leading-tight"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                />

                {/* Tags */}
                <div className="flex flex-wrap gap-3 mb-8 items-center">
                    {tags.map((tag, idx) => (
                        <div
                            key={idx}
                            className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold ${idx % 2 === 0
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                }`}
                        >
                            #{tag}
                            <button onClick={() => {
                                const newTags = tags.filter((_, i) => i !== idx);
                                setTagsInput(newTags.join(', '));
                            }}>
                                <span className="material-symbols-rounded text-sm">close</span>
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newTag = prompt('Enter new tag:');
                            if (newTag) setTagsInput(prev => prev ? `${prev}, ${newTag}` : newTag);
                        }}
                        className="text-primary font-bold text-sm ml-1"
                    >
                        + Add tags
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-4 mb-10 px-6 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-50 dark:border-slate-700/50 w-fit mx-auto sticky top-0 z-10 transition-shadow hover:shadow-md">
                    <button onClick={handleCopy} className="text-slate-600 dark:text-slate-300 font-bold text-sm px-2">Copy</button>
                    <div className="w-px h-4 bg-slate-100 dark:bg-slate-700"></div>
                    <button onClick={handlePaste} className="text-slate-600 dark:text-slate-300 font-bold text-sm px-2">Paste</button>
                    <div className="w-px h-4 bg-slate-100 dark:bg-slate-700"></div>
                    <button onClick={() => insertTextAtCursor('**bold** ')} className="text-slate-800 dark:text-white font-extrabold text-lg px-2">B</button>
                    <button onClick={() => insertTextAtCursor('*italic* ')} className="text-slate-800 dark:text-white italic text-lg px-2">I</button>
                    <div className="w-px h-4 bg-slate-100 dark:bg-slate-700"></div>
                    <button onClick={() => insertTextAtCursor('- ')} className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm px-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                        List
                    </button>
                </div>

                {/* Editor Surface */}
                <div className="relative min-h-[400px]">
                    <textarea
                        ref={textareaRef}
                        placeholder="Start your masterpiece here..."
                        className="w-full h-full min-h-[400px] bg-transparent text-slate-600 dark:text-slate-300 text-xl resize-none outline-none leading-relaxed placeholder-slate-200 dark:placeholder-slate-700"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </div>

            {/* Voice FAB */}
            <button
                onClick={toggleVoice}
                className={`fixed bottom-24 right-8 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 z-50 ${isListening
                        ? 'bg-rose-500 animate-pulse text-white'
                        : 'bg-primary text-white shadow-primary/40'
                    }`}
                title={isListening ? 'Stop Listening' : 'Start Dictation'}
            >
                <span className="material-symbols-rounded text-3xl">mic</span>
                {!isListening && (
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
                )}
            </button>

            {/* Footer */}
            <footer className="px-8 py-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
                {initialNote?.url ? (
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="material-symbols-rounded text-sm">link</span>
                        Linked to: <a href={initialNote.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{initialNote.domain}</a>
                    </div>
                ) : (
                    <div className="text-xs font-medium">New Draft</div>
                )}
                <div className="w-4 h-4 rounded-tl-full border-t border-l border-primary/20"></div>
            </footer>
        </div>
    );
};

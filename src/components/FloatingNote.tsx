import React, { useState, useEffect, useRef } from 'react';
import type { Note } from '../types';
import { storage } from '../utils/storage';

interface FloatingNoteProps {
    note: Note;
    onUpdate: (id: string, position: { x: number, y: number }) => void;
    onSave?: (note: Note) => void;
    onDelete?: (id: string) => void;
}

export const FloatingNote: React.FC<FloatingNoteProps> = ({ note, onUpdate, onSave, onDelete }) => {
    const [position, setPosition] = useState(note.position || { x: 50, y: 50 });
    const [title, setTitle] = useState(note.title || '');
    const [content, setContent] = useState(note.content || '');
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isDark, setIsDark] = useState(false); // Can be prop or storage

    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setPosition(note.position || { x: 50, y: 50 });
        setTitle(note.title || '');
        setContent(note.content || '');
    }, [note]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            const newPos = {
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            };
            setPosition(newPos);
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            onUpdate(note.id, position);
        }
    };

    const handleSave = async () => {
        const updatedNote: Note = {
            ...note,
            title,
            content,
            position,
            updatedAt: Date.now()
        };
        if (onSave) {
            onSave(updatedNote);
        } else {
            await storage.saveNote(updatedNote);
        }
    };

    // Date formatting matching StickyNotes
    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase().replace(/(\d+)/, '$1,');

    const domain = note.domain || 'chat.deepseek.com';

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: '380px', // Matches min-width of StickyNotes
                height: 'auto',
                minHeight: '400px',
                zIndex: 99999,
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                color: isDark ? 'white' : '#1e293b',
            }}
            className={`font-display flex flex-col rounded-[32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] border ${isDark ? 'border-white/10' : 'border-black/5'}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Header */}
            <header
                onMouseDown={handleMouseDown}
                className="px-8 py-6 flex items-center justify-between cursor-move select-none border-b border-slate-50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-t-[32px]"
            >
                <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-sm pointer-events-none">
                        <span className="material-symbols-rounded text-slate-500 text-[24px]">drag_indicator</span>
                    </div>
                    <span className="text-[18px] font-extrabold text-[#94A3B8] dark:text-white/40 tracking-wider whitespace-nowrap">NOTE</span>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-[#4F46E5] dark:hover:text-white transition-colors cursor-pointer">
                        <span className="material-symbols-rounded text-[24px]">{isDark ? 'dark_mode' : 'light_mode'}</span>
                    </button>
                    <button onClick={handleSave} className="bg-[#4F46E5] text-white px-6 py-2 rounded-full font-bold text-[14px] hover:bg-[#4338CA] active:scale-95 transition-all shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)]">
                        Save
                    </button>
                    {onDelete && (
                        <button onClick={() => onDelete(note.id)} className="w-10 h-10 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-full transition-colors cursor-pointer">
                            <span className="material-symbols-rounded text-[24px]">delete</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden p-8 pt-6">

                {/* Date and Action Pill */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[#94A3B8] dark:text-white/30 text-[14px] font-bold tracking-[0.1em] whitespace-nowrap">{formattedDate}</span>
                </div>

                {/* Linked Domain Pill */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#EEF2FF] dark:bg-indigo-500/5 border border-[#E0E7FF] dark:border-indigo-500/10 rounded-xl text-[#4F46E5] dark:text-indigo-400 font-bold text-[13px] flex-shrink-0">
                        <span className="material-symbols-rounded text-[18px]">language</span>
                        <span className="whitespace-nowrap truncate max-w-[150px]">{domain}</span>
                    </div>
                </div>

                {/* Primary Content Editor */}
                <textarea
                    className="w-full bg-transparent text-[36px] font-black text-[#1E293B] dark:text-white mb-4 outline-none border-none focus:ring-0 placeholder-slate-200 dark:placeholder-white/5 leading-[1.1] tracking-tighter p-0 resize-none font-display overflow-hidden min-h-[100px]"
                    placeholder="Type something..."
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                />

                {/* Secondary Title Area (# Hashtag) */}
                <div className="flex items-center gap-2 mt-auto group pt-4 border-t border-slate-50 dark:border-white/5">
                    <span className="text-[#94A3B8] dark:text-white/20 text-[18px] font-bold flex-shrink-0">#</span>
                    <textarea
                        rows={1}
                        className="flex-1 bg-transparent text-[18px] font-bold text-[#94A3B8] dark:text-white/30 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/10 p-0 resize-none font-display overflow-hidden"
                        placeholder="Tags"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                </div>
            </main>
        </div>
    );
};

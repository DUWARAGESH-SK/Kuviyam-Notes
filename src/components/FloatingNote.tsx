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
    const [tagsInput, setTagsInput] = useState(note.tags ? note.tags.join(', ') : '');
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isDark, setIsDark] = useState(false);

    const dragStart = useRef({ x: 0, y: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPosition(note.position || { x: 50, y: 50 });
        setTitle(note.title || '');
        setContent(note.content || '');
        setTagsInput(note.tags ? note.tags.join(', ') : '');
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
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const updatedNote: Note = {
            ...note,
            title,
            content,
            tags,
            position,
            updatedAt: Date.now()
        };
        if (onSave) {
            onSave(updatedNote);
        } else {
            await storage.saveNote(updatedNote);
        }
    };

    const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase().replace(/(\d+)/, '$1,');

    const domain = note.domain || 'chat.deepseek.com';

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 99999,
            }}
            className={`font-display flex flex-col w-[380px] min-h-[400px] rounded-3xl shadow-2xl transition-colors duration-200 border ${isDark ? 'bg-[#0F1115] border-white/10 text-white' : 'bg-white border-slate-100 text-[#1E293B]'} overflow-hidden`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Header - Draggable Area */}
            <header
                onMouseDown={handleMouseDown}
                className="px-8 py-6 flex items-center justify-between cursor-move select-none border-b border-transparent bg-transparent"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-extrabold text-[#94A3B8] tracking-wider whitespace-nowrap">EDIT NOTE</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-indigo-500 transition-colors rounded-full"
                    >
                        <span className="material-symbols-rounded text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-[#4F46E5] text-white px-6 py-2 rounded-full font-bold text-[14px] hover:bg-[#4338CA] active:scale-95 transition-all shadow-md"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 flex flex-col px-8 pb-8 pt-2 overflow-y-auto custom-scrollbar">

                {/* Date */}
                <div className="mb-2">
                    <span className="text-[#94A3B8] text-[11px] font-bold tracking-[0.15em] whitespace-nowrap uppercase">
                        {formattedDate}
                    </span>
                </div>

                {/* Linked Domain - Plain Text */}
                <div className="mb-8 flex items-center gap-2 text-[#4F46E5] dark:text-indigo-400 font-bold text-[13px]">
                    <span className="material-symbols-rounded text-[16px]">public</span>
                    <span className="truncate">Linked to {domain}</span>
                    <span className="material-symbols-rounded text-[14px] opacity-50">open_in_new</span>
                </div>

                {/* Title Input (Big) - "UI Issues in" */}
                <textarea
                    rows={1}
                    className="w-full bg-transparent text-[36px] font-black text-[#1E293B] dark:text-white mb-2 outline-none border-none focus:ring-0 placeholder-slate-200 dark:placeholder-white/10 leading-[1.1] tracking-tight p-0 resize-none overflow-hidden"
                    placeholder="UI Issues in"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        autoResize(e);
                    }}
                />

                {/* Tags Input (Secondary) - "# Actualize Tags" */}
                <div className="flex items-start gap-1 mb-8">
                    <span className="text-[#94A3B8] text-[18px] font-bold mt-0.5">#</span>
                    <textarea
                        rows={1}
                        className="flex-1 bg-transparent text-[18px] font-bold text-[#94A3B8] outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/10 p-0 resize-none overflow-hidden"
                        placeholder="Actualize Tags"
                        value={tagsInput}
                        onChange={(e) => {
                            setTagsInput(e.target.value);
                            autoResize(e);
                        }}
                    />
                </div>

                {/* Content Input (Body) */}
                <textarea
                    className="w-full flex-1 bg-transparent text-[16px] font-medium text-[#334155] dark:text-slate-300 outline-none border-none focus:ring-0 placeholder-slate-400 dark:placeholder-white/10 p-0 resize-none min-h-[100px]"
                    placeholder="Type something amazing..."
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        autoResize(e);
                    }}
                />
            </main>
        </div>
    );
};

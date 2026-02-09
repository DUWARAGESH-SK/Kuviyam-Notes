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
    const [isDark, setIsDark] = useState(false);

    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setPosition(note.position || { x: 50, y: 50 });
        setTitle(note.title || '');
        setContent(note.content || '');
    }, [note]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('input')) return;
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
                width: '380px',
                height: 'auto',
                minHeight: '400px',
                zIndex: 99999,
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                color: isDark ? 'white' : '#1e293b',
            }}
            className="flex flex-col rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 font-sans"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* SIMPLE HEADER - No icons */}
            <header
                onMouseDown={handleMouseDown}
                className="px-6 py-4 flex items-center justify-between cursor-move border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-lg"
            >
                <span className="text-lg font-bold text-gray-900 dark:text-white">EDIT NOTE</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase font-bold"
                    >
                        {isDark ? 'Light' : 'Dark'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* SIMPLE CONTENT - Matches Image 2 */}
            <main className="flex-1 flex flex-col p-6 bg-white dark:bg-gray-900 rounded-b-lg">
                {/* Date */}
                <div className="mb-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {formattedDate}
                    </span>
                </div>

                {/* Linked Domain - Plain text */}
                <div className="mb-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        Linked to {domain}
                    </span>
                </div>

                {/* "UI Issues in" Label - Fixed Text as per design requirement */}
                <div className="mb-1">
                    <p className="w-full text-lg font-medium text-gray-700 dark:text-gray-300">
                        UI Issues in
                    </p>
                </div>

                {/* Hashtag Heading / Title */}
                <div className="mb-6 flex items-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white mr-2">#</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-2xl font-bold text-gray-900 dark:text-white outline-none border-none focus:ring-0 p-0 placeholder-gray-300"
                        placeholder="Actualize Tags"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {/* Main Content */}
                <textarea
                    className="w-full flex-1 bg-transparent text-gray-700 dark:text-gray-300 outline-none border-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-500 p-0 resize-none text-base min-h-[200px]"
                    placeholder="Type something amazing..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </main>
        </div>
    );
};

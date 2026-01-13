import React, { useState, useEffect } from 'react';
import type { Note, NoteDraft } from '../types';

interface NoteEditorProps {
    initialNote?: Note | null;
    onSave: (draft: NoteDraft, id?: string) => void;
    onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ initialNote, onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (initialNote) {
            setTitle(initialNote.title);
            setContent(initialNote.content);
        } else {
            setTitle('');
            setContent('');
        }
    }, [initialNote]);

    const handleSave = () => {
        if (!title.trim() && !content.trim()) return;

        onSave({
            title,
            content,
            tags: initialNote?.tags || [],
            domain: initialNote?.domain,
            url: initialNote?.url,
            pinned: initialNote?.pinned || false
        }, initialNote?.id);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onCancel} className="text-sm text-tokyo-fg opacity-70 hover:opacity-100">Cancel</button>
                <button
                    onClick={handleSave}
                    className="bg-tokyo-accent text-tokyo-bg px-4 py-1 rounded font-bold text-sm hover:brightness-110"
                >
                    Save
                </button>
            </div>

            <input
                type="text"
                placeholder="Title"
                className="bg-transparent text-xl font-bold text-tokyo-accent mb-4 outline-none placeholder-tokyo-fg/30"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
            />

            <textarea
                placeholder="Start typing..."
                className="flex-1 bg-transparent text-tokyo-fg resize-none outline-none leading-relaxed placeholder-tokyo-fg/30"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />
        </div>
    );
};

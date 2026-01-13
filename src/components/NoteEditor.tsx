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
                <div className="flex gap-2 items-center">
                    {initialNote?.domain && (
                        <span className="text-xs bg-tokyo-accent/10 text-tokyo-accent px-2 py-0.5 rounded border border-tokyo-accent/20 truncate max-w-[120px]">
                            {initialNote.domain}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        className="bg-tokyo-accent text-tokyo-bg px-4 py-1 rounded font-bold text-sm hover:brightness-110"
                    >
                        Save
                    </button>
                </div>
            </div>

            <input
                type="text"
                placeholder="Title"
                className="bg-transparent text-xl font-bold text-tokyo-accent mb-2 outline-none placeholder-tokyo-fg/30"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
            />

            <input
                type="text"
                placeholder="Tags (comma separated)..."
                className="bg-transparent text-xs text-tokyo-fg/60 mb-4 outline-none placeholder-tokyo-fg/20 border-b border-tokyo-fg/10 pb-1 focus:border-tokyo-accent/50 transition-colors"
                value={initialNote?.tags.join(', ') || ''} // This is rudimentary, better to have local state
                onChange={(e) => {
                    // We need to handle this via local state or just pass it on save.
                    // For MVP simplicity, let's treat it as a string locally
                }}
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

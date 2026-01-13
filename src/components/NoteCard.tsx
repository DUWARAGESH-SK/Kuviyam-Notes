import React from 'react';
import type { Note } from '../types';

interface NoteCardProps {
    note: Note;
    onDelete: (id: string) => void;
    onClick: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onClick }) => {
    return (
        <div
            className="bg-tokyo-card p-4 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer group relative border border-transparent hover:border-tokyo-accent"
            onClick={() => onClick(note)}
        >
            <h3 className="font-bold text-tokyo-accent mb-2 truncate pr-6">{note.title || 'Untitled'}</h3>
            <p className="text-sm text-tokyo-fg opacity-80 line-clamp-3 whitespace-pre-wrap">{note.content}</p>

            <div className="flex gap-2 mt-3 text-xs text-tokyo-fg opacity-50">
                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                {note.domain && <span className="bg-black/30 px-1 rounded">{note.domain}</span>}
            </div>

            <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                }}
            >
                ×
            </button>
        </div>
    );
};

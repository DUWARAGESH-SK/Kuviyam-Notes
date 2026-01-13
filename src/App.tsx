import { useState, useEffect } from 'react';
import type { Note, NoteDraft } from './types';
import { storage } from './utils/storage';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const loadedNotes = await storage.getNotes();
    setNotes(loadedNotes);
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setView('edit');
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setView('edit');
  };

  const handleSaveNote = async (draft: NoteDraft, id?: string) => {
    if (id) {
      // Update existing
      const updatedNote: Note = {
        ...editingNote!,
        ...draft,
        updatedAt: Date.now()
      };
      await storage.saveNote(updatedNote);
    } else {
      // Create new
      await storage.createNote(draft);
    }
    await loadNotes();
    setView('list');
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
      await storage.deleteNote(id);
      await loadNotes();
    }
  };

  return (
    <div className="w-[400px] h-[500px] flex flex-col bg-tokyo-bg text-tokyo-fg overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-white/5 flex justify-between items-center bg-tokyo-bg/50 backdrop-blur-sm z-10">
        <h1 className="text-xl font-bold text-tokyo-accent tracking-tight">Kuviyam</h1>
        {view === 'list' && (
          <button
            onClick={handleCreateNote}
            className="w-8 h-8 rounded-full bg-tokyo-accent text-tokyo-bg flex items-center justify-center hover:scale-105 transition-transform"
          >
            +
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {view === 'list' ? (
          notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-tokyo-fg/40 space-y-2">
              <p>No notes yet</p>
              <button onClick={handleCreateNote} className="text-tokyo-accent text-sm hover:underline">Create one</button>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={handleEditNote}
                  onDelete={handleDeleteNote}
                />
              ))}
            </div>
          )
        ) : (
          <NoteEditor
            initialNote={editingNote}
            onSave={handleSaveNote}
            onCancel={() => setView('list')}
          />
        )}
      </main>
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import type { Note, NoteDraft } from './types';
import { storage } from './utils/storage';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [currentDomain, setCurrentDomain] = useState<string>('');

  useEffect(() => {
    loadNotes();
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        try {
          setCurrentDomain(new URL(tab.url).hostname);
        } catch (e) { /* ignore invalid urls */ }
      }
    });
  }, []);

  const loadNotes = async () => {
    const loadedNotes = await storage.getNotes();
    setNotes(loadedNotes);
  };

  const siteNotes = currentDomain ? notes.filter(n => n.domain === currentDomain) : [];
  const otherNotes = currentDomain ? notes.filter(n => n.domain !== currentDomain) : notes;

  const handleCreateNote = async () => {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    setEditingNote({
      id: '',
      title: tab?.title || '',
      content: '',
      createdAt: 0,
      updatedAt: 0,
      tags: [],
      url: tab?.url,
      domain: tab?.url ? new URL(tab.url).hostname : undefined,
      pinned: false
    } as Note); // Cast as Note for initial state, though it's technically a draft
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
            <div className="space-y-6">
              {siteNotes.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-tokyo-fg/50 uppercase tracking-wider mb-2">Current Site</h2>
                  <div className="space-y-3">
                    {siteNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onClick={handleEditNote}
                        onDelete={handleDeleteNote}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-xs font-bold text-tokyo-fg/50 uppercase tracking-wider mb-2">Recent Notes</h2>
                <div className="space-y-3">
                  {otherNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={handleEditNote}
                      onDelete={handleDeleteNote}
                    />
                  ))}
                </div>
              </div>
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

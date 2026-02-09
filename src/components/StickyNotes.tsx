import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import type { PanelLayout, NoteDraft } from '../types';

interface StickyNotesProps {
    onClose: () => void;
}

const StickyNotes: React.FC<StickyNotesProps> = ({ onClose }) => {
    const [layout, setLayout] = useState<PanelLayout>({
        x: 50,
        y: 50,
        width: 380,
        height: 500,
        isMinimized: false,
        isOpen: true
    });

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaved, setIsSaved] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Resize state
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        storage.getPanelLayout().then(setLayout);

        // Load draft
        chrome.storage.local.get(['panelDraft']).then((res) => {
            const draft = res.panelDraft as any;
            if (draft) {
                setTitle(draft.title || '');
                setContent(draft.content || '');
            }
        });
    }, []);

    // Save layout on change
    useEffect(() => {
        if (!isDragging && !isResizing) {
            storage.savePanelLayout(layout);
        }
    }, [layout, isDragging, isResizing]);

    // Save draft content
    useEffect(() => {
        const draft = {
            title,
            content,
            updatedAt: Date.now()
        };
        chrome.storage.local.set({ panelDraft: draft });
        setIsSaved(false);
    }, [title, content]);


    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('textarea') ||
            (e.target as HTMLElement).closest('input')) {
            return;
        }
        setIsDragging(true);
        dragStart.current = { x: e.clientX - layout.x, y: e.clientY - layout.y };
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            w: layout.width,
            h: layout.height
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStart.current.x;
                const newY = Math.max(0, e.clientY - dragStart.current.y);
                setLayout(prev => ({ ...prev, x: newX, y: newY }));
            } else if (isResizing) {
                const dx = e.clientX - resizeStart.x;
                const dy = e.clientY - resizeStart.y;
                const newW = Math.max(350, resizeStart.w + dx);
                const newH = Math.max(400, resizeStart.h + dy);
                setLayout(prev => ({ ...prev, width: newW, height: newH }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, resizeStart]);

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        const draft: NoteDraft = {
            title: title || 'Untitled',
            content,
            tags: [],
            pinned: false,
            domain: window.location.hostname,
            url: window.location.href,
            favicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}`,
            folderIds: []
        };
        await storage.createNote(draft);
        setTitle('');
        setContent('');
        setIsSaved(true);
        // Simple alert as fallback status
    };

    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase().replace(/(\d+)/, '$1,');

    const domain = window.location.hostname || 'chat.deepseek.com';

    return (
        <div
            style={{
                position: 'fixed',
                left: `${layout.x}px`,
                top: `${layout.y}px`,
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                zIndex: 2147483647,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // shadow-2xl equivalent
            }}
            className="flex flex-col rounded-xl border border-gray-200 bg-white font-sans text-gray-900"
        >
            {/* Header */}
            <header
                onMouseDown={handleDragStart}
                className="px-6 py-4 flex items-center justify-between cursor-move select-none border-b border-gray-100 bg-gray-50 rounded-t-xl"
            >
                <span className="text-lg font-bold text-gray-800 tracking-wide">EDIT NOTE</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        Save
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold px-2">
                        ✕
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 flex flex-col p-6 overflow-hidden bg-white rounded-b-xl relative">
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

                    {/* Date */}
                    <div className="mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {formattedDate}
                        </span>
                    </div>

                    {/* Linked Domain */}
                    <div className="mb-6">
                        <span className="text-sm font-medium text-indigo-600">
                            Linked to {domain}
                        </span>
                    </div>

                    {/* "UI Issues in" Label */}
                    <div className="mb-1">
                        <span className="text-lg font-medium text-gray-700 block">
                            UI Issues in
                        </span>
                    </div>

                    {/* Hashtag Heading / Title */}
                    <div className="mb-6 flex items-center border-b border-transparent focus-within:border-indigo-100 transition-colors">
                        <span className="text-2xl font-bold text-gray-400 mr-2">#</span>
                        <input
                            type="text"
                            className="flex-1 bg-transparent text-2xl font-bold text-gray-900 outline-none border-none focus:ring-0 p-0 placeholder-gray-300"
                            placeholder="Actualize Tags"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Main Content */}
                    <textarea
                        className="w-full flex-1 bg-transparent text-base leading-relaxed text-gray-700 outline-none border-none focus:ring-0 placeholder-gray-400 p-0 resize-none min-h-[150px]"
                        placeholder="Type something amazing..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>

                {/* Resize Handle */}
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-end justify-end p-2"
                >
                    <div className="w-3 h-3 border-r-2 border-b-2 border-gray-300 hover:border-indigo-500 transition-colors"></div>
                </div>
            </main>
        </div>
    );
};

export default StickyNotes;

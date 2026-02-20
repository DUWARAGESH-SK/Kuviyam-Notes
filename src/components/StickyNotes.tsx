import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import type { PanelLayout, NoteDraft } from '../types';

interface StickyNotesProps {
    onClose: () => void;
}

const StickyNotes: React.FC<StickyNotesProps> = ({ onClose }) => {
    // --- STATE ---
    const [layout, setLayout] = useState({
        x: 50,
        y: 50,
        width: 380,
        height: 500,
        isMinimized: false,
        isOpen: true
    });

    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [size, setSize] = useState({ width: 380, height: 500 });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaved, setIsSaved] = useState(true);

    // Hover states for interactions
    const [saveHover, setSaveHover] = useState(false);
    const [closeHover, setCloseHover] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // --- EFFECTS ---
    useEffect(() => {
        storage.getPanelLayout().then((l) => {
            if (l) {
                setLayout(l);
                setPosition({ x: l.x, y: l.y });
                setSize({ width: l.width, height: l.height });
            }
        });

        chrome.storage.local.get(['panelDraft']).then((res) => {
            const draft = res.panelDraft as any;
            if (draft) {
                setTitle(draft.title || '');
                setContent(draft.content || '');
            }
        });
    }, []);

    // Format date
    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase().replace(/(\d+)/, '$1,');

    const domain = window.location.hostname || 'chat.deepseek.com';

    // --- HANDLERS ---
    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('textarea') ||
            (e.target as HTMLElement).closest('input')) {
            return;
        }
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && !isResizing) {
                const newX = Math.round(e.clientX - dragOffset.x);
                const newY = Math.round(Math.max(0, e.clientY - dragOffset.y));
                setPosition({ x: newX, y: newY });
            } else if (isResizing) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;
                const newW = Math.round(Math.max(300, resizeStart.width + deltaX));
                const newH = Math.round(Math.max(300, resizeStart.height + deltaY));
                setSize({ width: newW, height: newH });
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                storage.savePanelLayout({ ...layout, x: position.x, y: position.y });
            }
            if (isResizing) {
                setIsResizing(false);
                storage.savePanelLayout({ ...layout, width: size.width, height: size.height });
            }
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragOffset, resizeStart, position, size, layout]);

    const handleSave = async () => {
        const noteDraft = { title, content, updatedAt: Date.now() };
        chrome.storage.local.set({ panelDraft: noteDraft });

        const newNote = {
            title: title || 'Untitled',
            content,
            tags: [],
            pinned: false,
            domain: window.location.hostname,
            url: window.location.href,
            favicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}`,
            folderIds: []
        };
        await storage.createNote(newNote);
        setIsSaved(true);
        setTitle('');
        setContent('');
    };

    // --- STYLES (Inline to guarantee rendering) ---
    const styles = {
        container: {
            position: 'fixed' as const,
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            minHeight: '400px',
            zIndex: 2147483647,
            backgroundColor: '#ffffff',
            color: '#1e293b',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column' as const,
        },
        header: {
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f3f4f6',
            backgroundColor: '#f9fafb',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            cursor: 'move',
            userSelect: 'none' as const,
        },
        headerTitle: {
            fontSize: '18px',
            fontWeight: '700',
            color: '#111827',
            letterSpacing: '0.025em',
        },
        actions: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        unsaved: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#9ca3af',
            marginRight: '8px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        saveBtn: {
            padding: '8px 20px',
            backgroundColor: saveHover ? '#4338ca' : '#4f46e5', // Darker on hover
            color: 'white',
            fontSize: '14px',
            fontWeight: '700',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'background-color 0.15s ease',
        },
        closeBtn: {
            marginLeft: '8px',
            color: closeHover ? '#4b5563' : '#9ca3af',
            fontWeight: 'bold',
            padding: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: '1',
        },
        main: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column' as const,
            padding: '24px',
            overflow: 'hidden',
            backgroundColor: 'white',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            position: 'relative' as const,
        },
        contentScroll: {
            flex: 1,
            overflowY: 'auto' as const,
            display: 'flex',
            flexDirection: 'column' as const,
        },
        date: {
            fontSize: '12px',
            fontWeight: '700',
            color: '#6b7280',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            marginBottom: '8px',
        },
        domain: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#4f46e5',
            marginBottom: '24px',
        },
        label: {
            fontSize: '18px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px',
            display: 'block',
        },
        titleContainer: {
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid transparent',
        },
        hashtag: {
            fontSize: '24px',
            fontWeight: '700',
            color: '#9ca3af',
            marginRight: '8px',
        },
        titleInput: {
            flex: 1,
            backgroundColor: 'transparent',
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            outline: 'none',
            border: 'none',
            padding: 0,
            width: '100%',
        },
        textarea: {
            width: '100%',
            flex: 1,
            backgroundColor: 'transparent',
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#374151',
            outline: 'none',
            border: 'none',
            padding: 0,
            resize: 'none' as const,
            minHeight: '150px',
            fontFamily: 'inherit',
        },
        resizeHandle: {
            position: 'absolute' as const,
            bottom: 0,
            right: 0,
            width: '32px',
            height: '32px',
            cursor: 'se-resize',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '8px',
        },
        resizeIcon: {
            width: '10px',
            height: '10px',
            borderRight: '2px solid #d1d5db',
            borderBottom: '2px solid #d1d5db',
        }
    };

    return (
        <div ref={containerRef} style={styles.container}>
            {/* Header */}
            <header
                onMouseDown={handleDragStart}
                className="px-6 py-4 flex items-center justify-between cursor-move border-b border-gray-100 bg-gray-50 rounded-t-xl"
                style={{ gap: '12px' }}
            >
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center shadow-sm">
                        <span className="material-symbols-rounded text-slate-500 text-[24px]">
                            chevron_left
                        </span>
                    </div>
                    <span className="text-[18px] font-extrabold text-[#64748b] tracking-wider whitespace-nowrap">
                        EDIT NOTE
                    </span>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <button className="w-10 h-10 flex items-center justify-center text-[#64748b] hover:text-[#4F46E5] transition-colors cursor-pointer">
                        <span className="material-symbols-rounded text-[24px]">light_mode</span>
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center text-[#64748b] hover:text-[#4F46E5] transition-colors cursor-pointer">
                        <span className="material-symbols-rounded text-[24px]">open_in_folder</span>
                    </button>
                    <button onClick={handleSave} className="bg-[#4F46E5] text-white px-6 py-2 rounded-full font-bold text-[14px] hover:bg-[#4338CA] active:scale-95 transition-all shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)]">
                        Save
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>
                <div style={styles.contentScroll} className="custom-scrollbar">
                    {/* Date */}
                    <div style={styles.date}>{formattedDate}</div>

                    {/* Domain */}
                    <div style={styles.domain}>Linked to {domain}</div>

                    {/* Label */}
                    <div style={styles.label}>UI Issues in</div>

                    {/* Title */}
                    <div style={styles.titleContainer}>
                        <span style={styles.hashtag}>#</span>
                        <input
                            type="text"
                            style={styles.titleInput}
                            placeholder="Actualize Tags"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setIsSaved(false);
                            }}
                        />
                    </div>

                    {/* Textarea */}
                    <textarea
                        style={styles.textarea}
                        placeholder="Type something amazing..."
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            setIsSaved(false);
                        }}
                    />
                </div>

                {/* Resize Handle */}
                <div style={styles.resizeHandle} onMouseDown={handleResizeStart}>
                    <div style={styles.resizeIcon}></div>
                </div>
            </main>
        </div>
    );
};

export default StickyNotes;

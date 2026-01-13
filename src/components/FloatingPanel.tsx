import React, { useState, useEffect } from 'react';
import type { Note, NoteDraft, PanelLayout } from '../types';
import { NoteEditor } from './NoteEditor';

interface FloatingPanelProps {
    initialLayout: PanelLayout;
    onLayoutChange: (layout: PanelLayout) => void;
    note: Note | null;
    onSaveNote: (draft: NoteDraft, id?: string) => void;
    onClose?: () => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    initialLayout,
    onLayoutChange,
    note,
    onSaveNote,
    onClose
}) => {
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);

    // Sync state if props change (unlikely in this mount/unmount model but good practice)
    useEffect(() => {
        if (initialLayout) setLayout(prev => ({ ...prev, ...initialLayout }));
    }, [initialLayout]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.no-drag')) return;

        setIsDragging(true);
        setDragOffset({ x: e.clientX - layout.x, y: e.clientY - layout.y });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                setLayout(prev => ({ ...prev, x: newX, y: Math.max(0, newY) }));
            }

            if (isResizing) {
                const newWidth = Math.max(300, e.clientX - layout.x);
                const newHeight = Math.max(200, e.clientY - layout.y);
                setLayout(prev => ({ ...prev, width: newWidth, height: newHeight }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
                onLayoutChange(layout); // Save on release
            }
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, layout, onLayoutChange]);

    return (
        <div
            style={{
                pointerEvents: 'auto',
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                backgroundColor: 'rgba(26, 27, 38, 0.98)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
                boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', sans-serif",
                color: '#a9b1d6',
                userSelect: 'none'
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: '40px',
                    background: 'linear-gradient(to right, rgba(36, 40, 59, 1), rgba(36, 40, 59, 0.8))',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0 16px', cursor: 'grab',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    borderTopLeftRadius: '12px', borderTopRightRadius: '12px'
                }}
                onMouseDown={handleMouseDown}
            >
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#7aa2f7', textTransform: 'uppercase' }}>Kuviyam</span>
                <div className="no-drag">
                    {onClose && (
                        <button
                            style={{ background: 'none', border: 'none', color: '#787c99', cursor: 'pointer', fontSize: '18px' }}
                            onClick={onClose}
                            title="Close Panel"
                        >✕</button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="no-drag" style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', userSelect: 'text' }}>
                <NoteEditor initialNote={note} onSave={onSaveNote} onCancel={() => { }} />

                {/* ✅ RESIZE HANDLE (User Requested Style) */}
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#2563eb', // Explicit Blue
                        cursor: 'nwse-resize',
                        zIndex: 100,
                        borderTopLeftRadius: '4px'
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsResizing(true);
                    }}
                />
            </div>
        </div>
    );
};

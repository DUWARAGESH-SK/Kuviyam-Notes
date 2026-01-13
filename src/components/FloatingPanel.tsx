import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft, PanelLayout } from '../types';
import { NoteEditor } from './NoteEditor';

interface FloatingPanelProps {
    initialLayout: PanelLayout;
    onLayoutChange: (layout: PanelLayout) => void;
    note: Note | null;
    onSaveNote: (draft: NoteDraft, id?: string) => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    initialLayout,
    onLayoutChange,
    note,
    onSaveNote
}) => {
    // Persistence State
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);

    // Ref for the panel element
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialLayout) {
            setLayout(current => ({ ...current, ...initialLayout }));
        }
    }, [initialLayout]);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.no-drag')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - layout.x,
            y: e.clientY - layout.y
        });
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                const clampedY = Math.max(0, newY);
                const clampedX = Math.max(-layout.width + 50, Math.min(window.innerWidth - 50, newX));

                setLayout(prev => ({ ...prev, x: clampedX, y: clampedY }));
            }

            if (isResizing) {
                const newWidth = e.clientX - layout.x;
                const newHeight = e.clientY - layout.y;
                const constrainedWidth = Math.max(300, newWidth);
                const constrainedHeight = Math.max(200, newHeight);

                setLayout(prev => ({ ...prev, width: constrainedWidth, height: constrainedHeight }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
                onLayoutChange(layout);
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

    if (layout.isMinimized) {
        return (
            <div
                style={{
                    pointerEvents: 'auto',
                    position: 'fixed',
                    left: layout.x,
                    top: layout.y,
                    zIndex: 2147483647
                }}
                className="no-drag"
            >
                <div
                    className="flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                    style={{
                        width: '48px', height: '48px',
                        backgroundColor: '#24283b',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 0 2px #7aa2f7'
                    }}
                    onMouseDown={handleMouseDown}
                    title="Expand Note (Double Click)"
                    onDoubleClick={() => {
                        const newLayout = { ...layout, isMinimized: false };
                        setLayout(newLayout);
                        onLayoutChange(newLayout);
                    }}
                >
                    <span style={{ fontSize: '24px' }}>📝</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            style={{
                pointerEvents: 'auto',
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                zIndex: 2147483647,
                backgroundColor: 'rgba(26, 27, 38, 0.98)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
                boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', sans-serif",
                color: '#a9b1d6',
                transition: (isDragging || isResizing) ? 'none' : 'box-shadow 0.2s',
                userSelect: 'none'
            }}
        >
            <div
                style={{
                    height: '40px',
                    background: 'linear-gradient(to right, rgba(36, 40, 59, 1), rgba(36, 40, 59, 0.8))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 16px',
                    cursor: 'grab',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                }}
                onMouseDown={handleMouseDown}
                onMouseUp={(e) => (e.target as HTMLElement).style.cursor = 'grab'}
            >
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#7aa2f7', textTransform: 'uppercase', letterSpacing: '1px', pointerEvents: 'none' }}>Kuviyam</span>
                <div className="no-drag" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        style={{
                            background: 'none', border: 'none', color: '#787c99', cursor: 'pointer',
                            fontSize: '24px', padding: '0 8px', lineHeight: '20px', fontWeight: 300
                        }}
                        onClick={() => {
                            const newLayout = { ...layout, isMinimized: true };
                            setLayout(newLayout);
                            onLayoutChange(newLayout);
                        }}
                        title="Minimize (_)"
                    >
                        -
                    </button>
                </div>
            </div>

            <div className="no-drag" style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', userSelect: 'text' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                    <NoteEditor
                        initialNote={note}
                        onSave={onSaveNote}
                        onCancel={() => { }}
                    />
                </div>

                <div
                    className="resize-handle"
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '32px',
                        height: '32px',
                        cursor: 'se-resize',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        padding: '6px'
                    }}
                    onMouseDown={handleResizeStart}
                    title="Drag to Resize"
                >
                    <div style={{
                        width: '12px', height: '12px',
                        borderRight: '3px solid #7aa2f7',
                        borderBottom: '3px solid #7aa2f7',
                        borderRadius: '1px',
                        pointerEvents: 'none'
                    }}></div>
                </div>
            </div>
        </div>
    );
};

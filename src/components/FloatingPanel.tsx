import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft } from '../types';
import { NoteEditor } from './NoteEditor';

interface PanelLayout {
    x: number;
    y: number;
    width: number;
    height: number;
    isMinimized: boolean;
}

interface FloatingPanelProps {
    initialLayout: PanelLayout;
    onLayoutChange: (layout: PanelLayout) => void;
    note: Note | null; // The active note to display
    onSaveNote: (draft: NoteDraft, id?: string) => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    initialLayout,
    onLayoutChange,
    note,
    onSaveNote
}) => {
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);

    const panelRef = useRef<HTMLDivElement>(null);

    // Sync internal state if props change drastically (e.g. from storage load)
    useEffect(() => {
        // Only update if significantly different to avoid loops, or just use initialLayout
        // prioritizing local state for smooth interaction
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target instanceof HTMLElement && e.target.closest('.no-drag')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - layout.x,
            y: e.clientY - layout.y
        });
    };

    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizeDirection(direction);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;

                // Basic viewport clamping
                const clampedX = Math.max(0, Math.min(window.innerWidth - layout.width, newX));
                const clampedY = Math.max(0, Math.min(window.innerHeight - 30, newY)); // Keep header visible

                setLayout(prev => ({ ...prev, x: clampedX, y: clampedY }));
            } else if (resizeDirection) {
                let newWidth = layout.width;
                let newHeight = layout.height;
                let newX = layout.x;
                let newY = layout.y;

                if (resizeDirection.includes('e')) {
                    newWidth = Math.max(300, e.clientX - layout.x);
                }
                if (resizeDirection.includes('s')) {
                    newHeight = Math.max(200, e.clientY - layout.y);
                }
                // Todo: Add North and West resizing logic if needed (more complex)

                setLayout(prev => ({ ...prev, width: newWidth, height: newHeight }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || resizeDirection) {
                setIsDragging(false);
                setResizeDirection(null);
                onLayoutChange(layout); // Persist changes
            }
        };

        if (isDragging || resizeDirection) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, resizeDirection, layout, onLayoutChange]);

    if (layout.isMinimized) {
        return (
            <div
                style={{
                    position: 'fixed',
                    left: layout.x,
                    top: layout.y,
                    zIndex: 999999
                }}
                className="flex flex-col items-end"
            >
                <div
                    className="w-12 h-12 bg-tokyo-card rounded-full shadow-xl border border-tokyo-accent/50 flex items-center justify-center cursor-move hover:scale-110 transition-transform"
                    onMouseDown={handleMouseDown}
                    onClick={(e) => {
                        if (!isDragging) {
                            const newLayout = { ...layout, isMinimized: false };
                            setLayout(newLayout);
                            onLayoutChange(newLayout);
                        }
                    }}
                >
                    <span className="text-xl">📝</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                zIndex: 999999,
            }}
            className="flex flex-col bg-tokyo-bg/95 backdrop-blur-md rounded-lg shadow-2xl border border-white/10 overflow-hidden font-sans text-tokyo-fg"
        >
            {/* Header handled by drag */}
            <div
                className="h-8 bg-tokyo-card/50 flex justify-between items-center px-3 cursor-move border-b border-white/5 select-none"
                onMouseDown={handleMouseDown}
            >
                <span className="text-xs font-bold text-tokyo-accent tracking-wider">KUVIYAM</span>
                <div className="flex gap-2 no-drag">
                    <button
                        className="hover:text-white"
                        onClick={() => {
                            const newLayout = { ...layout, isMinimized: true };
                            setLayout(newLayout);
                            onLayoutChange(newLayout);
                        }}
                    >
                        _
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative no-drag">
                {/* We reuse NoteEditor but need to adjust it to fit this container */}
                <NoteEditor
                    initialNote={note}
                    onSave={onSaveNote}
                    onCancel={() => { }} // No cancel in floating mode?
                />
                {/* Resize Handle (Bottom Right) */}
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end p-0.5 opacity-50 hover:opacity-100"
                    onMouseDown={(e) => handleResizeStart(e, 'se')}
                >
                    <div className="w-2 h-2 border-r-2 border-b-2 border-tokyo-fg"></div>
                </div>
            </div>
        </div>
    );
};

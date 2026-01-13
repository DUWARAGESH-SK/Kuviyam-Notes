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
                const newWidth = Math.max(380, e.clientX - layout.x);
                const newHeight = Math.max(400, e.clientY - layout.y);
                setLayout(prev => ({ ...prev, width: newWidth, height: newHeight }));
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

    return (
        <div
            style={{
                pointerEvents: 'auto',
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', -apple-system, sans-serif",
                color: '#1f2937',
                userSelect: 'none',
                overflow: 'hidden',
                transition: isDragging || isResizing ? 'none' : 'box-shadow 0.3s ease'
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: '64px',
                    background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 24px',
                    cursor: 'grab',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px'
                }}
                onMouseDown={handleMouseDown}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'none' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                    }}>
                        📝
                    </div>
                    <div>
                        <h2 style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#111827',
                            margin: 0,
                            lineHeight: 1
                        }}>
                            Quick Notes
                        </h2>
                        <p style={{
                            fontSize: '12px',
                            color: '#9ca3af',
                            margin: '4px 0 0 0'
                        }}>
                            Floating scratchpad
                        </p>
                    </div>
                </div>

                <div className="no-drag" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {onClose && (
                        <button
                            style={{
                                background: '#f3f4f6',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#6b7280',
                                cursor: 'pointer',
                                fontSize: '16px',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                padding: 0,
                                fontWeight: '600'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e5e7eb';
                                e.currentTarget.style.color = '#111827';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f3f4f6';
                                e.currentTarget.style.color = '#6b7280';
                            }}
                            onClick={onClose}
                            title="Close Panel"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="no-drag" style={{
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'text',
                background: '#ffffff'
            }}>
                <NoteEditor initialNote={note} onSave={onSaveNote} onCancel={() => { }} />

                {/* Resize Handle */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        width: '32px',
                        height: '32px',
                        cursor: 'nwse-resize',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        background: 'transparent'
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsResizing(true);
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                    title="Drag to Resize"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M14 10l-4 4M14 6l-8 8M14 2L2 14" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

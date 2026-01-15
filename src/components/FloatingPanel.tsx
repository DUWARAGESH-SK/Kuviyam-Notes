import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import type { PanelLayout } from '../types';

interface FloatingPanelProps {
    onClose: () => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({ onClose }) => {
    const [layout, setLayout] = useState<PanelLayout>({
        x: 50,
        y: 50,
        width: 320,
        height: 450,
        isMinimized: false,
        isOpen: true
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

    useEffect(() => {
        storage.getPanelLayout().then(setLayout);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStart.current.x;
                const newY = Math.max(0, e.clientY - dragStart.current.y);
                setLayout(prev => ({ ...prev, x: newX, y: newY }));
            } else if (isResizing) {
                const newW = Math.max(300, resizeStart.current.w + (e.clientX - resizeStart.current.x));
                const newH = Math.max(200, resizeStart.current.h + (e.clientY - resizeStart.current.y));
                setLayout(prev => ({ ...prev, width: newW, height: newH }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
                storage.savePanelLayout(layout);
            }
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, layout]);

    const handleDragDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - layout.x, y: e.clientY - layout.y };
    };

    const handleResizeDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY, w: layout.width, h: layout.height };
    };

    return (
        <div
            className="font-display"
            style={{
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                backgroundColor: 'white',
                borderRadius: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                border: '1px solid rgba(0,0,0,0.05)'
            }}
        >
            {/* Header / Drag Handle */}
            <div
                onMouseDown={handleDragDown}
                className="p-4 flex items-center justify-between cursor-move bg-slate-50 border-b border-slate-100"
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-slate-900">
                        <span className="material-symbols-rounded text-lg">sticky_note_2</span>
                    </div>
                    <span className="font-bold text-slate-800">Kuviyam Panel</span>
                </div>
                <div className="flex gap-2 text-slate-400">
                    <button onClick={onClose} className="hover:text-rose-500 transition-colors">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-rounded text-6xl mb-4 opacity-20">auto_awesome</span>
                <p className="font-bold">Persistent Panel Active</p>
                <p className="text-sm">Ready for your notes.</p>
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={handleResizeDown}
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#3b82f6',
                    cursor: 'nwse-resize',
                    borderRadius: '4px 0 0 0'
                }}
            />
        </div>
    );
};

export default FloatingPanel;

export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
    url?: string;  // For contextual notes
    domain?: string; // For filtering by site
    pinned: boolean;
    position?: { x: number; y: number }; // For floating notes
}

export type NoteDraft = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;

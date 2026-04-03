const fs = require('fs');
const path = require('path');

const root = 'c:/xampp/htdocs/Kuviyam/src';

// Ensure feature directories exist
const featureDirs = [
    'features/notes/components',
    'features/folders/components',
    'features/tags/components',
    'features/settings/components'
];

featureDirs.forEach(dir => {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
});

// Mapping of component to feature
const mapping = {
    'FolderSelectionModal.tsx': 'features/folders/components/FolderSelectionModal.tsx',
    'FoldersPanel.tsx': 'features/folders/components/FoldersPanel.tsx',
    'AddNotesToFolderModal.tsx': 'features/folders/components/AddNotesToFolderModal.tsx',
    
    'TagBar.tsx': 'features/tags/components/TagBar.tsx',
    'TagModal.tsx': 'features/tags/components/TagModal.tsx',
    
    'NoteCard.tsx': 'features/notes/components/NoteCard.tsx',
    'NoteEditor.tsx': 'features/notes/components/NoteEditor.tsx',
    'FloatingNote.tsx': 'features/notes/components/FloatingNote.tsx',
    'StickyNotes.tsx': 'features/notes/components/StickyNotes.tsx',
    
    'SettingsModal.tsx': 'features/settings/components/SettingsModal.tsx',
    'SettingsPage.tsx': 'features/settings/components/SettingsPage.tsx'
};

// 1. Move files
Object.entries(mapping).forEach(([file, target]) => {
    const fromP = path.join(root, 'components', file);
    const toP = path.join(root, target);
    if (fs.existsSync(fromP)) {
        fs.renameSync(fromP, toP);
    }
});

// Since files moved, their relative imports inside them might break.
// from: src/features/XYZ/components/File.tsx (depth 3)
// Old depth: src/components (depth 1) -> we need to map old relative paths.
// They used: '../shared/storage', '../types', '../utils/...'

function updateImportsInFile(filePath, newDepth) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Convert old depth to new depth for types and shared
    // old: '../types' -> new: '../../../types'
    // old: '../shared/...' -> new: '../../../shared/...'
    content = content.replace(/'\.\.\/types/g, "'../../../types");
    content = content.replace(/'\.\.\/shared/g, "'../../../shared");
    
    // Also internal component imports. e.g. NoteEditor imports TagBar
    // If we're splitting components, we should use absolute imports (alias '@') if configured.
    // Let's check vite-env.d.ts or vite.config.ts. Yes, '@/' is mapped to 'src/'!
    // So we can rewrite all component imports to use '@/'
    
    // BUT we don't have time for a full AST parser. I will try a simple regex to fix cross-component imports.
    // Replace all './xyz' with '@/features/.../components/xyz' based on mapping
    
    Object.keys(mapping).forEach(cmp => {
        const CmpName = cmp.replace('.tsx', '');
        // Regex to catch `import X from './CmpName'`
        const regex1 = new RegExp(`'\\.\\/${CmpName}'`, 'g');
        const regex2 = new RegExp(`'\\.\\/components\\/${CmpName}'`, 'g');
        
        const newPathFromSrc = mapping[cmp].replace('.tsx', '');
        
        content = content.replace(regex1, `'@/${newPathFromSrc}'`);
        content = content.replace(regex2, `'@/${newPathFromSrc}'`);
    });
    
    fs.writeFileSync(filePath, content);
}

// 2. Update files in features
Object.values(mapping).forEach(targetPath => {
    updateImportsInFile(path.join(root, targetPath), 3);
});

// 3. Update entry points (App.tsx, background/index.ts, content/index.tsx)
function updateSourceRoots(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    Object.keys(mapping).forEach(cmp => {
        const CmpName = cmp.replace('.tsx', '');
        const regex1 = new RegExp(`'\\.\\/components\\/${CmpName}'`, 'g');
        const regex2 = new RegExp(`'\\.\\.\\/components\\/${CmpName}'`, 'g');
        
        const newPathFromSrc = mapping[cmp].replace('.tsx', '');
        
        content = content.replace(regex1, `'@/${newPathFromSrc}'`);
        content = content.replace(regex2, `'@/${newPathFromSrc}'`);
    });
    
    fs.writeFileSync(filePath, content);
}

['popup/App.tsx', 'background/index.ts', 'content/index.tsx'].forEach(p => {
    updateSourceRoots(path.join(root, p));
});

console.log("Component feature organization complete.");

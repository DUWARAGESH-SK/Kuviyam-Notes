const fs = require('fs');
const path = require('path');

const root = 'c:/xampp/htdocs/Kuviyam';

// 1. Update manifests
const manifestsDirs = ['chrome.json', 'firefox.json'];
manifestsDirs.forEach(file => {
    const p = path.join(root, 'manifests', file);
    if (!fs.existsSync(p)) return;
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/"src\/background\.ts"/g, '"src/background/index.ts"');
    content = content.replace(/"src\/content\.tsx"/g, '"src/content/index.tsx"');
    fs.writeFileSync(p, content);
});

// 2. Update index.html
const indexHtmlP = path.join(root, 'index.html');
if (fs.existsSync(indexHtmlP)) {
    let content = fs.readFileSync(indexHtmlP, 'utf8');
    content = content.replace(/"\/src\/main\.tsx"/g, '"/src/popup/main.tsx"');
    fs.writeFileSync(indexHtmlP, content);
}

// 3. Create directories
const dirs = [
    'src/background',
    'src/content',
    'src/popup',
    'src/features/notes/components',
    'src/features/notes/hooks',
    'src/features/notes/utils',
    'src/features/folders',
    'src/features/tags'
];
dirs.forEach(d => {
    fs.mkdirSync(path.join(root, d), { recursive: true });
});

// 4. Move root src files
const moves = [
    ['src/background.ts', 'src/background/index.ts'],
    ['src/content.tsx', 'src/content/index.tsx'],
    ['src/main.tsx', 'src/popup/main.tsx'],
    ['src/App.tsx', 'src/popup/App.tsx'],
    ['src/App.css', 'src/popup/App.css']
];
moves.forEach(([from, to]) => {
    const fromP = path.join(root, from);
    const toP = path.join(root, to);
    if (fs.existsSync(fromP)) {
        fs.renameSync(fromP, toP);
    }
});

// 5. Update imports in main.tsx
const mainTsxP = path.join(root, 'src/popup/main.tsx');
if (fs.existsSync(mainTsxP)) {
    let content = fs.readFileSync(mainTsxP, 'utf8');
    content = content.replace(/'\.\/App\.css'/g, "'./App.css'");
    content = content.replace(/'\.\.\/index\.css'/g, "'../index.css'");
    content = content.replace(/'\.\/index\.css'/g, "'../index.css'"); // if it was ./index.css
    content = content.replace(/'\.\/App'/g, "'./App'"); // should still be ./App
    fs.writeFileSync(mainTsxP, content);
}

// 6. Update imports to utils/storage across all ts/tsx files
function replaceImports(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceImports(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            // Replace utils/storage with shared/storage
            if (content.includes('../utils/storage')) {
                // If it was in components, depth is 1, so ../utils -> ../shared
                content = content.replace(/\.\.\/utils\/storage/g, '../shared/storage');
                changed = true;
            }
            if (content.includes('./utils/storage')) {
                // From src/ root
                content = content.replace(/\.\/utils\/storage/g, './shared/storage');
                changed = true;
            }

            // Adjust relative paths for files that moved to subfolders:
            // background/index.ts (depth +1) -> from './shared' to '../shared', from './components' to '../components'
            if (fullPath.endsWith(path.join('background', 'index.ts'))) {
                content = content.replace(/'\.\/shared\//g, "'../shared/");
                content = content.replace(/'\.\/components\//g, "'../components/");
                content = content.replace(/'\.\/utils\//g, "'../utils/");
                content = content.replace(/'\.\/types'/g, "'../types'");
                changed = true;
            }
            // content/index.tsx (depth +1)
            if (fullPath.endsWith(path.join('content', 'index.tsx'))) {
                content = content.replace(/'\.\/shared\//g, "'../shared/");
                content = content.replace(/'\.\/components\//g, "'../components/");
                content = content.replace(/'\.\/utils\//g, "'../utils/");
                content = content.replace(/'\.\/types'/g, "'../types'");
                changed = true;
            }
            // popup/App.tsx (depth +1)
            if (fullPath.endsWith(path.join('popup', 'App.tsx'))) {
                content = content.replace(/'\.\/shared\//g, "'../shared/");
                content = content.replace(/'\.\/components\//g, "'../components/");
                content = content.replace(/'\.\/utils\//g, "'../utils/");
                content = content.replace(/'\.\/types'/g, "'../types'");
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}
replaceImports(path.join(root, 'src'));

// 7. Delete src/utils/storage.ts
const utilsStorageP = path.join(root, 'src', 'utils', 'storage.ts');
if (fs.existsSync(utilsStorageP)) {
    fs.unlinkSync(utilsStorageP);
}

console.log("Refactor script complete!");

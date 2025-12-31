#!/usr/bin/env node
/**
 * Script to remove leftover <Toast /> JSX components that weren't fully cleaned up.
 * These have incomplete onClose handlers like: onClose={() => }
 */

const fs = require('fs');
const path = require('path');

// Find all tsx files recursively
function findTsxFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
            findTsxFiles(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
    return files;
}

// Pattern to match leftover Toast JSX components
// Matches multi-line Toast components with various props
const toastJsxPatterns = [
    // Pattern 1: Toast with onClose={() => } (broken handler)
    /<Toast\s+[\s\S]*?onClose=\{[^}]*\}\s*\/?>/g,
    // Pattern 2: Full Toast component block
    /<Toast\s+[\s\S]*?\/>/g,
];

// More specific pattern to find and remove Toast components
const toastBlockPattern = /\s*<Toast\s+[\s\S]*?\/>\s*/g;

const frontendDir = path.join(__dirname, '../frontend/app');
const files = findTsxFiles(frontendDir);

let fixedCount = 0;
let totalRemoved = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Check if file has leftover Toast JSX
    if (content.includes('<Toast') && content.includes('onClose')) {
        // Find and remove Toast JSX blocks
        const lines = content.split('\n');
        const newLines = [];
        let inToastBlock = false;
        let toastBlockStart = -1;
        let braceCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this line starts a Toast component
            if (line.includes('<Toast') && !inToastBlock) {
                // Check if it's a self-closing tag on one line
                if (line.includes('/>')) {
                    // Skip this line entirely
                    totalRemoved++;
                    continue;
                }
                // Multi-line Toast component
                inToastBlock = true;
                toastBlockStart = i;
                continue;
            }
            
            if (inToastBlock) {
                // Check for end of Toast component
                if (line.includes('/>')) {
                    inToastBlock = false;
                    totalRemoved++;
                    continue;
                }
                // Skip lines inside Toast block
                continue;
            }
            
            newLines.push(line);
        }
        
        content = newLines.join('\n');
        
        if (content !== originalContent) {
            fs.writeFileSync(file, content);
            console.log(`Fixed: ${file}`);
            fixedCount++;
        }
    }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log(`✅ Removed ${totalRemoved} Toast components`);


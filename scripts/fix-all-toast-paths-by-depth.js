#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing ALL useToast import paths by calculating correct depth...\n');

// Find all files using useToast
function findAllFiles() {
  const files = new Set();
  
  try {
    const result = execSync(
      `grep -rl "from ['\\\"].*hooks/useToast['\\\"]" frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => files.add(f));
  } catch (e) {
    // No matches
  }
  
  return Array.from(files).sort();
}

// Calculate correct depth from a file to frontend/hooks
function calculateCorrectPath(filePath) {
  // Remove 'frontend/' prefix if present
  const relativePath = filePath.replace(/^frontend\//, '');
  
  // Split path and count depth from 'app' directory
  const parts = relativePath.split('/');
  const appIndex = parts.indexOf('app');
  
  if (appIndex === -1) {
    return null; // Not in app directory
  }
  
  // Count directories from app to file (excluding the file itself)
  // app/admin/super/posts/page.tsx = 4 levels deep (app, admin, super, posts)
  // We need 4 "../" to get to frontend level, then "hooks/useToast"
  const depth = parts.length - appIndex - 1; // -1 for the file itself
  
  // Need exactly 'depth' levels of "../" to get from the file's directory to frontend/
  return '../'.repeat(depth) + 'hooks/useToast';
}

// Fix import path in a single file
function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  const correctPath = calculateCorrectPath(filePath);
  if (!correctPath) return false;
  
  // Replace any existing useToast import with the correct path
  content = content.replace(
    /from ['"]\.\.\/.*?hooks\/useToast['"]/g,
    `from '${correctPath}'`
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    return { changed: true, path: correctPath };
  }
  return { changed: false, path: correctPath };
}

// Main execution
try {
  const allFiles = findAllFiles();
  
  if (allFiles.length === 0) {
    console.log('✓ No files found with useToast imports!');
    process.exit(0);
  }
  
  console.log(`Found ${allFiles.length} files with useToast imports:\n`);
  
  let fixed = 0;
  let skipped = 0;
  const pathCounts = {};
  
  allFiles.forEach(file => {
    try {
      const result = fixFile(file);
      if (result.changed) {
        console.log(`  ✓ ${file} → ${result.path}`);
        fixed++;
        pathCounts[result.path] = (pathCounts[result.path] || 0) + 1;
      } else {
        skipped++;
      }
    } catch (error) {
      console.log(`  ✗ ${file} - ${error.message}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Fix Summary');
  console.log('='.repeat(50));
  console.log(`✓ Fixed: ${fixed}`);
  console.log(`- Already correct: ${skipped}`);
  
  if (Object.keys(pathCounts).length > 0) {
    console.log('\nPaths used:');
    Object.entries(pathCounts).sort().forEach(([path, count]) => {
      console.log(`  • ${path}: ${count} files`);
    });
  }
  
  console.log('\n✨ All import paths corrected by depth!');
  
} catch (error) {
  console.error('❌ Fix script failed:', error);
  process.exit(1);
}


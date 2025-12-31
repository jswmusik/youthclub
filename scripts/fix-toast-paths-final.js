#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 FINAL FIX: Correcting ALL useToast import paths...\n');

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
  // filePath is like: frontend/app/components/RewardManager.tsx
  // We need to count from the file location to frontend/
  
  const parts = filePath.split('/');
  
  // Find 'frontend' index
  const frontendIndex = parts.indexOf('frontend');
  if (frontendIndex === -1) return null;
  
  // Count parts after 'frontend' (excluding the filename)
  // frontend/app/components/File.tsx = ['frontend', 'app', 'components', 'File.tsx']
  // Depth from File.tsx to frontend/ = 2 (components → app → frontend)
  const depth = parts.length - frontendIndex - 2; // -1 for frontend itself, -1 for filename
  
  return '../'.repeat(depth) + 'hooks/useToast';
}

// Fix import path in a single file
function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  const correctPath = calculateCorrectPath(filePath);
  if (!correctPath) return { changed: false, path: null };
  
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
  console.log('📊 Final Fix Summary');
  console.log('='.repeat(50));
  console.log(`✓ Fixed: ${fixed}`);
  console.log(`- Already correct: ${skipped}`);
  
  if (Object.keys(pathCounts).length > 0) {
    console.log('\nPaths by depth:');
    Object.entries(pathCounts).sort().forEach(([path, count]) => {
      const depth = path.match(/\.\.\//g).length;
      console.log(`  • ${depth} levels (${path}): ${count} files`);
    });
  }
  
  console.log('\n✨ All paths corrected! Build should succeed.');
  
} catch (error) {
  console.error('❌ Fix script failed:', error);
  process.exit(1);
}


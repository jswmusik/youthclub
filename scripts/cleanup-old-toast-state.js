#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Cleaning up old toast state references...\n');

// Find all files with old toast state
function findFilesToFix() {
  const files = new Set();
  
  try {
    const result = execSync(
      `grep -rl "setToast(" frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => {
      // Exclude the Toast.tsx component file itself
      if (!f.includes('Toast.tsx')) {
        files.add(f);
      }
    });
  } catch (e) {
    // No matches
  }
  
  return Array.from(files).sort();
}

// Clean up toast state in a single file
function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Remove setToast calls with various patterns
  // Pattern: setToast({ ... });
  content = content.replace(
    /setToast\(\{[^}]*\}\);?\s*/g,
    ''
  );
  
  // Pattern: setToast({ ...toast, isVisible: false })
  content = content.replace(
    /setToast\(\{[^}]*\.\.\.toast[^}]*\}\);?\s*/g,
    ''
  );
  
  // Pattern: onClose={() => setToast(...)}
  content = content.replace(
    /onClose=\{\(\)\s*=>\s*setToast\([^)]+\)\}\s*/g,
    ''
  );
  
  // Clean up extra blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    return true;
  }
  return false;
}

// Main execution
try {
  const filesToFix = findFilesToFix();
  
  if (filesToFix.length === 0) {
    console.log('✓ No files found with old toast state!');
    process.exit(0);
  }
  
  console.log(`Found ${filesToFix.length} files with old toast state:\n`);
  
  let fixed = 0;
  
  filesToFix.forEach(file => {
    try {
      if (fixFile(file)) {
        console.log(`  ✓ ${file}`);
        fixed++;
      } else {
        console.log(`  - ${file} (no changes needed)`);
      }
    } catch (error) {
      console.log(`  ✗ ${file} - ${error.message}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Cleanup Summary');
  console.log('='.repeat(50));
  console.log(`✓ Cleaned: ${fixed}`);
  
  console.log('\n✨ Old toast state references cleaned up!');
  
} catch (error) {
  console.error('❌ Cleanup script failed:', error);
  process.exit(1);
}


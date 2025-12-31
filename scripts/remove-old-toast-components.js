#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Removing ALL old <Toast /> components from JSX...\n');

// Find all files with old Toast components
function findFilesToFix() {
  const files = new Set();
  
  try {
    const result = execSync(
      `grep -rl "<Toast " frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => files.add(f));
  } catch (e) {
    // No matches
  }
  
  return Array.from(files).sort();
}

// Remove Toast components from a single file
function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Pattern 1: <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} ... />
  content = content.replace(
    /<Toast\s+\{\.\.\.toast\}[^>]*\/>\s*/g,
    ''
  );
  
  // Pattern 2: Multi-line <Toast ... /> with various props
  content = content.replace(
    /<Toast\s+[\s\S]*?\/>\s*/g,
    ''
  );
  
  // Pattern 3: <Toast ... ></Toast> (closing tag version)
  content = content.replace(
    /<Toast\s+[\s\S]*?<\/Toast>\s*/g,
    ''
  );
  
  // Clean up extra blank lines (more than 2 consecutive)
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
    console.log('✓ No files found with old Toast components!');
    process.exit(0);
  }
  
  console.log(`Found ${filesToFix.length} files with old Toast components:\n`);
  
  let fixed = 0;
  let failed = [];
  
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
      failed.push({ file, error: error.message });
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Cleanup Summary');
  console.log('='.repeat(50));
  console.log(`✓ Cleaned: ${fixed}`);
  console.log(`✗ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed files (manual review needed):');
    failed.forEach(({ file, error }) => {
      console.log(`  - ${file}`);
      console.log(`    ${error}`);
    });
  }
  
  console.log('\n✨ Old Toast components removed!');
  console.log('Note: The new useToast hook handles toasts automatically via the Toaster component in layouts.');
  
} catch (error) {
  console.error('❌ Cleanup script failed:', error);
  process.exit(1);
}


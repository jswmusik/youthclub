#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Cleaning up old Toast import statements...\n');

// Find all files with old Toast imports
function findFilesToClean() {
  const files = new Set();
  
  try {
    const result = execSync(
      `grep -rl "from.*@/app/components/Toast" frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => files.add(f));
  } catch (e) {
    // No matches
  }
  
  return Array.from(files).sort();
}

// Clean up imports in a single file
function cleanFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Check if file is actually using the new hook
  if (!content.includes('useToast')) {
    // This file might still need the old Toast, skip it
    return false;
  }
  
  // Remove old Toast import lines
  content = content.replace(
    /import Toast,?\s*\{[^}]*\}\s*from\s*['"]@\/app\/components\/Toast['"];?\n?/g,
    ''
  );
  
  content = content.replace(
    /import\s*\{[^}]*Toast[^}]*\}\s*from\s*['"]@\/app\/components\/Toast['"];?\n?/g,
    ''
  );
  
  content = content.replace(
    /import Toast from\s*['"]@\/app\/components\/Toast['"];?\n?/g,
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
  const filesToClean = findFilesToClean();
  
  if (filesToClean.length === 0) {
    console.log('✓ No files found with old Toast imports. Cleanup complete!');
    process.exit(0);
  }
  
  console.log(`Found ${filesToClean.length} files with old Toast imports:\n`);
  
  let cleaned = 0;
  let skipped = 0;
  
  filesToClean.forEach(file => {
    try {
      if (cleanFile(file)) {
        console.log(`  ✓ ${file}`);
        cleaned++;
      } else {
        console.log(`  - ${file} (no changes needed)`);
        skipped++;
      }
    } catch (error) {
      console.log(`  ✗ ${file} - ${error.message}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Cleanup Summary');
  console.log('='.repeat(50));
  console.log(`✓ Cleaned: ${cleaned}`);
  console.log(`- Skipped: ${skipped}`);
  console.log('\n✨ Cleanup complete!');
  
} catch (error) {
  console.error('❌ Cleanup script failed:', error);
  process.exit(1);
}


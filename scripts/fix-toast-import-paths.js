#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing useToast import paths...\n');

// Find files with incorrect import paths
function findFilesToFix() {
  const files = new Set();
  
  try {
    const result = execSync(
      `grep -rl "from ['\\\"]\\.\\.\/hooks\/useToast['\\\"]" frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => files.add(f));
  } catch (e) {
    // No matches
  }
  
  return Array.from(files).sort();
}

// Fix import path in a single file
function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Replace incorrect path with correct one
  // Files in app/components/ need ../../hooks/useToast
  content = content.replace(
    /from ['"]\.\.\/hooks\/useToast['"]/g,
    "from '../../hooks/useToast'"
  );
  
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
    console.log('✓ No files found with incorrect import paths!');
    process.exit(0);
  }
  
  console.log(`Found ${filesToFix.length} files with incorrect import paths:\n`);
  
  let fixed = 0;
  
  filesToFix.forEach(file => {
    try {
      if (fixFile(file)) {
        console.log(`  ✓ ${file}`);
        fixed++;
      }
    } catch (error) {
      console.log(`  ✗ ${file} - ${error.message}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Fix Summary');
  console.log('='.repeat(50));
  console.log(`✓ Fixed: ${fixed}`);
  console.log('\n✨ Import paths corrected!');
  
} catch (error) {
  console.error('❌ Fix script failed:', error);
  process.exit(1);
}


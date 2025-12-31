#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing useToast hook usage pattern...\n');

// Find all files with incorrect usage
function findFilesToFix() {
  const files = new Set();
  
  try {
    const result = execSync(
      `grep -rl "const { toast: showToast } = useToast" frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => files.add(f));
  } catch (e) {
    // No matches
  }
  
  return Array.from(files).sort();
}

// Fix usage in a single file
function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Step 1: Change the destructuring to get success, error, info, warning directly
  content = content.replace(
    /const \{ toast: showToast \} = useToast\(\);?/g,
    'const { success, error, info, warning } = useToast();'
  );
  
  // Step 2: Replace showToast.success() calls with success()
  content = content.replace(/showToast\.success\(/g, 'success(');
  
  // Step 3: Replace showToast.error() calls with error()
  content = content.replace(/showToast\.error\(/g, 'error(');
  
  // Step 4: Replace showToast.info() calls with info()
  content = content.replace(/showToast\.info\(/g, 'info(');
  
  // Step 5: Replace showToast.warning() calls with warning()
  content = content.replace(/showToast\.warning\(/g, 'warning(');
  
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
    console.log('✓ No files found with incorrect usage!');
    process.exit(0);
  }
  
  console.log(`Found ${filesToFix.length} files with incorrect useToast usage:\n`);
  
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
  
  console.log('\n✨ useToast usage patterns corrected!');
  console.log('\nChanged from:');
  console.log('  const { toast: showToast } = useToast();');
  console.log('  showToast.success(...)');
  console.log('\nTo:');
  console.log('  const { success, error, info, warning } = useToast();');
  console.log('  success(...)');
  
} catch (error) {
  console.error('❌ Fix script failed:', error);
  process.exit(1);
}


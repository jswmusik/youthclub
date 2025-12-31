#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing error naming conflicts in useToast...\n');

const filesToFix = [
  'frontend/app/components/posts/QuickPostForm.tsx',
  'frontend/app/components/posts/PostTemplateForm.tsx',
  'frontend/app/components/posts/PostForm.tsx',
  'frontend/app/components/events/youth/EventRegistrationModal.tsx'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Step 1: Rename error in destructuring to showError
  content = content.replace(
    /const \{ success, error, info, warning \} = useToast\(\);/g,
    'const { success, error: showError, info, warning } = useToast();'
  );
  
  // Step 2: Replace standalone error() calls (not console.error, not setError)
  // Look for error( followed by message patterns, but not preceded by console. or set
  content = content.replace(
    /(?<!console\.)(?<!set)error\(([^)]+)\);/g,
    'showError($1);'
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    return true;
  }
  return false;
}

let fixed = 0;

filesToFix.forEach(file => {
  try {
    if (fixFile(file)) {
      console.log(`  ✓ ${file}`);
      fixed++;
    } else {
      console.log(`  - ${file} (already fixed)`);
    }
  } catch (error) {
    console.log(`  ✗ ${file} - ${error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 Fix Summary');
console.log('='.repeat(50));
console.log(`✓ Fixed: ${fixed}`);
console.log('\n✨ Naming conflicts resolved!');
console.log('\nChanged:');
console.log('  const { success, error, ... } = useToast();');
console.log('  error(msg);');
console.log('\nTo:');
console.log('  const { success, error: showError, ... } = useToast();');
console.log('  showError(msg);');


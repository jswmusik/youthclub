#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Toast Migration Script Starting...\n');

// Find all files with old Toast usage
function findFilesToMigrate() {
  const files = new Set();
  
  try {
    // Find files with Toast import
    const result = execSync(
      `grep -rl "import Toast from" frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => files.add(f));
  } catch (e) {
    // No matches
  }
  
  try {
    // Find files with toast state
    const result = execSync(
      `grep -rl "useState.*toast.*isVisible" frontend/app --include="*.tsx" --include="*.ts"`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    result.split('\n').filter(Boolean).forEach(f => files.add(f));
  } catch (e) {
    // No matches
  }
  
  return Array.from(files).sort();
}

// Calculate correct relative path for hook import
function getRelativeHookPath(filePath) {
  const parts = filePath.split('/');
  const appIndex = parts.indexOf('app');
  if (appIndex === -1) return '../../../hooks/useToast';
  
  // Count depth from app directory
  const depth = parts.length - appIndex - 2; // -2 for app and file itself
  return '../'.repeat(Math.max(depth, 1)) + 'hooks/useToast';
}

// Transform a single file
function migrateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // 1. Replace Toast import with useToast hook
  if (content.includes("import Toast from")) {
    const hookPath = getRelativeHookPath(filePath);
    content = content.replace(
      /import Toast from ['"].*?Toast['"];?\n?/g,
      `import { useToast } from '${hookPath}';\n`
    );
  }
  
  // 2. Replace toast state declaration
  const toastStateRegex = /const \[toast,\s*setToast\]\s*=\s*useState<\{[^}]+\}>\(\{[^}]+\}\);?\n?/gs;
  if (toastStateRegex.test(content)) {
    content = content.replace(
      toastStateRegex,
      "const { toast: showToast } = useToast();\n"
    );
  }
  
  // 3. Replace setToast calls - handle multi-line and various formats
  // Success toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,]+),\s*type:\s*['"]success['"],\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.success($1);'
  );
  
  // Error toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,]+),\s*type:\s*['"]error['"],\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.error($1);'
  );
  
  // Info toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,]+),\s*type:\s*['"]info['"],\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.info($1);'
  );
  
  // Warning toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,]+),\s*type:\s*['"]warning['"],\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.warning($1);'
  );
  
  // 4. Remove <Toast /> JSX component
  content = content.replace(
    /<Toast\s+message=\{toast\.message\}\s+type=\{toast\.type\}\s+isVisible=\{toast\.isVisible\}\s+onClose=\{[^}]+\}\s*\/>/g,
    ''
  );
  
  // Also handle self-closing and expanded forms
  content = content.replace(
    /<Toast[^>]*\/>/g,
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
  const filesToMigrate = findFilesToMigrate();
  
  if (filesToMigrate.length === 0) {
    console.log('✓ No files found with old Toast usage. Migration complete!');
    process.exit(0);
  }
  
  console.log(`Found ${filesToMigrate.length} files to migrate:\n`);
  
  let migrated = 0;
  let skipped = 0;
  let failed = [];
  
  // Group files by admin type for better reporting
  const clubFiles = filesToMigrate.filter(f => f.includes('/admin/club/'));
  const muniFiles = filesToMigrate.filter(f => f.includes('/admin/municipality/'));
  const superFiles = filesToMigrate.filter(f => f.includes('/admin/super/'));
  const otherFiles = filesToMigrate.filter(f => 
    !f.includes('/admin/club/') && 
    !f.includes('/admin/municipality/') && 
    !f.includes('/admin/super/')
  );
  
  const groups = [
    { name: 'Club Admin', files: clubFiles },
    { name: 'Municipality Admin', files: muniFiles },
    { name: 'Super Admin', files: superFiles },
    { name: 'Other', files: otherFiles }
  ];
  
  groups.forEach(group => {
    if (group.files.length === 0) return;
    
    console.log(`\n📁 ${group.name} (${group.files.length} files)`);
    console.log('─'.repeat(50));
    
    group.files.forEach(file => {
      try {
        if (migrateFile(file)) {
          console.log(`  ✓ ${file}`);
          migrated++;
        } else {
          console.log(`  - ${file} (no changes needed)`);
          skipped++;
        }
      } catch (error) {
        console.log(`  ✗ ${file}`);
        console.log(`    Error: ${error.message}`);
        failed.push({ file, error: error.message });
      }
    });
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`✓ Successfully migrated: ${migrated}`);
  console.log(`- Skipped (no changes): ${skipped}`);
  console.log(`✗ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed files (manual review needed):');
    failed.forEach(({ file, error }) => {
      console.log(`  - ${file}`);
      console.log(`    ${error}`);
    });
  }
  
  console.log('\n✨ Migration complete! Please review the changes with git diff.');
  
} catch (error) {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
}


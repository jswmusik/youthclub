#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Toast Migration Script - Phase 2 (Catching remaining patterns)...\n');

// Find all files with remaining old Toast patterns
function findFilesToMigrate() {
  const files = new Set();
  
  try {
    // Find files with old toast state (any variant)
    const result = execSync(
      `grep -rl "const \\[toast, setToast\\]" frontend/app --include="*.tsx" --include="*.ts"`,
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
  
  // 1. Add useToast import if not present and toast state exists
  if (content.includes('const [toast, setToast]') && !content.includes('useToast')) {
    const hookPath = getRelativeHookPath(filePath);
    
    // Find the last import statement
    const importRegex = /^import .+;$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      content = content.slice(0, insertPosition) + 
                `\nimport { useToast } from '${hookPath}';` +
                content.slice(insertPosition);
    }
  }
  
  // 2. Replace ALL variants of toast state declarations
  // Variant 1: with isVisible
  content = content.replace(
    /const \[toast,\s*setToast\]\s*=\s*useState<\{\s*message:\s*string;\s*type:\s*['"]success['"][\s|]*['"]error['"][\s|]*['"]info['"]?[\s|]*['"]warning['"]?;\s*isVisible:\s*boolean\s*\}>\(\{[^}]+\}\);?\n?/gs,
    "const { toast: showToast } = useToast();\n"
  );
  
  // Variant 2: without isVisible
  content = content.replace(
    /const \[toast,\s*setToast\]\s*=\s*useState<\{\s*message:\s*string;\s*type:\s*['"]success['"][\s|]*['"]error['"][\s|]*['"]info['"]?[\s|]*['"]warning['"]?\s*\}\s*\|\s*null>\(\s*null\s*\);?\n?/gs,
    "const { toast: showToast } = useToast();\n"
  );
  
  // Variant 3: Simple type union
  content = content.replace(
    /const \[toast,\s*setToast\]\s*=\s*useState<\{[^}]*message[^}]*type[^}]*\}[^>]*>\([^)]+\);?\n?/gs,
    "const { toast: showToast } = useToast();\n"
  );
  
  // 3. Replace setToast calls - handle multi-line and various formats
  // Success toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]success['"],?\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.success($1);'
  );
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]success['"]\s*\}\);?/gs,
    'showToast.success($1);'
  );
  
  // Error toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]error['"],?\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.error($1);'
  );
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]error['"]\s*\}\);?/gs,
    'showToast.error($1);'
  );
  
  // Info toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]info['"],?\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.info($1);'
  );
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]info['"]\s*\}\);?/gs,
    'showToast.info($1);'
  );
  
  // Warning toasts
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]warning['"],?\s*isVisible:\s*true\s*\}\);?/gs,
    'showToast.warning($1);'
  );
  content = content.replace(
    /setToast\(\{\s*message:\s*([^,}]+),?\s*type:\s*['"]warning['"]\s*\}\);?/gs,
    'showToast.warning($1);'
  );
  
  // 4. Remove <Toast /> JSX component and its props
  content = content.replace(
    /<Toast\s+message=\{toast\.message\}\s+type=\{toast\.type\}\s+isVisible=\{toast\.isVisible\}\s+onClose=\{[^}]+\}\s*\/>/g,
    ''
  );
  
  content = content.replace(
    /<Toast[^>]*\/>/g,
    ''
  );
  
  // 5. Remove toast && <Toast> patterns
  content = content.replace(
    /\{toast\s*&&\s*<Toast[^>]*\/>\}/g,
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
    console.log('✓ No remaining files found with old Toast usage. Migration complete!');
    process.exit(0);
  }
  
  console.log(`Found ${filesToMigrate.length} remaining files to migrate:\n`);
  
  let migrated = 0;
  let skipped = 0;
  let failed = [];
  
  filesToMigrate.forEach(file => {
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
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Phase 2 Migration Summary');
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
  
  console.log('\n✨ Phase 2 migration complete!');
  
} catch (error) {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
}


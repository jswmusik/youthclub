import os
import sys

# --- CONFIGURATION ---
OUTPUT_FILE = 'project_context.txt'

# Folders to completely ignore
IGNORE_DIRS = {
    '.git', 'node_modules', 'venv', '.next', '__pycache__', 
    'build', 'dist', '.idea', '.vscode', 'migrations', 'media', 'static'
}

# Files to ignore
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock',
    '.DS_Store', 'db.sqlite3', 'generate_context.py', 'readme.md',
    'LICENSE', '.gitignore', 'tsconfig.tsbuildinfo'
}

# File extensions to ignore (binary/images/fonts)
IGNORE_EXTENSIONS = {
    '.pyc', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.gif', '.webp',
    '.ttf', '.woff', '.woff2', '.eot', '.mp4', '.mov', '.zip', '.tar.gz'
}

def is_ignored(path, names):
    """Helper to filter directories/files during os.walk"""
    return {n for n in names if n in IGNORE_DIRS or n in IGNORE_FILES}

def generate_context(target_dirs=None):
    """
    Walks through the project and combines relevant files into one text file.
    """
    # If no specific folders provided, use current directory
    start_dirs = target_dirs if target_dirs else ['.']
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write(f"=== PROJECT CONTEXT GENERATED ===\n")
        out.write(f"=== IGNORED: node_modules, venv, migrations, media, images ===\n\n")

        # 1. Write Project Structure (Tree View)
        out.write("=== DIRECTORY STRUCTURE ===\n")
        for start_dir in start_dirs:
            for root, dirs, files in os.walk(start_dir):
                # Modify dirs in-place to skip ignored directories
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                
                level = root.replace(start_dir, '').count(os.sep)
                indent = ' ' * 4 * level
                out.write(f"{indent}{os.path.basename(root)}/\n")
                subindent = ' ' * 4 * (level + 1)
                for f in files:
                    if f not in IGNORE_FILES and not any(f.endswith(ext) for ext in IGNORE_EXTENSIONS):
                        out.write(f"{subindent}{f}\n")
        out.write("\n\n")

        # 2. Write File Contents
        out.write("=== FILE CONTENTS ===\n")
        for start_dir in start_dirs:
            for root, dirs, files in os.walk(start_dir):
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                
                for file in files:
                    if file in IGNORE_FILES or any(file.endswith(ext) for ext in IGNORE_EXTENSIONS):
                        continue
                    
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            # SKIP EMPTY FILES
                            if not content.strip():
                                continue
                                
                            out.write(f"\n\n--- START OF FILE: {file_path} ---\n")
                            out.write(content)
                            out.write(f"\n--- END OF FILE: {file_path} ---\n")
                    except Exception as e:
                        print(f"Skipping binary or unreadable file: {file_path}")

    print(f"✅ Success! Context generated in: {OUTPUT_FILE}")
    print(f"📂 File size: {os.path.getsize(OUTPUT_FILE) / 1024:.2f} KB")

if __name__ == "__main__":
    # Allow passing specific folders as arguments
    # Example: python generate_context.py backend/users frontend/app
    targets = sys.argv[1:]
    generate_context(targets)
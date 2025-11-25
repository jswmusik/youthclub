import os

# ==========================================
#  PASTE THE FILES YOU WANT TO SHARE HERE
# ==========================================
TARGETS = [
'backend/users/models.py',
'backend/users/serializers.py',
'backend/users/permissions.py',
'backend/users/views.py',
'backend/api/urls.py',
'frontend/context/AuthContext.tsx',
'frontend/lib/api.ts',
'frontend/app/admin/municipality/youth/page.tsx',
'frontend/app/admin/municipality/youth/[id]/page.tsx',
'frontend/app/admin/municipality/admins/page.tsx',
'frontend/app/admin/club/admins/page.tsx',
]
# ==========================================

OUTPUT_FILE = 'focused_context.txt'

def generate_focused_context():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("=== FOCUSED CONTEXT ===\n\n")
        
        for path in TARGETS:
            # Check if file exists
            if not os.path.exists(path):
                out.write(f"\n--- MISSING FILE: {path} ---\n")
                continue

            # If it's a directory, walk it (shallow, 1 level deep usually preferred here but we'll do full)
            if os.path.isdir(path):
                for root, _, files in os.walk(path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                out.write(f"\n\n--- START OF FILE: {file_path} ---\n")
                                out.write(f.read())
                                out.write(f"\n--- END OF FILE: {file_path} ---\n")
                        except Exception as e:
                            out.write(f"\n--- ERROR READING: {file_path} ---\n")
            
            # If it's a file, just read it
            else:
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        out.write(f"\n\n--- START OF FILE: {path} ---\n")
                        out.write(f.read())
                        out.write(f"\n--- END OF FILE: {path} ---\n")
                except Exception as e:
                    out.write(f"\n--- ERROR READING: {path} ---\n")

    print(f"✅ Focused context generated in: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_focused_context()
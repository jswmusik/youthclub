import os

# ==========================================
#  PASTE THE FILES YOU WANT TO SHARE HERE
# ==========================================
TARGETS = [
    # --- Backend Configuration ---
    'backend/core/settings.py',
    'backend/api/urls.py',
    
    # --- User & Permissions (Crucial for Targeting Logic) ---
    'backend/users/models.py',          # Added: To see exact user fields (grade, dob, etc.)
    'backend/users/permissions.py',

    # --- Reference Patterns (Targeting & Scoping) ---
    'backend/rewards/models.py',        # Best reference for targeting mix (Groups + Demographics)
    'backend/rewards/views.py',         # Best reference for Admin Scope filtering
    'backend/news/models.py',           # Best reference for Title/Hero/RichText content
    
    # --- Critical for Custom Field Targeting ---
    'backend/custom_fields/models.py',  # To understand the field schema
    'backend/groups/models.py',         # Reference for storing 'custom_field_rules'
    'backend/groups/views.py',          # Reference for logic that filters Users by custom rules

    # --- Frontend Setup ---
    'frontend/lib/api.ts',
    
    # --- Frontend Components (UI Reference) ---
    'frontend/components/RichTextEditor.tsx',
    'frontend/components/RewardForm.tsx',       # Reference for Demographics UI
    'frontend/components/GroupForm.tsx',        # Reference for Custom Rule UI integration
    'frontend/components/CustomRuleBuilder.tsx',# The specific component for building rules
    'frontend/components/RewardManager.tsx',    # Reference for the Dashboard/List view
    
    # --- Navigation (To inject menu items) ---
    'frontend/app/admin/super/layout.tsx',
    'frontend/app/admin/municipality/layout.tsx',
    'frontend/app/admin/club/layout.tsx',
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
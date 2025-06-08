import re
import sys
from pathlib import Path

def patch_migration_file(filepath: Path, fields_to_char: dict[str, int]):
    """
    Replace VARCHAR(length) with CHAR(length) for specified fields in the migration SQL.
    
    fields_to_char: dict where key=field_name and value=length (int)
    """
    text = filepath.read_text()
    
    for field, length in fields_to_char.items():
        # pattern to find "fieldname" VARCHAR(length)
        pattern = rf'("{field}" )VARCHAR\(\d+\)'
        replacement = rf'\1CHAR({length})'
        
        new_text, count = re.subn(pattern, replacement, text)
        if count > 0:
            print(f"Patched {count} occurrence(s) of {field} in {filepath.name}")
            text = new_text
    
    filepath.write_text(text)

def main(migrations_dir: str = "migrations"):
    migrations_path = Path(migrations_dir)
    if not migrations_path.exists() or not migrations_path.is_dir():
        print(f"Error: {migrations_dir} directory not found.")
        return
    
    # fields you want to patch and their fixed lengths
    fields_to_char = {
        "userId": 26,
        "hashed_password": 97,
    }
    
    # Process all .py migration files
    for migration_file in migrations_path.glob("*.py"):
        print(migration_file)
        patch_migration_file(migration_file, fields_to_char)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        print("Error: Please provide a directory path. example: python patch_migration.py ./migrations")

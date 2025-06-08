import os
import subprocess
import tempfile
from pathlib import Path
import pytest
from database.patch_migration import patch_migration_file
from database.patch_migration import main

@pytest.fixture
def temp_sql_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = Path(tmpdir) / "migration.py"
        yield file_path

def test_patch_single_field(temp_sql_file, capsys):
    content = '''
    CREATE TABLE "user" (
        "userId" VARCHAR(36) NOT NULL,
        "name" VARCHAR(100),
        PRIMARY KEY ("userId")
    );
    '''
    temp_sql_file.write_text(content)
    patch_migration_file(temp_sql_file, {"userId": 26})
    result = temp_sql_file.read_text()
    assert '"userId" CHAR(26) NOT NULL' in result
    assert '"name" VARCHAR(100)' in result
    captured = capsys.readouterr()
    assert "Patched 1 occurrence(s) of userId" in captured.out

def test_patch_multiple_fields(temp_sql_file, capsys):
    content = '''
    CREATE TABLE "user" (
        "userId" VARCHAR(36) NOT NULL,
        "hashed_password" VARCHAR(128),
        "email" VARCHAR(255)
    );
    '''
    temp_sql_file.write_text(content)
    patch_migration_file(temp_sql_file, {"userId": 26, "hashed_password": 97})
    result = temp_sql_file.read_text()
    assert '"userId" CHAR(26) NOT NULL' in result
    assert '"hashed_password" CHAR(97)' in result
    assert '"email" VARCHAR(255)' in result
    captured = capsys.readouterr()
    assert "Patched 1 occurrence(s) of userId" in captured.out
    assert "Patched 1 occurrence(s) of hashed_password" in captured.out

def test_no_matching_field(temp_sql_file, capsys):
    content = '''
    CREATE TABLE "user" (
        "username" VARCHAR(50)
    );
    '''
    temp_sql_file.write_text(content)
    patch_migration_file(temp_sql_file, {"userId": 26})
    result = temp_sql_file.read_text()
    assert result == content
    captured = capsys.readouterr()
    assert "Patched" not in captured.out

def test_patch_multiple_occurrences(temp_sql_file, capsys):
    content = '''
    "userId" VARCHAR(36),
    "userId" VARCHAR(36)
    '''
    temp_sql_file.write_text(content)
    patch_migration_file(temp_sql_file, {"userId": 26})
    result = temp_sql_file.read_text()
    assert result.count('CHAR(26)') == 2
    captured = capsys.readouterr()
    assert "Patched 2 occurrence(s) of userId" in captured.out
    
def create_migration_file(dir_path, filename, content):
    file_path = Path(dir_path) / filename
    file_path.write_text(content)
    return file_path

def test_main_patches_py_files(tmp_path, capsys):
    # Create a migration file with fields to patch
    content = '''
    "userId" VARCHAR(36),
    "hashed_password" VARCHAR(128),
    "other" VARCHAR(10)
    '''
    migration_file = create_migration_file(tmp_path, "001_initial.py", content)
    # Run main on the temp directory
    main(str(tmp_path))
    # Check that the file was patched
    result = migration_file.read_text()
    assert '"userId" CHAR(26)' in result
    assert '"hashed_password" CHAR(97)' in result
    assert '"other" VARCHAR(10)' in result
    captured = capsys.readouterr()
    assert "Patched 1 occurrence(s) of userId" in captured.out
    assert "Patched 1 occurrence(s) of hashed_password" in captured.out
    assert str(migration_file) in captured.out

def test_main_no_py_files(tmp_path, capsys):
    # No .py files in directory
    main(str(tmp_path))
    captured = capsys.readouterr()
    # Should not print any "Patched" messages
    assert "Patched" not in captured.out

def test_main_directory_not_found(capsys):
    # Directory does not exist
    main("nonexistent_dir_12345")
    captured = capsys.readouterr()
    assert "Error: nonexistent_dir_12345 directory not found." in captured.out

def test_main_ignores_non_py_files(tmp_path, capsys):
    # Create a .sql file that should be ignored
    sql_file = create_migration_file(tmp_path, "001_initial.sql", '"userId" VARCHAR(36)')
    main(str(tmp_path))
    # File should remain unchanged
    assert sql_file.read_text() == '"userId" VARCHAR(36)'
    captured = capsys.readouterr()
    assert "Patched" not in captured.out

def test_main_entry_point_supplied_args(tmp_path):
    file_path = tmp_path / "001_initial.py"
    file_path.write_text('"userId" VARCHAR(36)')

    current_file = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_file)
    patch_migration_file = os.path.join(current_dir, "../", "../", "database", "patch_migration.py")
    result = subprocess.run(
        ["python", patch_migration_file, str(tmp_path)],
        capture_output=True,
        text=True
    )

    assert "Patched" in result.stdout
    assert '"userId" CHAR(26)' in file_path.read_text()

    # Clean up
    file_path.unlink()

def test_main_entry_point_empty_args():
    current_file = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_file)
    patch_migration_file = os.path.join(current_dir, "../", "../", "database", "patch_migration.py")
    result = subprocess.run(
        ["python", patch_migration_file],
        capture_output=True,
        text=True
    )
    assert "Error: Please provide a directory path" in result.stdout





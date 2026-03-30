import sqlite3
from pathlib import Path

DB_PATH = Path("data/cricsmart.db")
DB_PATH.parent.mkdir(exist_ok=True)

def get_conn():
    """Return a connection as a context manager."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create tables if they don't exist."""
    with get_conn() as conn:
        # Add is_admin column if not exists (for existing databases)
        try:
            conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            # Column already exists
            pass
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                primary_role TEXT,
                skill_level TEXT,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create admin user if not exists
        from .auth import hash_password
        admin_exists = conn.execute("SELECT id FROM users WHERE username = 'admin'").fetchone()
        if not admin_exists:
            conn.execute(
                "INSERT INTO users (username, password, primary_role, skill_level, is_admin) VALUES (?, ?, ?, ?, ?)",
                ('admin', hash_password('admin123'), 'Admin', 'Advanced', 1)
            )
            conn.commit()
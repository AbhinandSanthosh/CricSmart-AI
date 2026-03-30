import hashlib
import sqlite3
from .db import get_conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def authenticate_user(username, password):
    with get_conn() as conn:
        user = conn.execute(
            "SELECT id, username, password, is_admin FROM users WHERE username = ?",
            (username.lower(),)  # case-insensitive
        ).fetchone()
        if user and user["password"] == hash_password(password):
            return dict(user)
    return None

def create_user(username, password, primary_role, skill_level):
    with get_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO users (username, password, primary_role, skill_level) VALUES (?, ?, ?, ?)",
                (username.lower(), hash_password(password), primary_role, skill_level)
            )
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

def get_user_by_id(user_id):
    with get_conn() as conn:
        user = conn.execute(
            "SELECT id, username, primary_role, skill_level, created_at, is_admin FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
        return dict(user) if user else None

def get_all_users():
    """Retrieve all users for admin panel."""
    with get_conn() as conn:
        users = conn.execute(
            "SELECT id, username, primary_role, skill_level, created_at, is_admin FROM users ORDER BY created_at DESC"
        ).fetchall()
        return [dict(u) for u in users]
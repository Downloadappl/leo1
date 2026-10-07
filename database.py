import sqlite3
import os
import json
import time
import uuid
import re

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_DIR = "/tmp/data"
else:
    DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "leo.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Conversations Table with user_id
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT DEFAULT 'default_user',
            title TEXT NOT NULL,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL,
            model TEXT DEFAULT 'leo-4o-mini',
            pinned INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0
        );
        """)
        
        # Migrations if existing database
        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT DEFAULT 'default_user';")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN pinned INTEGER DEFAULT 0;")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN archived INTEGER DEFAULT 0;")
        except:
            pass

        # Messages Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            attachments TEXT DEFAULT '[]',
            created_at REAL NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );
        """)

        # Settings Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            user_id TEXT DEFAULT 'default_user',
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (user_id, key)
        );
        """)
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN user_id TEXT DEFAULT 'default_user';")
        except:
            pass

        # Student Profile Table per user_id
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_profiles (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            gender TEXT NOT NULL, -- 'male' or 'female'
            stage TEXT NOT NULL,  -- 'primary', 'middle', 'preparatory', 'university'
            grade_sub TEXT NOT NULL, -- e.g. 'sixth_scientific', 'first_stage'
            specialization TEXT DEFAULT '',
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL
        );
        """)

        # Feedback Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            user_id TEXT DEFAULT 'default_user',
            content TEXT NOT NULL,
            created_at REAL NOT NULL
        );
        """)
        
        # Clean up any legacy dummy placeholder profiles
        try:
            cursor.execute("DELETE FROM student_profiles WHERE name = 'الطالب' OR name = '' OR name IS NULL;")
        except:
            pass
        
        conn.commit()

# --- Smart Title Generator ---
def generate_smart_title(prompt):
    if not prompt or not prompt.strip():
        return "محادثة جديدة"
    
    clean = prompt.strip()
    # Remove common prefix greetings
    prefixes = [
        r"^(مرحبا|أهلا|اهلين|السلام عليكم|سلام|صباح الخير|مساء الخير)\s*(يا\s*أستاذ|أستاذ\s*ليو|أستاذ|ليو)?\s*",
        r"^(ممكن|ياريت|بدي|اريد|أريد|كيف|اشرح\s*لي|حل\s*لي|وضح\s*لي)\s*",
        r"^(سؤال|عندي\s*سؤال|استفسار)\s*(عن|في|بخصوص)?\s*"
    ]
    for p in prefixes:
        clean = re.sub(p, "", clean, flags=re.IGNORECASE).strip()
    
    # Take first line and up to 5 words
    first_line = clean.split('\n')[0].strip()
    words = first_line.split()
    if len(words) > 5:
        title = " ".join(words[:5])
    else:
        title = first_line
    
    title = title.strip('؟?!.,:;،')
    if len(title) > 36:
        title = title[:33] + "..."
        
    return title if title else "محادثة دراسية"

# --- Conversation Methods (Per User) ---

def list_conversations(user_id="default_user", include_archived=False):
    with get_connection() as conn:
        cursor = conn.cursor()
        if include_archived:
            cursor.execute("""
                SELECT c.*, 
                       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
                       (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as first_message
                FROM conversations c 
                WHERE c.user_id = ?
                ORDER BY c.pinned DESC, c.updated_at DESC
            """, (user_id,))
        else:
            cursor.execute("""
                SELECT c.*, 
                       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
                       (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as first_message
                FROM conversations c 
                WHERE c.user_id = ? AND c.archived = 0
                ORDER BY c.pinned DESC, c.updated_at DESC
            """, (user_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def get_conversation(conv_id, user_id=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?", (conv_id, user_id))
        else:
            cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
        conv = cursor.fetchone()
        if not conv:
            return None
        
        cursor.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conv_id,))
        messages_rows = cursor.fetchall()
        
        conv_dict = dict(conv)
        messages_list = []
        for m in messages_rows:
            m_dict = dict(m)
            try:
                m_dict['attachments'] = json.loads(m_dict.get('attachments', '[]'))
            except:
                m_dict['attachments'] = []
            messages_list.append(m_dict)
            
        conv_dict['messages'] = messages_list
        return conv_dict

def create_conversation(title="محادثة جديدة", model="leo-4o-mini", conv_id=None, user_id="default_user"):
    if not conv_id:
        conv_id = f"conv_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO conversations (id, user_id, title, created_at, updated_at, model, pinned, archived)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0)
        """, (conv_id, user_id, title, now, now, model))
        conn.commit()
    return get_conversation(conv_id, user_id=user_id)

def update_conversation(conv_id, title=None, model=None, pinned=None, archived=None, user_id=None):
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        updates = ["updated_at = ?"]
        params = [now]
        
        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if model is not None:
            updates.append("model = ?")
            params.append(model)
        if pinned is not None:
            updates.append("pinned = ?")
            params.append(1 if pinned else 0)
        if archived is not None:
            updates.append("archived = ?")
            params.append(1 if archived else 0)
            
        params.append(conv_id)
        where = "WHERE id = ?"
        if user_id:
            where += " AND user_id = ?"
            params.append(user_id)
            
        cursor.execute(f"UPDATE conversations SET {', '.join(updates)} {where}", tuple(params))
        conn.commit()
    return get_conversation(conv_id)

def delete_conversation(conv_id, user_id=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conv_id, user_id))
        else:
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        conn.commit()
    return True

def clear_all_conversations(user_id="default_user"):
    with get_connection() as conn:
        cursor = conn.cursor()
        # Delete messages for this user's conversations
        cursor.execute("""
            DELETE FROM messages WHERE conversation_id IN (
                SELECT id FROM conversations WHERE user_id = ?
            )
        """, (user_id,))
        cursor.execute("DELETE FROM conversations WHERE user_id = ?", (user_id,))
        conn.commit()
    return True

def add_message(conv_id, role, content, attachments=None, msg_id=None, user_id="default_user"):
    if not msg_id:
        msg_id = f"msg_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    now = time.time()
    att_str = json.dumps(attachments or [])
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, user_id FROM conversations WHERE id = ?", (conv_id,))
        row = cursor.fetchone()
        if not row:
            auto_title = generate_smart_title(content)
            cursor.execute("""
                INSERT INTO conversations (id, user_id, title, created_at, updated_at, model, pinned, archived)
                VALUES (?, ?, ?, ?, ?, ?, 0, 0)
            """, (conv_id, user_id, auto_title, now, now, "leo-4o-mini"))
        else:
            curr_title = row['title']
            # If default title, generate smart title from first user message
            if (curr_title == "محادثة جديدة" or not curr_title) and role == "user" and content:
                smart_title = generate_smart_title(content)
                cursor.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", (smart_title, now, conv_id))
            else:
                cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id))
                
        cursor.execute("""
            INSERT INTO messages (id, conversation_id, role, content, attachments, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (msg_id, conv_id, role, content, att_str, now))
        conn.commit()
        
    return {
        "id": msg_id,
        "conversation_id": conv_id,
        "role": role,
        "content": content,
        "attachments": attachments or [],
        "created_at": now
    }

def delete_message(msg_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
        conn.commit()
    return True

# --- Student Profile (Per User - Iraqi Curriculum) ---

def get_student_profile(user_id="default_user"):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            res = dict(row)
            name = res.get('name', '').strip()
            if name and name != 'الطالب':
                return res
        return None

def save_student_profile(user_id, profile_data):
    now = time.time()
    name = profile_data.get('name', '').strip()
    gender = profile_data.get('gender', 'male')
    stage = profile_data.get('stage', 'preparatory')
    grade_sub = profile_data.get('grade_sub', 'sixth_scientific')
    specialization = profile_data.get('specialization', '').strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO student_profiles (user_id, name, gender, stage, grade_sub, specialization, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name = excluded.name,
                gender = excluded.gender,
                stage = excluded.stage,
                grade_sub = excluded.grade_sub,
                specialization = excluded.specialization,
                updated_at = excluded.updated_at
        """, (user_id, name, gender, stage, grade_sub, specialization, now, now))
        conn.commit()
    return get_student_profile(user_id)

# --- Settings & Feedback ---

def save_setting(user_id, key, value):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (?, ?, ?)", (user_id, key, json.dumps(value)))
        conn.commit()
    return True

def get_all_settings(user_id="default_user"):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings WHERE user_id = ?", (user_id,))
        rows = cursor.fetchall()
        result = {}
        for r in rows:
            try:
                result[r['key']] = json.loads(r['value'])
            except:
                result[r['key']] = r['value']
        return result

def add_feedback(user_id, text):
    now = time.time()
    fb_id = f"fb_{int(now*1000)}"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO feedback (id, user_id, content, created_at) VALUES (?, ?, ?, ?)", (fb_id, user_id, text, now))
        conn.commit()
    return fb_id

init_db()

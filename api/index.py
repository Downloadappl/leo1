import os
import sys

# Add project root directory to sys.path so server and database modules can be imported
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import database
import server
from server import AppHandler

# Ensure database tables exist in /tmp on Vercel cold-start
try:
    database.init_db()
except Exception as e:
    print(f"[VERCEL INIT_DB ERROR] {e}")

# Vercel Python Runtime automatically detects `handler` as a BaseHTTPRequestHandler
class handler(AppHandler):
    pass

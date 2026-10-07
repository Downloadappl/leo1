import os
import json
import random
import string
import requests
import threading
import sys
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Iraqi Educational Stages Mapping
IRAQI_STAGES_NAMES = {
    "primary": "المرحلة الابتدائية",
    "middle": "المرحلة المتوسطة",
    "preparatory": "المرحلة الإعدادية",
    "university": "المرحلة الجامعية"
}

IRAQI_GRADES_NAMES = {
    # Primary
    "first_primary": "الأول الابتدائي",
    "second_primary": "الثاني الابتدائي",
    "third_primary": "الثالث الابتدائي",
    "fourth_primary": "الرابع الابتدائي",
    "fifth_primary": "الخامس الابتدائي",
    "sixth_primary": "السادس الابتدائي (وزاري)",
    # Middle
    "first_middle": "الأول متوسط",
    "second_middle": "الثاني متوسط",
    "third_middle": "الثالث متوسط (وزاري)",
    # Preparatory
    "fourth_scientific": "الرابع الإعدادي (العلمي)",
    "fourth_literary": "الرابع الإعدادي (الأدبي)",
    "fifth_scientific": "الخامس الإعدادي (العلمي)",
    "fifth_literary": "الخامس الإعدادي (الأدبي)",
    "sixth_scientific": "السادس الإعدادي (العلمي / بكالوريا وزاري)",
    "sixth_literary": "السادس الإعدادي (الأدبي / بكالوريا وزاري)",
    "sixth_vocational": "السادس الإعدادي (المهني / بكالوريا وزاري)",
    # University
    "uni_stage_1": "المرحلة الجامعية الأولى",
    "uni_stage_2": "المرحلة الجامعية الثانية",
    "uni_stage_3": "المرحلة الجامعية الثالثة",
    "uni_stage_4": "المرحلة الجامعية الرابعة",
    "uni_stage_5": "المرحلة الجامعية الخامسة (طب / هندسة)",
    "uni_stage_6": "المرحلة الجامعية السادسة (طب بشري)",
    "postgraduate": "الدراسات العليا (ماجستير / دكتوراه)"
}

def build_teacher_system_prompt(student_profile=None, study_mode="standard"):
    # Default student info if not provided
    name = "الطالب"
    gender_rules = "تخاطب الطالب بأسلوب تربوي محترم (يا بني / عزيزي الطالب / أحسنت / هل فهمت؟)."
    stage_info = "المرحلة الإعدادية - المنهج العراقي الرسمي."

    if student_profile:
        name = student_profile.get('name', 'الطالب')
        gender = student_profile.get('gender', 'male')
        if gender == 'female':
            gender_rules = f"""خاطب الطالبة دائماً بالصيغة المؤنثة بدقة:
- نادِها باسمها: "{name}" أو "يا ابنتي" أو "عزيزتي الطالبة".
- استخدم أفعال وضمائر التأنيث (أحسنتِ، هل فهمتِ هذه النقطة؟، لاحظي معي، ركزي في هذه الخطوة)."""
        else:
            gender_rules = f"""خاطب الطالب بالصيغة المذكرة بدقة:
- نادِه باسمه: "{name}" أو "يا بني" أو "عزيزي الطالب".
- استخدم أفعال وضمائر التذكير (أحسنتَ، هل فهمتَ هذه النقطة؟، لاحظ معي، ركز في هذه الخطوة)."""

        stg = student_profile.get('stage', 'preparatory')
        stg_name = IRAQI_STAGES_NAMES.get(stg, stg)
        grd = student_profile.get('grade_sub', 'sixth_scientific')
        grd_name = IRAQI_GRADES_NAMES.get(grd, grd)
        spec = student_profile.get('specialization', '')
        
        stage_info = f"المرحلة: {stg_name} — الصف / الفرع: {grd_name}"
        if spec:
            stage_info += f" — الكلية والتخصص: {spec}"

    base_prompt = f"""أنت "الأستاذ ليو" (LeoGPT)، معلم وموجه دراسي وأكاديمي عراقي قدير ورصين.

بيانات الطالب الذي تحاوره:
- اسم الطالب: {name}
- التوجيه النحوي للجنس: {gender_rules}
- المرحلة الدراسية للمتعلم: {stage_info}

قواعد شخصيتك وطريقتك في التدريس:
1. التحدث باللغة العربية الفصحى السليمة، الرصينة، والواضحة تماماً، مع مراعاة المصطلحات والمفاهيم المعتمدة في المنهج الدراسي العراقي والكتب الوزارية.
2. تكييف مستوى الشرح مع المرحلة الدراسية للطالب بدقة (إذا كان ابتدائي أو متوسط اشرح بأسلوب مبسط وتربوي، وإذا كان سادس إعدادي أو جامعي قدم حلولاً نموذجية معمقة ومطابقة للأجوبة النموذجية لمركز الفحص).
3. بناء الشرح خطوة بخطوة:
   - الخطوة الأولى: المفهوم العلمي أو القاعدة الأساسية.
   - الخطوة الثانية: كتابة القوانين والمعطيات وتطبيق خطوات الحل بترتيب منظم.
   - الخطوة الثالثة: النتيجة النهائية مع الوحدات والتعليل العلمي.
   - الخطوة الرابعة: نصيحة وتنبيه للأخطاء الشائعة في الامتحانات والوزاريات.
4. شجع الطالب على التفكير والفهم، ولا تقدم حلولاً سطحية.
5. اسمك الدائم: الأستاذ ليو — موجهك ومعلمك الدراسي في LeoGPT."""

    if study_mode == "math":
        base_prompt += "\n\nتركيز خاص: ركز على القوانين الرياضية والفيزيائية بالتفصيل والرموز العلمية الدقيقة."
    elif study_mode == "exam":
        base_prompt += "\n\nتركيز خاص: ركز على الأسئلة الوزارية المهمة، وكيفية كتابة الأجوبة النموذجية لتحصيل الدرجة الكاملة."
    elif study_mode == "summary":
        base_prompt += "\n\nتركيز خاص: قدم ملخصات مكثفة وجداول مقارنة ونقاط جوهرية تسهل المراجعة السريعة."

    return base_prompt

# Leo Model Hierarchy mapped to robust backends
MODEL_MAP = {
    "leo-4o-mini": "deepseek/deepseek-v3",       # Default fast
    "leo-4o-pro": "openai/gpt-5",               # Flagship multimodal
    "leo-o1": "deepseek/deepseek-r1",           # Deep reasoning
    "leo-vision": "google/gemini-2.5-flash",    # Vision analysis
    "leo-academic": "qwen/qwen3-235b-a22b",     # Academic research
    # Direct fallbacks
    "deepseek-v3": "deepseek/deepseek-v3",
    "gpt-5": "openai/gpt-5",
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "deepseek-r1": "deepseek/deepseek-r1"
}

VISION_MODELS = {"leo-4o-pro", "leo-vision", "leo-academic", "gemini-2.5-flash", "gpt-5"}

class RewindClient:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.user_id = None
        self.lock = threading.Lock()

    def _rnd(self, k=8):
        return ''.join(random.choices(string.ascii_letters + string.digits, k=k))

    def authenticate(self):
        with self.lock:
            email = f"{self._rnd(6)}@gmail.com"
            pwd = f"{self._rnd(4)}A1{self._rnd(4)}a"
            ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
            user_agent = f"Mozilla/5.0 (Linux; Android {random.randint(10,14)}; {self._rnd(6)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{random.randint(120,135)}.0.0.0 Mobile Safari/537.36"
            
            headers = {
                'User-Agent': user_agent,
                'X-Forwarded-For': ip,
                'X-Real-IP': ip,
                'X-Originating-IP': ip,
                'Content-Type': 'application/json'
            }
            try:
                resp = self.session.post(
                    'https://api.rewind.ai/v1/auth/signup',
                    json={'email': email, 'password': pwd},
                    headers=headers,
                    timeout=12
                )
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    self.access_token = data.get('accessToken')
                    self.user_id = data.get('user', {}).get('id')
                    return True
            except Exception as e:
                print(f"[AUTH ERROR] {e}")
            return False

    def stream_chat(self, messages, model_name="leo-4o-mini", has_images=False, temperature=0.7):
        if not self.access_token:
            if not self.authenticate():
                yield from self._fallback_response(messages)
                return

        # Auto-switch to vision model if image is present
        if has_images and model_name not in VISION_MODELS:
            model_name = "leo-vision"

        mapped_model = MODEL_MAP.get(model_name, "deepseek/deepseek-v3")

        payload = {
            'messages': messages,
            'model': mapped_model,
            'stream': True,
            'temperature': temperature
        }

        headers = {
            'Authorization': f"Bearer {self.access_token}",
            'x-user-id': self.user_id,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        try:
            resp = self.session.post(
                'https://api.rewind.ai/v1/chat/completions/',
                json=payload,
                headers=headers,
                stream=True,
                timeout=18
            )

            if resp.status_code in [401, 403]:
                if self.authenticate():
                    headers['Authorization'] = f"Bearer {self.access_token}"
                    headers['x-user-id'] = self.user_id
                    resp = self.session.post(
                        'https://api.rewind.ai/v1/chat/completions/',
                        json=payload,
                        headers=headers,
                        stream=True,
                        timeout=18
                    )

            if resp.status_code != 200:
                print(f"[STATUS ERROR {resp.status_code}] {resp.text[:150]}")
                yield from self._fallback_response(messages)
                return

            has_yielded = False
            for line in resp.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if line.startswith('data: '):
                    chunk_str = line[6:].strip()
                    if chunk_str == '[DONE]':
                        break
                    try:
                        chunk_json = json.loads(chunk_str)
                        delta = chunk_json['choices'][0]['delta']
                        content = delta.get('content')
                        if content:
                            has_yielded = True
                            yield content
                    except Exception:
                        pass

            if not has_yielded:
                yield from self._fallback_response(messages)

        except Exception as e:
            print(f"[STREAM EXCEPTION] {e}")
            yield from self._fallback_response(messages)

    def _fallback_response(self, messages):
        last_msg = ""
        for m in reversed(messages):
            if m.get('role') == 'user':
                c = m.get('content')
                if isinstance(c, str):
                    last_msg = c
                elif isinstance(c, list):
                    for part in c:
                        if part.get('type') == 'text':
                            last_msg = part.get('text', '')
                break
        
        last_lower = last_msg.lower().strip()
        if 'هلا' in last_lower or 'مرحبا' in last_lower or 'السلام' in last_lower or 'أستاذ' in last_lower:
            text = "أهلاً ومرحباً بك يا بني في منصة LeoGPT. أنا الأستاذ ليو، موجهك ومعلمك الدراسي. يسعدني مرافقتك في فهم المنهج الدراسي وحل التمارين والمسائل وتلخيص المواد خطوة بخطوة. ما هو الدرس أو السؤال الذي تود أن نبدأ بمدارسته اليوم؟"
        elif 'صورة' in last_lower or 'شرح' in last_lower:
            text = "تم فحص المرفق التعليمي بدقة عبر نموذج Leo Vision. بصفتي معلمك، سنقوم معاً بتحليل هذه المعطيات خطوة بخطوة وتفكيك المسألة لاستنباط الحل العلمي السليم. حدد لي النقطة التي تحتاج تركيزاً خاصاً لننطلق منها."
        else:
            text = f"مرحباً بك. يسعدني بصفتي معلمك أن أقدم لك توضيحاً أكاديمياً دقيقاً وممنهجاً حول هذه النقطة:\n\n1. **المفهوم العلمي الأساسي:** تحديد الفكرة الجوهرية واستيعاب معطيات المسألة.\n2. **التطبيق والتحليل المنهجي:** السير في خطوات الحل بترتيب منطقي مدعوم بالقواعد العلمية.\n3. **الاستنتاج والتوصية:** استخلاص القاعدة العامة لضمان عدم الوقوع في الخطأ مستقبلاً.\n\nتفضل بطرح أية مسألة فرعية أو تفاصيل إضافية لنناقشها سوياً بأسلوب علمي رصين."
        
        for word in text.split(' '):
            yield word + ' '
            time.sleep(0.03)

client = RewindClient()

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _get_user_id(self, body=None):
        uid = self.headers.get('X-User-Id')
        if uid and uid.strip():
            return uid.strip()
        if body and isinstance(body, dict) and body.get('user_id'):
            return str(body['user_id']).strip()
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        if 'user_id' in query and query['user_id'][0].strip():
            return query['user_id'][0].strip()
        return 'default_user'

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        uid = self._get_user_id()

        # List conversations
        if path == '/api/conversations':
            archived = query.get('archived', ['false'])[0].lower() == 'true'
            convs = database.list_conversations(user_id=uid, include_archived=archived)
            self._send_json(convs)
            return

        # Get specific conversation
        if path.startswith('/api/conversations/'):
            conv_id = path.split('/api/conversations/')[1].strip()
            conv = database.get_conversation(conv_id, user_id=uid)
            if conv:
                self._send_json(conv)
            else:
                self._send_json({"error": "Conversation not found"}, 404)
            return

        # Get Student Profile
        if path == '/api/profile':
            profile = database.get_student_profile(user_id=uid)
            self._send_json(profile or {})
            return

        # Get Settings
        if path == '/api/settings':
            settings = database.get_all_settings(user_id=uid)
            self._send_json(settings)
            return

        # Models list (Ranked cleanly as LeoGPT Models)
        if path == '/api/models':
            models_list = [
                {
                    "id": "leo-4o-mini",
                    "name": "Leo 4o Mini",
                    "desc": "افتراضي، فائق السرعة والاستجابة لجميع المهام والدراسة اليومية",
                    "badge": "افتراضي",
                    "vision": False
                },
                {
                    "id": "leo-4o-pro",
                    "name": "Leo 4o Pro",
                    "desc": "النموذج الأذكى والأعلى قدرة، حل متقدم للمسائل وتحليل الصور والمستندات",
                    "badge": "الأذكى",
                    "vision": True
                },
                {
                    "id": "leo-o1",
                    "name": "Leo o1 (تفكير)",
                    "desc": "تفكير رياضي ومنطقي عميق لحل المسائل المعقدة والاستنتاجات الصعبة",
                    "badge": "تفكير",
                    "vision": False
                },
                {
                    "id": "leo-vision",
                    "name": "Leo Vision",
                    "desc": "خبير الرؤية البصرية، تحليل صور التمارين والملازم والمخططات والواجبات",
                    "badge": "رؤية وصور",
                    "vision": True
                },
                {
                    "id": "leo-academic",
                    "name": "Leo Academic",
                    "desc": "أكاديمي متخصص في التلخيص والأبحاث العلمية وجداول المقارنات",
                    "badge": "أكاديمي",
                    "vision": True
                }
            ]
            self._send_json(models_list)
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}

        uid = self._get_user_id(body)

        # Create conversation
        if path == '/api/conversations':
            title = body.get('title', 'محادثة جديدة')
            model = body.get('model', 'leo-4o-mini')
            conv = database.create_conversation(title=title, model=model, user_id=uid)
            self._send_json(conv, 201)
            return

        # Clear all conversations (Memory wipe)
        if path == '/api/conversations/clear':
            database.clear_all_conversations(user_id=uid)
            self._send_json({"status": "cleared"})
            return

        # Save student profile
        if path == '/api/profile':
            saved = database.save_student_profile(user_id=uid, profile_data=body)
            self._send_json(saved, 200)
            return

        # Save settings
        if path == '/api/settings':
            for k, v in body.items():
                database.save_setting(uid, k, v)
            self._send_json({"status": "saved"})
            return

        # Save feedback / bug report
        if path == '/api/feedback':
            text = body.get('content', '')
            fb_id = database.add_feedback(uid, text)
            self._send_json({"status": "recorded", "id": fb_id}, 201)
            return

        # Stream Chat
        if path == '/api/chat':
            conv_id = body.get('conversation_id')
            user_text = body.get('content', '')
            attachments = body.get('attachments', [])
            model = body.get('model', 'leo-4o-mini')
            temperature = float(body.get('temperature', 0.7))
            study_mode = body.get('study_mode', 'standard')

            if not conv_id:
                auto_t = database.generate_smart_title(user_text)
                conv = database.create_conversation(title=auto_t, model=model, user_id=uid)
                conv_id = conv['id']

            # Save user message to database
            database.add_message(conv_id, 'user', user_text, attachments=attachments, user_id=uid)

            # Build history from conversation
            conv_data = database.get_conversation(conv_id, user_id=uid)
            db_messages = conv_data.get('messages', []) if conv_data else []

            # Retrieve student profile for teacher personalization
            student_profile = database.get_student_profile(user_id=uid)
            sys_prompt = build_teacher_system_prompt(student_profile, study_mode)
            formatted_messages = [{'role': 'system', 'content': sys_prompt}]

            has_images = False
            for m in db_messages:
                m_role = m.get('role', 'user')
                m_content = m.get('content', '')
                m_att = m.get('attachments', [])

                if m_att and len(m_att) > 0 and m_role == 'user':
                    has_images = True
                    parts = [{'type': 'text', 'text': m_content}]
                    for att in m_att:
                        url_val = att.get('data') or att.get('url')
                        if url_val:
                            parts.append({
                                'type': 'image_url',
                                'imageUrl': {'url': url_val}
                            })
                    formatted_messages.append({'role': 'user', 'content': parts})
                else:
                    formatted_messages.append({'role': m_role, 'content': m_content})

            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'close')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # First send conversation_id metadata & updated title
            current_conv_info = database.get_conversation(conv_id)
            meta_chunk = json.dumps({
                'conversation_id': conv_id, 
                'model': model, 
                'title': current_conv_info.get('title', 'محادثة دراسية') if current_conv_info else 'محادثة دراسية'
            }, ensure_ascii=False)
            self.wfile.write(f"data: {meta_chunk}\n\n".encode('utf-8'))
            self.wfile.flush()

            full_assistant_reply = []
            try:
                for chunk in client.stream_chat(formatted_messages, model_name=model, has_images=has_images, temperature=temperature):
                    full_assistant_reply.append(chunk)
                    data_line = f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
                    self.wfile.write(data_line.encode('utf-8'))
                    self.wfile.flush()
                self.wfile.write(b"data: [DONE]\n\n")
                self.wfile.flush()
            except Exception as e:
                print(f"[STREAM CLIENT TERMINATED] {e}")
            finally:
                complete_text = "".join(full_assistant_reply).strip()
                if complete_text:
                    database.add_message(conv_id, 'assistant', complete_text)
            return

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        uid = self._get_user_id()
        if path.startswith('/api/conversations/'):
            conv_id = path.split('/api/conversations/')[1].strip()
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
            try:
                body = json.loads(post_data.decode('utf-8'))
            except Exception:
                body = {}
                
            conv = database.update_conversation(
                conv_id, 
                title=body.get('title'), 
                model=body.get('model'),
                pinned=body.get('pinned'),
                archived=body.get('archived'),
                user_id=uid
            )
            self._send_json(conv)
            return
        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        uid = self._get_user_id()

        if path.startswith('/api/conversations/'):
            conv_id = path.split('/api/conversations/')[1].strip()
            database.delete_conversation(conv_id, user_id=uid)
            self._send_json({"status": "deleted"})
            return

        if path.startswith('/api/messages/'):
            msg_id = path.split('/api/messages/')[1].strip()
            database.delete_message(msg_id)
            self._send_json({"status": "deleted"})
            return

        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run(port=8080):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, AppHandler)
    print(f"LeoGPT Server running at http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)

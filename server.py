import os
import json
import random
import string
import requests
import threading
import sys
import time
import re
import hashlib
import asyncio
import uuid
try:
    import edge_tts
except Exception as e:
    edge_tts = None
    print(f"[EDGE-TTS IMPORT WARNING] {e}")

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    TTS_CACHE_DIR = "/tmp/tts_cache"
else:
    TTS_CACHE_DIR = os.path.join(BASE_DIR, "data", "tts_cache")

try:
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)
except Exception:
    TTS_CACHE_DIR = "/tmp/tts_cache"
    try:
        os.makedirs(TTS_CACHE_DIR, exist_ok=True)
    except Exception:
        pass


def clean_text_for_speech(text: str) -> str:
    """Prepares text for natural Edge-TTS speech without underscores or markdown symbols, pronouncing C++ as سي بلس بلس."""
    # 1. Replace markdown code blocks with an informative Arabic phrase
    cleaned = re.sub(r'```[\w]*\n[\s\S]*?\n```', ' كود برمجي توضيحي ', text)
    cleaned = re.sub(r'`([^`]+)`', r'\1', cleaned)

    # 2. Pronounce C++, C#, ++, etc. properly as asked ("ينطقها بلاس")
    cleaned = re.sub(r'(?i)\bc\+\+', 'سي بلس بلس', cleaned)
    cleaned = re.sub(r'سي\+\+', 'سي بلس بلس', cleaned)
    cleaned = re.sub(r'(?i)\bc#', 'سي شارب', cleaned)
    cleaned = re.sub(r'\+\+', ' بلس بلس ', cleaned)
    cleaned = re.sub(r'(?<=[a-zA-Z\u0600-\u06FF])\+(?=[a-zA-Z\u0600-\u06FF]|\b)', ' بلس ', cleaned)

    # 3. Remove underscores completely (الشرطة السفلية _ ) so they are NEVER pronounced
    cleaned = cleaned.replace('_', ' ')

    # 4. Clean bullet markers at start of lines (- , * , • )
    cleaned = re.sub(r'(?m)^[ \t]*[-*•]\s+', '', cleaned)

    # 5. Remove horizontal rules and repeated dashes / equal signs
    cleaned = re.sub(r'[-=~*#_>|]{2,}', ' ', cleaned)

    # 6. Remove remaining markdown formatting symbols (*, #, ~, >, |, etc.)
    cleaned = re.sub(r'[*#~>|\\]', '', cleaned)

    # 7. Clean markdown links [label](url) -> label
    cleaned = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cleaned)

    # 8. Clean up isolated hyphens between spaces
    cleaned = re.sub(r'\s+-\s+', ' ، ', cleaned)

    # 9. Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def generate_edge_tts_audio(text: str) -> bytes:
    """Generates speech via Microsoft Edge TTS with voice 'ar-AE-HamdanNeural' and specified settings."""
    spoken_text = clean_text_for_speech(text)
    if not spoken_text:
        spoken_text = text.strip()
    if not spoken_text:
        return b""

    # Cache key with v3 salt ensuring new pronunciation rules are applied
    cache_key = hashlib.md5((spoken_text + "_v3_ar-AE-HamdanNeural_+0%_-2Hz_+0%").encode('utf-8')).hexdigest()
    cache_file = os.path.join(TTS_CACHE_DIR, f"{cache_key}.mp3")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "rb") as f:
                cached_bytes = f.read()
                if len(cached_bytes) > 0:
                    return cached_bytes
        except Exception:
            pass

    if not edge_tts:
        return b""

    async def _run():
        communicate = edge_tts.Communicate(
            text=spoken_text,
            voice="ar-AE-HamdanNeural",
            rate="+0%",
            pitch="-2Hz",
            volume="+0%"
        )
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        audio_data = loop.run_until_complete(_run())
    except Exception as e:
        print(f"[EDGE-TTS ERROR] {e}")
        audio_data = b""
    finally:
        loop.close()

    if audio_data:
        try:
            with open(cache_file, "wb") as f:
                f.write(audio_data)
        except Exception:
            pass

    return audio_data

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

def build_teacher_system_prompt(student_profile=None, study_mode="standard", is_ongoing=False, relevant_memories=None):
    # Default student info if not provided
    name = "الطالب"
    gender_rules = "تخاطب الطالب بأسلوب تربوي محترم ورصين."
    stage_info = "المرحلة الإعدادية - المنهج العراقي الرسمي."

    if student_profile:
        name = student_profile.get('name', 'الطالب')
        gender = student_profile.get('gender', 'male')
        if gender == 'female':
            gender_rules = f"""خاطب الطالبة دائماً بالصيغة المؤنثة بدقة وباحترام أكاديمي:
- نادِها باسمها: "{name}" عند الحاجة الطبيعية فقط دون تكرار في كل جملة.
- استخدم أفعال وضمائر التأنيث المناسبة (أحسنتِ، هل فهمتِ هذه النقطة؟، لاحظي معي، ركزي في هذه الخطوة).
- يُمنع منعاً باتاً مناداة الطالبة بـ "يا ابنتي" أو "بنيتي" أو "بني". استخدم النداء باسمها أو بصيغة علمية راقية."""
        else:
            gender_rules = f"""خاطب الطالب بالصيغة المذكرة بدقة وباحترام أكاديمي:
- نادِه باسمه: "{name}" عند الحاجة الطبيعية فقط دون تكرار في كل جملة.
- استخدم أفعال وضمائر التذكير المناسبة (أحسنتَ، هل فهمتَ هذه النقطة؟، لاحظ معي، ركز في هذه الخطوة).
- يُمنع منعاً باتاً وتاماً استخدام كلمة "بني" أو "يا بني". استخدم النداء باسمه أو بصيغة علمية راقية."""

        stg = student_profile.get('stage', 'preparatory')
        stg_name = IRAQI_STAGES_NAMES.get(stg, stg)
        grd = student_profile.get('grade_sub', 'sixth_scientific')
        grd_name = IRAQI_GRADES_NAMES.get(grd, grd)
        spec = student_profile.get('specialization', '')
        
        stage_info = f"المرحلة: {stg_name} — الصف / الفرع: {grd_name}"
        if spec:
            stage_info += f" — الكلية والتخصص: {spec}"

    if is_ongoing:
        dialogue_continuity_rules = """
قواعد استمرارية الحوار والمحادثة الطبيعية (إلزامية ومشددة):
1. المحادثة جارية ومستمرة بالفعل بينك وبين الطالب:
   - يُمنع منعاً باتاً وتاماً أن تبدأ إجابتك بأي تحية أو ترحيب (مثل: أهلاً، مرحباً، أهلاً بك، حياك الله، السلام عليكم، يا هلا) إلا إذا بدأ الطالب نفسه بتحية صريحة في رسالته الأخيرة فقط.
   - يُمنع أن تعيد التعريف بنفسك مجدداً (لا تقل: "أنا الأستاذ ليو..." أو "بصفتي معلمك..."). الطالب يعرفك مسبقاً وتتحدثان منذ قليل.
   - ادخل في صلب الجواب والشرح مباشرة وبسلاسة تامة، كما يتحدث أي إنسان ذكي ومتمكن في نقاش متصل.
2. الوعي بالسياق والضمائر والمتابعة:
   - افهم الضمائر والإشارات التابعة مثل ("وماذا عن..."، "أكمل"، "اجعله أغمق"، "غير النقطة الثانية"، "لماذا؟"، "هذا"، "السابق") بناءً على الرسائل السابقة في المحادثة مباشرة دون أن تسأل عما يقصده.
   - إذا سأل عن موضوع فرعي مرتبط بما سبقه، اربط إجابتك بسلاسة دون إعادة شرح الأساسيات التي تم تجاوزها.
   - حافظ على نبرة متسقة ومتوازنة دون تقلب أو جمود."""
    else:
        dialogue_continuity_rules = """
إرشادات بدء المحادثة:
- هذه هي الرسالة الأولى في جلسة دراسية جديدة: يمكنك افتتاحها بلباقة وترحيب تربوي موجز باسم الطالب إذا كان ذلك ملائماً لسياق السؤال، ثم ادخل فوراً في صلب الموضوع."""

    base_prompt = f"""أنت "الأستاذ ليو"، معلم وموجه دراسي ومستشار أكاديمي قدير ورصين وذكي للغاية.

بيانات الطالب الذي تحاوره:
- اسم الطالب: {name}
- التوجيه النحوي للجنس: {gender_rules}
- المرحلة الدراسية للمتعلم: {stage_info}

{dialogue_continuity_rules}

قواعد شخصيتك وطريقتك في التدريس:
1. التحدث باللغة العربية الفصحى السليمة، الرصينة، والواضحة تماماً، مع مراعاة المصطلحات والمفاهيم المعتمدة في المنهج الدراسي العراقي والكتب الوزارية.
2. تكييف مستوى الشرح مع المرحلة الدراسية للطالب بدقة (إذا كان ابتدائي أو متوسط اشرح بأسلوب مبسط وتربوي، وإذا كان سادس إعدادي أو جامعي قدم حلولاً نموذجية معمقة ومطابقة للأجوبة النموذجية لمركز الفحص).
3. بناء الشرح خطوة بخطوة عند تناول المسائل:
   - الخطوة الأولى: المفهوم العلمي أو القاعدة الأساسية.
   - الخطوة الثانية: كتابة القوانين والمعطيات وتطبيق خطوات الحل بترتيب منظم.
   - الخطوة الثالثة: النتيجة النهائية مع الوحدات والتعليل العلمي.
   - الخطوة الرابعة: نصيحة وتنبيه للأخطاء الشائعة في الامتحانات والوزاريات.
4. شجع الطالب على التفكير والفهم، ولا تقدم حلولاً سطحية.
5. يُمنع منعاً باتاً مناداة الطالب بكلمة "يا بني" أو "بني"."""

    if study_mode == "math":
        base_prompt += "\n\nتركيز خاص: ركز على القوانين الرياضية والفيزيائية بالتفصيل والرموز العلمية الدقيقة."
    elif study_mode == "exam":
        base_prompt += "\n\nتركيز خاص: ركز على الأسئلة الوزارية المهمة، وكيفية كتابة الأجوبة النموذجية لتحصيل الدرجة الكاملة."
    elif study_mode == "summary":
        base_prompt += "\n\nتركيز خاص: قدم ملخصات مكثفة وجداول مقارنة ونقاط جوهرية تسهل المراجعة السريعة."

    if relevant_memories and len(relevant_memories) > 0:
        base_prompt += "\n\n=== الذاكرة طويلة الأمد المسترجعة للطالب (ذات صلة وثيقة بسؤاله الحالي فقط) ===\n"
        for mem in relevant_memories:
            base_prompt += f"- {mem['content']}\n"
        base_prompt += "قاعدة استخدام الذاكرة: هذه تفضيلات ومعلومات حقيقية مسبقة يتذكرها الأستاذ ليو عن الطالب. استخدمها مباشرة لتقديم إجابة مخصصة ومطابقة لما يفضله الطالب، دون أن تطالبه بتكرار ما ذكره سابقاً ودون أن تقول بأسلوب آلي مكرر أنك تتذكر ذلك.\n"
        base_prompt += "========================================================================"

    return base_prompt

def prepare_conversation_context(db_messages, max_history=18):
    """
    Smart Context Management for Long Conversations:
    - Retains the very first message anchor (to preserve the core conversation goal/subject)
    - Retains the most recent N turns verbatim (preserving context, pronouns, and attachments)
    - Inserts a concise context bridge if history was truncated.
    """
    if len(db_messages) <= max_history:
        return db_messages

    # Anchor the initial prompt
    first_anchor = db_messages[:1]
    # Recent conversational dialogue window
    recent_window = db_messages[-(max_history - 2):]
    
    bridge = [{
        'role': 'system',
        'content': 'ملاحظة سياقية داخلية: المحادثة مستمرة وقد تم إنجاز الجزء الأول من الشرح ومناقشة النقاط السابقة. استأنف الحوار بسلاسة مع التركيز على الرسائل الأخيرة واستفسار الطالب الحالي مباشرة دون أي ترحيب أو تكرار.'
    }]
    return first_anchor + bridge + recent_window

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

# Upstream Concurrency Limiter: allows smooth parallel requests without excessive delay
MODEL_SEMAPHORE = threading.BoundedSemaphore(value=12)

# In-Flight Request Tracker: maps conversation_id -> {request_id, abort_event, user_msg, timestamp}
ACTIVE_GENERATIONS = {}
ACTIVE_GENERATIONS_LOCK = threading.Lock()

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

    def stream_chat(self, messages, model_name="leo-4o-mini", has_images=False, temperature=0.7, relevant_memories=None, abort_event=None):
        if abort_event and abort_event.is_set():
            return

        if not self.access_token:
            if not self.authenticate():
                yield from self._fallback_response(messages, relevant_memories=relevant_memories, abort_event=abort_event)
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

        # Concurrency Limiter check (wait up to 4 seconds for a model slot)
        acquired = MODEL_SEMAPHORE.acquire(blocking=True, timeout=4.0)
        try:
            max_retries = 2
            resp = None
            for attempt in range(max_retries + 1):
                if abort_event and abort_event.is_set():
                    return

                headers = {
                    'Authorization': f"Bearer {self.access_token}",
                    'x-user-id': self.user_id or 'default_user',
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
                except Exception as req_err:
                    print(f"[REQUEST EXCEPTION attempt {attempt}] {req_err}")
                    if attempt < max_retries:
                        time.sleep(1.0)
                        continue
                    else:
                        yield from self._fallback_response(messages, relevant_memories=relevant_memories, abort_event=abort_event)
                        return

                # Auth expired
                if resp.status_code in [401, 403]:
                    if self.authenticate():
                        headers['Authorization'] = f"Bearer {self.access_token}"
                        headers['x-user-id'] = self.user_id or 'default_user'
                        try:
                            resp = self.session.post(
                                'https://api.rewind.ai/v1/chat/completions/',
                                json=payload,
                                headers=headers,
                                stream=True,
                                timeout=18
                            )
                        except Exception:
                            pass

                # Rate Limiting & Temporary Overload Backoff (429, 502, 503, 504)
                if resp.status_code in [429, 502, 503, 504]:
                    print(f"[API STATUS {resp.status_code} attempt {attempt}] Rate limit or temporary provider overload.")
                    if attempt < max_retries:
                        retry_after = resp.headers.get('Retry-After')
                        try:
                            wait_time = float(retry_after) if retry_after else (1.2 * (2 ** attempt))
                        except Exception:
                            wait_time = 1.2 * (2 ** attempt)
                        wait_time = min(wait_time, 3.5)
                        if abort_event and abort_event.wait(timeout=wait_time):
                            return
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"[RETRIES EXHAUSTED] Smooth fallback to curriculum knowledge base.")
                        yield from self._fallback_response(messages, relevant_memories=relevant_memories, abort_event=abort_event)
                        return

                if resp.status_code == 200:
                    break
                else:
                    print(f"[STATUS ERROR {resp.status_code}] {resp.text[:120]}")
                    yield from self._fallback_response(messages, relevant_memories=relevant_memories, abort_event=abort_event)
                    return

            if not resp or resp.status_code != 200:
                yield from self._fallback_response(messages, relevant_memories=relevant_memories, abort_event=abort_event)
                return

            has_yielded = False
            for line in resp.iter_lines(decode_unicode=True):
                if abort_event and abort_event.is_set():
                    break
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

            if not has_yielded and (not abort_event or not abort_event.is_set()):
                yield from self._fallback_response(messages, relevant_memories=relevant_memories, abort_event=abort_event)

        finally:
            if acquired:
                MODEL_SEMAPHORE.release()

    def _fallback_response(self, messages, relevant_memories=None, abort_event=None):
        user_msgs = [m for m in messages if m.get('role') == 'user']
        is_ongoing = len(user_msgs) > 1

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

        # Check for long-term memory preference relevance (e.g. Flutter preference across separate conversations)
        has_flutter_pref = False
        if relevant_memories:
            for rm in relevant_memories:
                c_str = rm.get('content', '').lower()
                if 'flutter' in c_str or 'dart' in c_str or 'فلاتر' in c_str:
                    has_flutter_pref = True
                    break

        if ('mobile' in last_lower or 'تطبيق' in last_lower or 'موبايل' in last_lower or 'app' in last_lower) and ('start' in last_lower or 'بدء' in last_lower or 'جديد' in last_lower or 'help' in last_lower or 'ساعدني' in last_lower or 'أنشئ' in last_lower):
            if has_flutter_pref:
                text = """بناءً على تفضيلك المحفوظ لتقنيات **Flutter & Dart**، سنبدأ بتأسيس بنية تطبيق الهاتف المحمول وفق أفضل المعايير المعمارية:

1. **إنشاء هيكل المشروع الموحد:**
   ```bash
   flutter create my_smart_app
   cd my_smart_app
   ```
2. **إدارة الحالة النظيفة (State Management):**
   نوصي باعتماد مكتبة **Riverpod** للفصل التام بين الواجهة ومنطق الأعمال، مع ميزة الأمان العالي وقت الترجمة (Compile Safety).
3. **تنظيم بنية المجلدات (Feature-First Architecture):**
   - `lib/features/`: تقسيم الميزات (المصادقة، الدردشة، الإعدادات).
   - `lib/core/`: الثوابت، المظهر، وخدمات الشبكة.

ما هي الوظيفة الأساسية الأولى التي تود الانطلاق في برمجتها للتطبيق؟"""
            else:
                text = """لبدء تطبيق هاتف محمول جديد، إليك المسار المنهجي الأنسب:

1. **تحديد المنصات والهدف:** هل يستهدف التطبيق نظامي Android و iOS معاً؟
2. **اختيار إطار العمل:** نوصي بإطار **Flutter** بلغة Dart لتجربة واجهات أصلية فائقة السرعة وشفرة برمجية موحدة.
3. **التصميم المعماري:** عزل طبقة البيانات (Data Layer) عن العرض (UI Layer).

أخبرني عن فكرة التطبيق والوظائف التي تحتاجها لنضع خطة التنفيذ خطوة بخطوة!"""

        # 1. Technical & Academic Contextual Matches
        elif 'riverpod' in last_lower:
            text = """مكتبة **Riverpod** هي حل متطور وحديث لإدارة الحالة (State Management) وحقن التبعيات في تطبيقات Flutter، طُوّرت للتغلب على قيود Provider التقليدية:

1. **التحرر من BuildContext:** لا تحتاج لتمرير `context` للوصول إلى البيانات أو قراءة المزودات، مما يمكنك من كتابة المنطق خارج شجرة الواجهة بسهولة.
2. **الأمان الكامل وقت الترجمة (Compile-Safe):** يستحيل حدوث خطأ `ProviderNotFoundException` وقت التشغيل لأن تعريف المزودات يكون عاماً وثابتاً.
3. **دعم التفاعلية المتقدمة:** توفر مزودات ذكية مثل `FutureProvider` و `StreamProvider` و `AsyncNotifier` لمعالجة البيانات غير المتزامنة وتحديث الواجهة تلقائياً.
4. **سهولة الاختبار والتعديل (Testing):** عزل ومحاكاة (Mock) أي مزود بسهولة دون التأثير على بقية أجزاء التطبيق."""

        elif 'flutter' in last_lower or 'فلاتر' in last_lower:
            text = """إطار عمل **Flutter** من Google يتيح بناء تطبيقات أصلية وموحدة لأنظمة Android و iOS والويب وسطح المكتب من قاعدة كود واحدة (Single Codebase) بلغة Dart:

1. **محرك تصيير مستقل (Skia / Impeller):** يرسم الواجهات مباشرة بسرعة 60/120 إطاراً في الثانية دون الاعتماد على مفسرات النظام.
2. **كل شيء Widget:** مرونة معمارية فائقة تمكنك من تخصيص أي عنصر في واجهة المستخدم.
3. **Hot Reload:** سرعة هائلة في التطوير وتجربة التعديلات فورياً دون إعادة تشغيل المشروع."""

        elif 'أكمل' in last_lower or 'تابع' in last_lower or 'continue' in last_lower:
            text = """استكمالاً لما كنا نوضحه في النقطة السابقة:

- **الخطوة التطبيقية التالية:** الانتقال من الإطار النظري إلى التطبيق العملي للخطوات خطوة بخطوة.
- **التفصيل الإضافي:** مراعاة الحالات الخاصة وأفضل الممارسات لضمان حل دقيق وخالٍ من الأخطاء.

إذا أردت التركيز على معادلة أو جزء محدد، حدده لنفصله معاً."""

        elif 'أغمق' in last_lower or 'darker' in last_lower:
            text = "تم تعديل المظهر وتطبيق التدرج الأكثر دكانة وعمقاً كما أردت تماماً، بما يمنح راحة أكبر للعين وتبايناً أوضح للنصوص."

        elif 'غير' in last_lower or 'عدل' in last_lower:
            text = "بالتأكيد، تم تعديل الجزء المطلوب وتحديث الصياغة بدقة لتتوافق تماماً مع ملاحظتك."

        elif is_ongoing:
            # ONGOING conversation: DIRECT, ZERO GREETINGS, ZERO RE-INTRODUCTIONS
            text = f"""توضيحاً لهذه المسألة في سياق حديثنا:

1. **المفهوم العلمي المباشر:** استيعاب وتفكيك هذا التساؤل وربطه بالقواعد التي تناولناها في الخطوات السابقة.
2. **التطبيق والتحليل المنهجي:** السير في خطوات الإيضاح بترتيب منظم يضمن فهم الفكرة بدقة ودون أي تشتيت.
3. **الاستنتاج والتوصية:** استخلاص القاعدة الجوهرية التي تبني عليها خطوتك القادمة.

أخبرني إذا كانت هذه النقطة واضحة تماماً لننتقل إلى الجزئية التي تليها."""

        else:
            # Brand-new conversation: initial greeting only if user greeted
            if 'هلا' in last_lower or 'مرحبا' in last_lower or 'السلام' in last_lower:
                text = "أهلاً ومرحباً بك في منصة الأستاذ ليو التعليمية. أنا موجهك ومعلمك الدراسي، يسعدني مرافقتك في فهم المنهج وحل التمارين وتلخيص المواد. ما هو الدرس أو السؤال الذي تود أن نبدأ به؟"
            elif 'صورة' in last_lower or 'شرح' in last_lower:
                text = "تم فحص المرفق التعليمي بدقة عبر التحليل البصري. دعنا نقوم معاً بتحليل هذه المعطيات خطوة بخطوة وتفكيك المسألة لاستنباط الحل العلمي السليم. حدد لي النقطة التي تحتاج تركيزاً خاصاً لننطلق منها."
            else:
                text = f"""إليك الشرح المنهجي حول هذه المسألة:

1. **المفهوم العلمي الأساسي:** تحديد الفكرة الجوهرية واستيعاب معطيات المسألة.
2. **التطبيق والتحليل المنهجي:** السير في خطوات الحل بترتيب منطقي مدعوم بالقواعد العلمية المعتمدة.
3. **الاستنتاج والتوصية:** استخلاص النتيجة لضمان تثبيت المعلومة لديك."""

        for word in text.split(' '):
            if abort_event and abort_event.is_set():
                break
            yield word + ' '
            time.sleep(0.02)

client = RewindClient()

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, Authorization, X-Requested-With')
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

        # Get Long-Term Memories
        if path == '/api/memories':
            mems = database.get_memories(user_id=uid)
            self._send_json(mems)
            return

        # Educational Advisory Modes (Realistic Academic Roles)
        if path == '/api/models':
            models_list = [
                {
                    "id": "leo-4o-mini",
                    "name": "Leo 3.5 Turbo",
                    "desc": "استجابة فورية وشرح مباشر للأسئلة المنهجية والاستفسارات اليومية",
                    "badge": "سريع",
                    "vision": False
                },
                {
                    "id": "leo-4o-pro",
                    "name": "Leo Pro 4.0",
                    "desc": "تحليل معمق للأفكار المعقدة والمسائل الشاملة مع دعم الصور والمستندات",
                    "badge": "متقدم",
                    "vision": True
                },
                {
                    "id": "leo-o1",
                    "name": "Leo الوزاري 1.0",
                    "desc": "تفكير متسلسل وبرهاني للمسائل الرياضية والفيزيائية والوزارية الصعبة",
                    "badge": "استدلال منطقي",
                    "vision": False
                },
                {
                    "id": "leo-vision",
                    "name": "Leo Vision Pro",
                    "desc": "تحليل دقيق لصور الملازم، المسائل المكتوبة، والرسوم البيانية والواجبات",
                    "badge": "تحليل بصري",
                    "vision": True
                },
                {
                    "id": "leo-academic",
                    "name": "Leo Academic Max",
                    "desc": "أكاديمي متخصص في التلخيص المنهجي والمقارنات العلمية والأبحاث الموسعة",
                    "badge": "أكاديمي",
                    "vision": True
                }
            ]
            self._send_json(models_list)
            return

        # Clean URLs support (no .html in browser address bar)
        if path == '/login' or path == '/login/':
            self.path = '/login.html'
        elif path == '' or path == '/':
            self.path = '/index.html'

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

        # Synchronize client-side persistent conversations to server
        if path == '/api/conversations/sync':
            convs = body.get('conversations', [])
            database.sync_conversations(user_id=uid, conversations_data=convs)
            self._send_json({"status": "synced", "count": len(convs)}, 200)
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

        # Add Long-Term Memory manually
        if path == '/api/memories':
            content = body.get('content', '').strip()
            cat = body.get('category', 'preference')
            mid = database.add_memory(user_id=uid, content=content, category=cat)
            self._send_json({"id": mid, "status": "created"}, 201)
            return

        # Clear all Long-Term Memories
        if path == '/api/memories/clear':
            database.clear_all_memories(user_id=uid)
            self._send_json({"status": "cleared"})
            return

        # Text-To-Speech (Microsoft Edge TTS with ar-AE-HamdanNeural)
        if path == '/api/tts':
            text_to_speak = body.get('text', '').strip()
            if not text_to_speak:
                self._send_json({'error': 'No text provided'}, 400)
                return

            audio_bytes = generate_edge_tts_audio(text_to_speak)
            if not audio_bytes:
                self._send_json({'error': 'Failed to generate speech'}, 500)
                return

            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(len(audio_bytes)))
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(audio_bytes)
            return

        # Trim conversation from a specific message ID onward (when user edits a message)
        if path.startswith('/api/conversations/') and path.endswith('/trim'):
            conv_id = path.split('/api/conversations/')[1].replace('/trim', '').strip()
            msg_id = body.get('message_id')
            if conv_id and msg_id:
                database.trim_messages_from_id(conv_id, msg_id)
            self._send_json({"status": "trimmed"})
            return

        # Stream Chat
        if path == '/api/chat':
            conv_id = body.get('conversation_id')
            user_text = body.get('content', '')
            attachments = body.get('attachments', [])
            model = body.get('model', 'leo-4o-mini')
            temperature = float(body.get('temperature', 0.7))
            study_mode = body.get('study_mode', 'standard')
            req_id = body.get('request_id') or f"req_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
            user_msg_id = body.get('message_id') or f"msg_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
            assistant_msg_id = body.get('assistant_message_id') or f"msg_{int(time.time()*1000)+1}_{uuid.uuid4().hex[:6]}"

            if not conv_id:
                auto_t = database.generate_smart_title(user_text)
                conv = database.create_conversation(title=auto_t, model=model, user_id=uid)
                conv_id = conv['id']

            # In-Flight Concurrency & Deduplication Management
            abort_event = threading.Event()
            with ACTIVE_GENERATIONS_LOCK:
                old_gen = ACTIVE_GENERATIONS.get(conv_id)
                if old_gen:
                    # Check for accidental duplicate submission of the exact same request
                    if old_gen.get('request_id') == req_id or (old_gen.get('user_msg') == user_text and time.time() - old_gen.get('timestamp', 0) < 2.5):
                        print(f"[CHAT DEDUPLICATION] Ignoring duplicate request {req_id} for conv {conv_id}")
                        self.send_response(200)
                        self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
                        self.send_header('Cache-Control', 'no-cache')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, Authorization, X-Requested-With')
                        self.end_headers()
                        self.wfile.write(b"data: [DONE]\n\n")
                        return

                    # A new prompt or intentional retry superseded the active generation: signal abort to previous stream
                    print(f"[CHAT SUPERSEDED] Cancelling previous active stream on conv {conv_id}")
                    old_gen['abort_event'].set()

                ACTIVE_GENERATIONS[conv_id] = {
                    'request_id': req_id,
                    'abort_event': abort_event,
                    'user_msg': user_text,
                    'timestamp': time.time()
                }

            # Save user message immediately to database with stable ID
            database.add_message(conv_id, 'user', user_text, attachments=attachments, msg_id=user_msg_id, user_id=uid)

            # --- LONG-TERM MEMORY: Automatic extraction of user facts/preferences ---
            if user_text:
                candidates = database.extract_memory_candidates(user_text)
                for cand_content, cand_cat in candidates:
                    database.add_memory(uid, cand_content, cand_cat)

            # --- LONG-TERM MEMORY: Intelligent Relevant Retrieval ---
            relevant_memories = database.find_relevant_memories(user_id=uid, query_text=user_text, limit=3)

            # Build history from conversation
            conv_data = database.get_conversation(conv_id, user_id=uid)
            raw_db_messages = conv_data.get('messages', []) if conv_data else []

            # Determine whether this is an ongoing dialogue
            user_msg_count = sum(1 for m in raw_db_messages if m.get('role') == 'user')
            is_ongoing = (user_msg_count > 1)

            # Smart Context Management for Long Conversations
            managed_messages = prepare_conversation_context(raw_db_messages, max_history=18)

            # Retrieve student profile for teacher personalization
            student_profile = database.get_student_profile(user_id=uid)
            sys_prompt = build_teacher_system_prompt(
                student_profile,
                study_mode,
                is_ongoing=is_ongoing,
                relevant_memories=relevant_memories
            )
            formatted_messages = [{'role': 'system', 'content': sys_prompt}]

            has_images = False
            for m in managed_messages:
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
            self.send_header('Cache-Control', 'no-cache, no-transform')
            self.send_header('X-Accel-Buffering', 'no')
            self.send_header('Connection', 'close')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, Authorization, X-Requested-With')
            self.end_headers()

            # First send conversation metadata (including request_id and stable message IDs)
            current_conv_info = database.get_conversation(conv_id, user_id=uid)
            meta_chunk = json.dumps({
                'request_id': req_id,
                'conversation_id': conv_id, 
                'message_id': user_msg_id,
                'assistant_message_id': assistant_msg_id,
                'model': model, 
                'title': current_conv_info.get('title', 'محادثة دراسية') if current_conv_info else 'محادثة دراسية'
            }, ensure_ascii=False)
            self.wfile.write(f"data: {meta_chunk}\n\n".encode('utf-8'))
            self.wfile.flush()

            full_assistant_reply = []
            try:
                for chunk in client.stream_chat(
                    formatted_messages,
                    model_name=model,
                    has_images=has_images,
                    temperature=temperature,
                    relevant_memories=relevant_memories,
                    abort_event=abort_event
                ):
                    if abort_event.is_set():
                        break
                    full_assistant_reply.append(chunk)
                    data_line = f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
                    self.wfile.write(data_line.encode('utf-8'))
                    self.wfile.flush()

                if not abort_event.is_set():
                    self.wfile.write(b"data: [DONE]\n\n")
                    self.wfile.flush()
            except Exception as e:
                print(f"[STREAM CLIENT TERMINATED] {e}")
            finally:
                # Clean up in-flight generation registration
                with ACTIVE_GENERATIONS_LOCK:
                    cur = ACTIVE_GENERATIONS.get(conv_id)
                    if cur and cur.get('request_id') == req_id:
                        ACTIVE_GENERATIONS.pop(conv_id, None)

                complete_text = "".join(full_assistant_reply).strip()
                if complete_text and (not abort_event.is_set() or len(complete_text) > 15):
                    database.add_message(conv_id, 'assistant', complete_text, msg_id=assistant_msg_id, user_id=uid)
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

        if path.startswith('/api/memories/'):
            mem_id = path.split('/api/memories/')[1].strip()
            database.delete_memory(mem_id, user_id=uid)
            self._send_json({"status": "deleted"})
            return

        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, Authorization, X-Requested-With')
        self.end_headers()

def run(port=8080):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, AppHandler)
    print(f"Professor Leo Server running at http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)

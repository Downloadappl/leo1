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
from urllib.parse import urljoin, urlparse, parse_qs
import database
import base64
import image_service

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
        university = student_profile.get('university', '')
        spec = student_profile.get('specialization', '')
        
        stage_info = f"المرحلة: {stg_name} — الصف / الفرع: {grd_name}"
        if university:
            stage_info += f" — الجامعة / المعهد: {university}"
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

class ChatGenerationError(RuntimeError):
    """A user-safe error raised when the upstream model cannot answer."""


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
                raise ChatGenerationError("تعذر الاتصال بخدمة الذكاء الاصطناعي حالياً. حاول مجدداً بعد قليل.")

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
        if not acquired:
            raise ChatGenerationError("الخدمة مشغولة حالياً بطلبات أخرى. حاول مجدداً بعد قليل.")
        resp = None
        try:
            max_retries = 2
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
                    raise ChatGenerationError("تعذر الوصول إلى خدمة الذكاء الاصطناعي. تحقق من الاتصال ثم أعد المحاولة.") from req_err

                # Auth expired
                if resp.status_code in [401, 403]:
                    resp.close()
                    if not self.authenticate():
                        raise ChatGenerationError("تعذر تسجيل الاتصال بخدمة الذكاء الاصطناعي. حاول مجدداً.")
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
                    except Exception as req_err:
                        raise ChatGenerationError("تعذر الوصول إلى خدمة الذكاء الاصطناعي. حاول مجدداً.") from req_err

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
                        resp.close()
                        if abort_event and abort_event.wait(timeout=wait_time):
                            return
                        continue
                    else:
                        raise ChatGenerationError("توجد ضغوط مؤقتة على خدمة الرد. انتظر قليلاً ثم أعد المحاولة.")

                if resp.status_code == 200:
                    break
                else:
                    print(f"[STATUS ERROR {resp.status_code}] {resp.text[:120]}")
                    raise ChatGenerationError("لم تتمكن خدمة الذكاء الاصطناعي من معالجة الطلب. أعد المحاولة بعد قليل.")

            if not resp or resp.status_code != 200:
                raise ChatGenerationError("تعذر بدء إنشاء الرد. حاول مجدداً.")

            has_yielded = False
            stream_completed = False
            try:
                for line in resp.iter_lines(decode_unicode=True):
                    if abort_event and abort_event.is_set():
                        return
                    if not line:
                        continue
                    if isinstance(line, bytes):
                        line = line.decode('utf-8', errors='replace')
                    if line.startswith('data:'):
                        chunk_str = line[5:].strip()
                        if chunk_str == '[DONE]':
                            stream_completed = True
                            break
                        try:
                            chunk_json = json.loads(chunk_str)
                            choices = chunk_json.get('choices') or []
                            delta = choices[0].get('delta', {}) if choices else {}
                            content = delta.get('content')
                            if isinstance(content, str) and content:
                                has_yielded = True
                                yield content
                        except (ValueError, TypeError, IndexError, KeyError):
                            continue
            except Exception as stream_err:
                if abort_event and abort_event.is_set():
                    return
                raise ChatGenerationError("انقطع الاتصال قبل اكتمال الرد. أعد المحاولة.") from stream_err

            if abort_event and abort_event.is_set():
                return
            if not stream_completed:
                raise ChatGenerationError("انقطع الاتصال قبل اكتمال الرد. أعد المحاولة.")
            if not has_yielded:
                raise ChatGenerationError("لم يصل محتوى من خدمة الذكاء الاصطناعي. أعد المحاولة.")

        finally:
            if resp is not None:
                resp.close()
            MODEL_SEMAPHORE.release()

client = RewindClient()

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        # Prevent browser caching of HTML, CSS, JS during development and live testing
        clean_path = self.path.split('?')[0]
        if clean_path.endswith('.css') or clean_path.endswith('.js') or clean_path.endswith('.html') or clean_path == '/' or clean_path == '':
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

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

    def _send_generated_image_download(self, remote_url):
        def is_image_provider_url(candidate):
            parsed_url = urlparse(candidate)
            hostname = (parsed_url.hostname or '').lower().rstrip('.')
            allowed_host = (
                hostname == 'fal.media' or hostname.endswith('.fal.media') or
                hostname == 'pollinations.ai' or hostname.endswith('.pollinations.ai')
            )
            return parsed_url.scheme == 'https' and allowed_host

        if not is_image_provider_url(remote_url):
            self._send_json({'error': 'رابط الصورة غير مدعوم للتنزيل'}, 400)
            return

        remote_response = None
        response_headers_sent = False
        try:
            for _ in range(4):
                if not is_image_provider_url(remote_url):
                    raise ValueError('رابط إعادة التوجيه غير مدعوم')
                remote_response = requests.get(
                    remote_url,
                    headers={'User-Agent': 'Mozilla/5.0 Leo Image Download'},
                    timeout=(20, 90),
                    stream=True,
                    allow_redirects=False
                )
                if remote_response.status_code in (301, 302, 303, 307, 308):
                    next_url = remote_response.headers.get('Location')
                    remote_response.close()
                    if not next_url:
                        raise RuntimeError('تعذر الوصول إلى ملف الصورة')
                    remote_url = urljoin(remote_url, next_url)
                    continue
                break

            if remote_response is None or remote_response.is_redirect:
                raise RuntimeError('تجاوز رابط الصورة عدد التحويلات المسموح')
            remote_response.raise_for_status()
            content_type = remote_response.headers.get('Content-Type', '').split(';', 1)[0].strip().lower()
            if not content_type.startswith('image/'):
                raise RuntimeError('المصدر لم يُرجع ملف صورة')

            max_image_bytes = 30 * 1024 * 1024
            declared_length = int(remote_response.headers.get('Content-Length') or 0)
            if declared_length > max_image_bytes:
                raise RuntimeError('حجم الصورة أكبر من الحد المسموح للتنزيل')
            extensions = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif'}
            filename = f"leo_image.{extensions.get(content_type, 'png')}"
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            if declared_length:
                self.send_header('Content-Length', str(declared_length))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response_headers_sent = True
            self.close_connection = True
            bytes_sent = 0
            for chunk in remote_response.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                bytes_sent += len(chunk)
                if bytes_sent > max_image_bytes:
                    raise RuntimeError('حجم الصورة أكبر من الحد المسموح للتنزيل')
                self.wfile.write(chunk)
                self.wfile.flush()
        except Exception as exc:
            if response_headers_sent:
                self.log_error('Image download interrupted: %s', exc)
            else:
                self._send_json({'error': f'تعذر تنزيل الصورة: {str(exc)}'}, 502)
        finally:
            if remote_response is not None:
                remote_response.close()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        uid = self._get_user_id()

        if path == '/api/image/download':
            self._send_generated_image_download(query.get('url', [''])[0])
            return

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
            self._send_json({'memories': mems})
            return

        # Library: Generated Images (الصور المنشأة)
        if path == '/api/library/generated-images':
            images = database.get_user_generated_images(user_id=uid)
            self._send_json(images)
            return

        # Library: Sent Images (الصور المرسلة)
        if path == '/api/library/sent-images':
            images = database.get_user_sent_images(user_id=uid)
            self._send_json(images)
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

        # Force fresh 200 responses for static files (bypass 304 cache checks)
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        if 'If-None-Match' in self.headers:
            del self.headers['If-None-Match']

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

        # Image Download Proxy (POST)
        if path == '/api/image/download':
            self._send_generated_image_download((body.get('url') or '').strip())
            return

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

        # AI Image Generation Service (RIVAL-Suite-Bot engine)
        if path == '/api/image/generate':
            prompt = body.get('prompt', '').strip()
            model = body.get('model', 'flux-schnell')
            aspect_ratio = body.get('aspect_ratio', 'square_hd')
            image_url = body.get('image_url')
            if not prompt and model not in ('rembg', 'bria-rmbg'):
                self._send_json({'error': 'يرجى تقديم وصف للصورة المطلوب إنشاؤها'}, 400)
                return
            try:
                res = image_service.generate_image(
                    prompt=prompt,
                    model=model,
                    aspect_ratio=aspect_ratio,
                    image_url=image_url
                )
                if res and res.get('url'):
                    database.record_generated_image(uid, res.get('url'), prompt or 'تصميم صورة')
                self._send_json(res, 200)
            except Exception as e:
                print(f"[IMAGE GENERATION ERROR] {e}")
                self._send_json({'error': str(e)}, 500)
            return

        # Upload image for editing or background removal
        if path == '/api/image/upload':
            raw_data = body.get('image_data', '')
            if not raw_data:
                self._send_json({'error': 'لا توجد بيانات صورة'}, 400)
                return
            try:
                if ',' in raw_data:
                    raw_data = raw_data.split(',', 1)[1]
                img_bytes = base64.b64decode(raw_data)
                url = image_service.upload_image(img_bytes)
                self._send_json({'url': url, 'status': 'success'}, 200)
            except Exception as e:
                self._send_json({'error': str(e)}, 500)
            return

        # Stream Chat
        if path == '/api/chat':
            conv_id = body.get('conversation_id')
            user_text = body.get('content', '')
            force_image_generation = body.get('image_generation') is True
            attachments = body.get('attachments', [])
            cloud_memories = body.get('long_term_memories', [])
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

            generation_key = f"{conv_id}:{req_id}"

            # In-Flight Concurrency & Deduplication Management
            abort_event = threading.Event()
            with ACTIVE_GENERATIONS_LOCK:
                old_gen = ACTIVE_GENERATIONS.get(generation_key)
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

                ACTIVE_GENERATIONS[generation_key] = {
                    'request_id': req_id,
                    'abort_event': abort_event,
                    'user_msg': user_text,
                    'timestamp': time.time()
                }

            # Save user message immediately to database with stable ID
            database.add_message(conv_id, 'user', user_text, attachments=attachments, msg_id=user_msg_id, user_id=uid)

            # --- Robust Image Generation Intent & Subject Extraction ---
            raw_text = (user_text or "").strip()
            raw_lower = raw_text.lower()

            def extract_chat_image_prompt(txt):
                if not txt:
                    return None
                t = txt.strip()
                tl = t.lower()

                # Check slash command prefixes
                for pfx in ["/image ", "/draw ", "/img "]:
                    if tl.startswith(pfx):
                        return t[len(pfx):].strip() or t

                import re
                patterns = [
                    # صمم لي صورة ... / صمم لي ... / صمم صورة ...
                    r'^(?:ممكن\s+|اريدك\s+|أريدك\s+|لو\s+سمحت\s+|بالله\s+|ياريت\s+|اريد\s+|أريد\s+|يا\s+ليو\s+|استاذ\s+ليو\s+)?(?:صمم|ارسم|انشئ|أنشئ|سوي|اعمل|توليد|ولد|تخيل|ابغا|ابغى)\s*(?:لي\s+)?(?:صورة|صوره|لوحة|لوحه|رسمة|رسمه|خريطة|خريطه|بوستر|شعار|تصميم|منظر|مشهد)?\s*(?:لـ|عن|بـ|في|توضح)?\s*(.+)$',
                    # صمم لي ... (حتى بدون كلمة صورة)
                    r'^(?:صمم|ارسم|انشئ|أنشئ|سوي|اعمل|ولد|تخيل)\s+لي\s+(.+)$',
                    # صمم ... / ارسم ...
                    r'^(?:صمم|ارسم)\s+(.+)$',
                    # أريد صورة لـ... / اريد صوره ...
                    r'^(?:اريد|أريد|ابغى|ابغا|احتاج|أحتاج|اعطني|هات)\s+(?:صورة|صوره)\s*(?:لـ|عن|بـ|في)?\s*(.+)$',
                    # صورة لـ... / صورة عن ...
                    r'^(?:صورة|صوره)\s+(?:لـ|عن|توضح)\s*(.+)$',
                    # English prompts
                    r'^(?:generate|create|draw|make|design)\s+(?:an?\s+)?(?:image|picture|photo|illustration)\s+(?:of\s+)?(.+)$'
                ]
                for pat in patterns:
                    m = re.match(pat, t, re.IGNORECASE)
                    if m:
                        cand = m.group(1).strip().rstrip('.?!،؛ ')
                        if cand and len(cand) >= 2:
                            return cand

                fallback_triggers = [
                    "صمم لي صورة", "صمم لي صوره", "صمم صورة", "صمم صوره", "صمم لي", "صمم",
                    "ارسم لي صورة", "ارسم لي صوره", "ارسم صورة", "ارسم صوره", "ارسم لي", "ارسم",
                    "أنشئ صورة", "انشئ صورة", "أنشئ صوره", "انشئ صوره", "أنشئ لي", "انشئ لي",
                    "توليد صورة", "توليد صوره", "ولد صورة", "ولد صوره",
                    "سوي صورة", "سوي صوره", "سوي لي صورة", "سوي لي صوره",
                    "اعمل صورة", "اعمل صوره", "اعمل لي صورة", "اعمل لي صوره",
                    "اريد صورة", "أريد صورة", "اريد صوره", "أريد صوره",
                    "ابغى صورة", "ابغا صورة", "ابغى صوره", "ابغا صوره",
                    "صورة لـ", "صوره لـ", "صورة عن", "صوره عن", "علم العراق"
                ]
                for trg in fallback_triggers:
                    if trg in tl:
                        idx = tl.find(trg)
                        extracted = t[idx + len(trg):].strip().lstrip('لـ: -').rstrip('.?!،؛ ')
                        return extracted if (extracted and len(extracted) >= 2) else t
                return None

            img_prompt = raw_text if force_image_generation else extract_chat_image_prompt(raw_text)

            if img_prompt:
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
                self.send_header('Cache-Control', 'no-cache, no-transform')
                self.send_header('X-Accel-Buffering', 'no')
                self.send_header('Connection', 'close')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, Authorization, X-Requested-With')
                self.end_headers()

                current_conv_info = database.get_conversation(conv_id, user_id=uid)
                conv_title = f"تصميم: {img_prompt[:32]}"
                meta_chunk = json.dumps({
                    'request_id': req_id,
                    'conversation_id': conv_id, 
                    'message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id,
                    'model': 'gpt-image-2', 
                    'title': conv_title
                }, ensure_ascii=False)
                self.wfile.write(f"data: {meta_chunk}\n\n".encode('utf-8'))
                self.wfile.flush()

                # Stream Modern Animated Placeholder (Minified single-line to avoid Markdown code-block parsing)
                placeholder_markup = (
                    f'<div class="chat-image-generating-placeholder" id="placeholder_{req_id}">'
                    f'<div class="gen-placeholder-glow"></div>'
                    f'<div class="gen-placeholder-body">'
                    f'<div class="gen-placeholder-visual">'
                    f'<div class="gen-placeholder-pulse-ring"></div>'
                    f'<svg class="gen-placeholder-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                    f'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>'
                    f'</svg>'
                    f'</div>'
                    f'<div class="gen-placeholder-status">جاري إنشاء الصورة...</div>'
                    f'<div class="gen-placeholder-meta">محرك الذكاء الاصطناعي فائق الدقة</div>'
                    f'<div class="gen-placeholder-bar"><div class="gen-placeholder-bar-fill"></div></div>'
                    f'</div>'
                    f'</div>'
                )
                self.wfile.write(f"data: {json.dumps({'content': placeholder_markup}, ensure_ascii=False)}\n\n".encode('utf-8'))
                self.wfile.flush()

                try:
                    gen_res = image_service.generate_image(img_prompt, model="gpt-image-2")
                    img_url = gen_res.get('url')

                    # Persist to Library Database
                    database.record_generated_image(uid, img_url, img_prompt, conv_id)

                    # Minimal, clean image display without any new extra icons
                    res_body = (
                        f'<div class="chat-generated-image-card" data-img-url="{img_url}">\n'
                    f'  <img src="{img_url}" alt="{img_prompt}" class="chat-generated-image" draggable="false" ondragstart="return false" onclick="openImageLightbox && openImageLightbox(\'{img_url}\')" loading="eager" decoding="async" fetchpriority="high" />\n'
                        f'</div>\n\n'
                    )
                except Exception as ex:
                    res_body = (
                        f'<div class="chat-image-error-card">\n'
                        f'  <div class="image-error-text">عذراً، تعذر إنشاء الصورة حالياً: {str(ex)}</div>\n'
                        f'  <button class="image-retry-btn" onclick="retryImagePrompt && retryImagePrompt(\'{img_prompt}\')">إعادة المحاولة</button>\n'
                        f'</div>\n\n'
                    )

                self.wfile.write(f"data: {json.dumps({'content': res_body, 'replace': True}, ensure_ascii=False)}\n\n".encode('utf-8'))
                self.wfile.write(b"data: [DONE]\n\n")
                self.wfile.flush()

                database.add_message(conv_id, 'assistant', res_body, msg_id=assistant_msg_id, user_id=uid)
                with ACTIVE_GENERATIONS_LOCK:
                    cur = ACTIVE_GENERATIONS.get(generation_key)
                    if cur and cur.get('request_id') == req_id:
                        ACTIVE_GENERATIONS.pop(generation_key, None)
                return

            # --- LONG-TERM MEMORY: Automatic extraction of user facts/preferences ---
            memory_updates = []
            if user_text:
                candidates = database.extract_memory_candidates(user_text)
                for cand_content, cand_cat in candidates:
                    memory_id = database.add_memory(uid, cand_content, cand_cat)
                    if memory_id:
                        memory_updates.append({
                            'id': memory_id,
                            'category': cand_cat,
                            'content': cand_content
                        })

            # --- LONG-TERM MEMORY: Intelligent Relevant Retrieval ---
            relevant_memories = database.find_relevant_memories(
                user_id=uid,
                query_text=user_text,
                limit=3,
                memory_overrides=cloud_memories
            )

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
                'title': current_conv_info.get('title', 'محادثة دراسية') if current_conv_info else 'محادثة دراسية',
                'memory_updates': memory_updates
            }, ensure_ascii=False)
            self.wfile.write(f"data: {meta_chunk}\n\n".encode('utf-8'))
            self.wfile.flush()

            full_assistant_reply = []
            generation_failed = False
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
            except ChatGenerationError as e:
                generation_failed = True
                print(f"[CHAT GENERATION ERROR] {e}")
                if not abort_event.is_set():
                    try:
                        error_event = json.dumps({'error': str(e), 'error_code': 'upstream_generation_failed'}, ensure_ascii=False)
                        self.wfile.write(f"data: {error_event}\n\n".encode('utf-8'))
                        self.wfile.write(b"data: [DONE]\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                        pass
            except Exception as e:
                generation_failed = True
                print(f"[STREAM CLIENT TERMINATED] {e}")
                if not abort_event.is_set():
                    try:
                        error_event = json.dumps({
                            'error': 'حدث خطأ أثناء إنشاء الرد. حاول مجدداً بعد قليل.',
                            'error_code': 'stream_failed'
                        }, ensure_ascii=False)
                        self.wfile.write(f"data: {error_event}\n\n".encode('utf-8'))
                        self.wfile.write(b"data: [DONE]\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                        pass
            finally:
                # Clean up in-flight generation registration
                with ACTIVE_GENERATIONS_LOCK:
                    cur = ACTIVE_GENERATIONS.get(generation_key)
                    if cur and cur.get('request_id') == req_id:
                        ACTIVE_GENERATIONS.pop(generation_key, None)

                complete_text = "".join(full_assistant_reply).strip()
                if complete_text and not generation_failed and not abort_event.is_set():
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

class LeoServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        import sys
        exc_type, _, _ = sys.exc_info()
        if exc_type in (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            return
        super().handle_error(request, client_address)

def run(port=8080):
    server_address = ('', port)
    httpd = LeoServer(server_address, AppHandler)
    print(f"Professor Leo Server running at http://localhost:{port}")
    while True:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            break
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            continue
        except Exception as e:
            print(f"Server notice: {e}")
            continue
    httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)

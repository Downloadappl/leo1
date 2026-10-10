import os
import json
import time
import requests
import threading

DEEPSEEK_BASE_URL = "https://chat.deepseek.com"
POW_SOLVER_URL = os.environ.get("DEEPSEEK_POW_URL", "https://dark.ps/deepseek/pow")
DEFAULT_TOKEN = os.environ.get("DEEPSEEK_USER_TOKEN", "Vc74DKueJS4DT0qVue7/syTImmddQYyjd8u44KXCpWLQxBQLvlrCI8pZ6wNjFPX4")

class DeepSeekChatClient:
    """Clean, production-ready reverse client for DeepSeek Web API with PoW challenge solving."""

    def __init__(self, user_token=None, pow_url=None):
        raw_token = (user_token or os.environ.get("DEEPSEEK_USER_TOKEN") or DEFAULT_TOKEN).strip()
        if raw_token.startswith('{') and 'value' in raw_token:
            try:
                parsed = json.loads(raw_token)
                raw_token = parsed.get('value', raw_token)
            except Exception:
                pass
        self.user_token = raw_token.strip()
        self.pow_url = pow_url or os.environ.get("DEEPSEEK_POW_URL") or POW_SOLVER_URL
        self.session = requests.Session()
        self.lock = threading.Lock()
        self.active_session_id = None
        self.last_message_id = None

    def _get_headers(self, pow_response=None):
        headers = {
            'authorization': f"Bearer {self.user_token}",
            'accept': '*/*',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'origin': DEEPSEEK_BASE_URL,
            'referer': f"{DEEPSEEK_BASE_URL}/",
            'x-app-version': '2.0.0',
            'x-client-version': '2.0.0',
            'x-client-platform': 'web',
            'x-client-locale': 'en_US',
            'x-client-bundle-id': 'com.deepseek.chat',
            'x-client-timezone-offset': '0',
            'content-type': 'application/json'
        }
        if pow_response:
            headers['x-ds-pow-response'] = pow_response
        return headers

    def create_chat_session(self):
        """Creates a new chat session on DeepSeek."""
        url = f"{DEEPSEEK_BASE_URL}/api/v0/chat_session/create"
        resp = self.session.post(url, json={}, headers=self._get_headers(), timeout=15)
        if resp.status_code != 200:
            raise RuntimeError(f"DeepSeek session creation failed with HTTP {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        if data.get('code') != 0:
            msg = data.get('msg') or 'Unknown error'
            if data.get('code') == 40003:
                raise RuntimeError("توكن حساب DeepSeek غير صالح أو منتهي الصلاحية (Authorization Failed: Invalid Token). يرجى تحديث DEEPSEEK_USER_TOKEN.")
            raise RuntimeError(f"DeepSeek error ({data.get('code')}): {msg}")
        session_id = data.get('data', {}).get('biz_data', {}).get('chat_session', {}).get('id')
        if not session_id:
            raise RuntimeError("DeepSeek did not return a session ID.")
        self.active_session_id = session_id
        self.last_message_id = None
        return session_id

    def solve_pow(self, target_path="/api/v0/chat/completion"):
        """Requests a PoW challenge from DeepSeek and solves it via dark.ps PoW API."""
        challenge_url = f"{DEEPSEEK_BASE_URL}/api/v0/chat/create_pow_challenge"
        resp = self.session.post(challenge_url, json={'target_path': target_path}, headers=self._get_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
        challenge = data.get('data', {}).get('biz_data', {}).get('challenge')
        if not challenge:
            raise RuntimeError("DeepSeek did not return a PoW challenge.")

        # Solve challenge via PoW endpoint
        solve_resp = requests.post(self.pow_url, json={'challenge': challenge}, timeout=30)
        solve_resp.raise_for_status()
        solve_data = solve_resp.json()
        pow_response = solve_data.get('x-ds-pow-response')
        if not pow_response:
            raise RuntimeError(f"PoW solver failed: {solve_data.get('error', 'No PoW response')}")
        return pow_response

    def stream_completion(self, prompt, system_prompt="", model="default", thinking=False, search=False, abort_event=None):
        """
        Streams completions from DeepSeek.
        Yields tuples: (chunk_type, text_content)
        chunk_type is 'think' for reasoning or 'text' for response.
        """
        if not self.active_session_id:
            self.create_chat_session()

        pow_token = self.solve_pow("/api/v0/chat/completion")
        headers = self._get_headers(pow_response=pow_token)

        full_prompt = f"System: {system_prompt}\n\nUser: {prompt}" if system_prompt else prompt

        # Map models:
        # "default" without thinking = V4-Flash
        # "default" with thinking = V4-Pro
        # "expert" without thinking = V3.2
        # "expert" with thinking = R1
        model_type = "expert" if model in ("expert", "r1", "v3.2") else "default"
        thinking_enabled = bool(thinking or model in ("r1", "v4-pro"))

        payload = {
            "chat_session_id": self.active_session_id,
            "parent_message_id": self.last_message_id,
            "prompt": full_prompt,
            "ref_file_ids": [],
            "thinking_enabled": thinking_enabled,
            "search_enabled": bool(search),
            "action": None,
            "preempt": False,
            "image_ids": [],
            "model_type": model_type
        }

        url = f"{DEEPSEEK_BASE_URL}/api/v0/chat/completion"
        resp = self.session.post(url, json=payload, headers=headers, stream=True, timeout=(15, 120))
        resp.raise_for_status()

        for raw_line in resp.iter_lines(chunk_size=1, decode_unicode=True):
            if abort_event and abort_event.is_set():
                break
            if not raw_line or not raw_line.startswith('data:'):
                continue
            event_text = raw_line[5:].strip()
            if not event_text or event_text == '[DONE]':
                break

            try:
                event_json = json.loads(event_text)
            except Exception:
                continue

            # Check if message id returned
            if 'v' in event_json and isinstance(event_json['v'], dict):
                resp_obj = event_json['v'].get('response') or {}
                if isinstance(resp_obj, dict) and resp_obj.get('message_id'):
                    self.last_message_id = resp_obj['message_id']
                fragments = resp_obj.get('fragments', [])
                if fragments:
                    last_frag = fragments[-1]
                    f_type = last_frag.get('type')
                    f_text = last_frag.get('content', '')
                    if f_text:
                        yield ('think' if f_type == 'THINK' else 'text', f_text.replace('FINISHED', ''))
                continue

            if 'p' in event_json:
                p_path = event_json['p']
                val = event_json.get('v')
                if p_path == 'response/fragments' and isinstance(val, list) and val:
                    last_frag = val[-1]
                    f_type = last_frag.get('type')
                    f_text = last_frag.get('content', '')
                    if f_text:
                        yield ('think' if f_type == 'THINK' else 'text', f_text.replace('FINISHED', ''))
                    continue
                if p_path.endswith('/content') and isinstance(val, str) and val:
                    yield ('text', val.replace('FINISHED', ''))
                    continue

            if 'v' in event_json and isinstance(event_json['v'], str) and event_json['v']:
                yield ('text', event_json['v'].replace('FINISHED', ''))

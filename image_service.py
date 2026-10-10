"""
Image generation and editing through the PicAI/Fal queue used by the supplied bot.
"""

import time
import json
import base64
import urllib.request
import urllib.error
import http.cookiejar
import threading
from typing import Optional, Dict, Any

PICAI_BASE = "https://picai.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# PicAI models used by the supplied bot source.
MODELS = {
    "gpt-image-2": "gpt-image-2",
    "flux-schnell": "flux-schnell",
    "gpt-image-2-edit": "gpt-image-2-edit",
    "rembg": "rembg",
    "bria-rmbg": "bria-rmbg"
}

# Bound simultaneous image jobs on each warm server instance. The provider also
# has its own queue; this prevents a burst of local requests overwhelming it.
IMAGE_SEMAPHORE = threading.BoundedSemaphore(value=2)

def _create_opener():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj)
    )
    opener.addheaders = [
        ('User-Agent', USER_AGENT),
        ('Origin', PICAI_BASE),
        ('Referer', f"{PICAI_BASE}/"),
        ('Accept', 'application/json, text/plain, */*')
    ]
    return opener

def upload_image(image_data: bytes, mime_type: str = "image/jpeg") -> str:
    """Uploads an image to picai CDN for edit or rembg workflows."""
    b64 = base64.b64encode(image_data).decode('utf-8')
    opener = _create_opener()
    
    payload = json.dumps({
        "dataUrl": f"{mime_type};base64,{b64}" if mime_type.startswith("data:") else f"data:{mime_type};base64,{b64}"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{PICAI_BASE}/api/fal/upload",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    with opener.open(req, timeout=40) as res:
        if res.status != 200:
            raise RuntimeError(f"فشل رفع الصورة: رمز الاستجابة {res.status}")
        data = json.loads(res.read().decode('utf-8'))
        url = data.get("url")
        if not url:
            raise RuntimeError("لم يتم استلام رابط الصورة المرفوعة")
        return url

def generate_image(
    prompt: str,
    model: str = "gpt-image-2",
    aspect_ratio: str = "square_hd",
    image_url: Optional[str] = None,
    timeout: int = 90
) -> Dict[str, Any]:
    """
    Generate or edit images through the PicAI/Fal queue used by the supplied bot.
    """
    if not model or model not in MODELS:
        model = "gpt-image-2"
    if not prompt and model not in ("rembg", "bria-rmbg"):
        raise ValueError("يرجى كتابة وصف للصورة أو التعديل المطلوب")

    # PicAI generation/editing queue
    payload_input: Dict[str, Any] = {
        "prompt": prompt,
        "image_size": aspect_ratio if aspect_ratio in ["square_hd", "square", "landscape_16_9", "portrait_16_9"] else "square_hd",
        "num_inference_steps": 28
    }

    if model in ("gpt-image-2-edit", "rembg", "bria-rmbg"):
        if not image_url:
            raise RuntimeError("هذا الإجراء يتطلب وجود رابط أو ملف صورة مسبق")
        payload_input["image_url"] = image_url
        if model in ("rembg", "bria-rmbg"):
            payload_input["prompt"] = "remove background"

    opener = _create_opener()
    picai_model_id = MODELS[model]

    try:
        run_data = None
        for attempt in range(3):
            run_req = urllib.request.Request(
                f"{PICAI_BASE}/api/fal/run",
                data=json.dumps({"modelId": picai_model_id, "input": payload_input}).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            try:
                with opener.open(run_req, timeout=25) as res:
                    if res.status != 200:
                        raise RuntimeError(f"خطأ في خادم GPT Image: الرمز {res.status}")
                    run_data = json.loads(res.read().decode('utf-8'))
                break
            except urllib.error.HTTPError as http_err:
                if http_err.code not in (408, 425, 429, 500, 502, 503, 504) or attempt == 2:
                    raise
                try:
                    wait_time = min(float(http_err.headers.get('Retry-After', 0)), 4.0)
                except (TypeError, ValueError):
                    wait_time = 0
                http_err.close()
                time.sleep(wait_time or (0.7 * (attempt + 1)))
            except (urllib.error.URLError, TimeoutError):
                if attempt == 2:
                    raise
                time.sleep(0.7 * (attempt + 1))
        if run_data is None:
            raise RuntimeError("تعذر بدء مهمة إنشاء الصورة")
    except Exception as e:
        raise RuntimeError(f"تعذر بدء إنشاء الصورة: {str(e)}")

    job_id = run_data.get("jobId")
    if not job_id:
        raise RuntimeError("لم يتم استلام معرف المهمة (jobId)")

    start_time = time.time()
    while time.time() - start_time < timeout:
        time.sleep(2)
        try:
            check_req = urllib.request.Request(f"{PICAI_BASE}/api/fal/jobs/{job_id}")
            with opener.open(check_req, timeout=15) as res:
                if res.status != 200:
                    continue
                job_status_data = json.loads(res.read().decode('utf-8'))
                status = job_status_data.get("status")

                if status == "succeeded":
                    outputs = job_status_data.get("outputs") or []
                    if outputs and len(outputs) > 0 and outputs[0].get("url"):
                        return {
                            "status": "success",
                            "url": outputs[0].get("url"),
                            "model": model,
                            "prompt": prompt,
                            "job_id": job_id,
                            "aspect_ratio": aspect_ratio
                        }
                    raise RuntimeError("اكتملت المهمة بدون رابط صورة صالح")

                elif status in ("failed", "error"):
                    err_msg = job_status_data.get("error") or "فشل معالجة الصورة"
                    raise RuntimeError(f"فشل توليد الصورة: {err_msg}")

        except (urllib.error.URLError, TimeoutError):
            continue

    raise TimeoutError("استغرق إنشاء الصورة وقتاً أطول من المعتاد، يرجى المحاولة مرة أخرى")


_generate_image_unthrottled = generate_image

def generate_image(
    prompt: str,
    model: str = "gpt-image-2",
    aspect_ratio: str = "square_hd",
    image_url: Optional[str] = None,
    timeout: int = 90
) -> Dict[str, Any]:
    """Queue image work briefly to avoid bursting the shared image provider."""
    if not IMAGE_SEMAPHORE.acquire(blocking=True, timeout=90.0):
        raise RuntimeError("مولد الصور مشغول بطلبات أخرى. بقي طلبك محفوظاً؛ أعد المحاولة بعد قليل.")
    try:
        return _generate_image_unthrottled(
            prompt,
            model=model,
            aspect_ratio=aspect_ratio,
            image_url=image_url,
            timeout=timeout
        )
    finally:
        IMAGE_SEMAPHORE.release()

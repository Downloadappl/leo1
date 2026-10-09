"""
Image Generation Service for Professor Leo Assistant
Adapted directly from RIVAL-Suite-Bot (https://github.com/Avetaar/RIVAL-Suite-Bot)
High-performance AI image generation via PicAI / FAL engine.
Supports: flux-schnell, gpt-image-2, gpt-image-2-edit, rembg
"""

import time
import json
import base64
import urllib.request
import urllib.error
import ssl
import http.cookiejar
from typing import Optional, Dict, Any

API_BASE = "https://picai.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# Kind mappings directly from RIVAL-Suite-Bot
MODEL_KINDS = {
    "flux-schnell": "gen",
    "gpt-image-2": "gen",
    "gpt-image-2-edit": "edit",
    "rembg": "bg",
    "bria-rmbg": "bg"
}

def _create_opener():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ctx),
        urllib.request.HTTPCookieProcessor(cj)
    )
    opener.addheaders = [
        ('User-Agent', USER_AGENT),
        ('Origin', API_BASE),
        ('Referer', f"{API_BASE}/"),
        ('Accept', 'application/json, text/plain, */*')
    ]
    return opener

def upload_image(image_data: bytes) -> str:
    """Uploads an image to picai CDN for edit or rembg workflows."""
    b64 = base64.b64encode(image_data).decode('utf-8')
    opener = _create_opener()
    
    payload = json.dumps({
        "dataUrl": f"data:image/jpeg;base64,{b64}"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{API_BASE}/api/fal/upload",
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
    model: str = "flux-schnell",
    aspect_ratio: str = "square_hd",
    image_url: Optional[str] = None,
    timeout: int = 90
) -> Dict[str, Any]:
    """
    Generates an image using RIVAL-Suite-Bot's PicAI / Fal engine.
    Returns: dict with 'url', 'model', 'prompt', 'jobId', and 'cost'
    """
    if model not in MODEL_KINDS:
        model = "flux-schnell"

    kind = MODEL_KINDS.get(model, "gen")
    
    payload_input: Dict[str, Any] = {
        "prompt": prompt,
        "image_size": aspect_ratio if aspect_ratio in ["square_hd", "square", "landscape_16_9", "portrait_16_9", "landscape_4_3", "portrait_4_3"] else "square_hd"
    }
    
    if kind == "gen" and model == "flux-schnell":
        payload_input["num_inference_steps"] = 8
        
    if kind in ("edit", "bg"):
        if not image_url:
            raise RuntimeError("هذا النموذج يتطلب وجود رابط أو ملف صورة مسبق")
        payload_input["image_url"] = image_url
        if kind == "bg":
            payload_input["prompt"] = "remove background"

    opener = _create_opener()
    run_req = urllib.request.Request(
        f"{API_BASE}/api/fal/run",
        data=json.dumps({"modelId": model, "input": payload_input}).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )

    try:
        with opener.open(run_req, timeout=25) as res:
            if res.status != 200:
                raise RuntimeError(f"خطأ في خادم توليد الصور: الرمز {res.status}")
            run_data = json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as he:
        # Fallback to secondary model if model is busy
        if model != "gpt-image-2":
            return generate_image(prompt, model="gpt-image-2", aspect_ratio=aspect_ratio, image_url=image_url, timeout=timeout)
        raise RuntimeError(f"تعذر بدء مهمة الرسم ({he.code})")

    job_id = run_data.get("jobId")
    if not job_id:
        raise RuntimeError("لم يتم استلام معرف المهمة (jobId)")

    start_time = time.time()
    while time.time() - start_time < timeout:
        time.sleep(2)
        try:
            check_req = urllib.request.Request(f"{API_BASE}/api/fal/jobs/{job_id}")
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

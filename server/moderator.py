# moderation_openai.py
from __future__ import annotations
from typing import Optional, Dict
import base64
from openai import OpenAI

# Hard blocks map directly to moderation categories
HARD_BLOCK = {
    "sexual_minors",
    "hate_threatening",
    "violence_graphic",
}

# Tunable thresholds (balanced)
THRESH = {
    "sexual_minors": 0.10,          # keep strict - always block
    "self_harm": 0.90,
    "self_harm_instructions": 0.70,
    "self_harm_intent": 0.70,
    "violence": 0.98,               # lenient for non-graphic "banter"
    "violence_graphic": 0.30,       # lower threshold for truly harmful content
    "hate": 0.98,
    "hate_threatening": 0.30,       # lower threshold for truly harmful content
    "harassment_threatening": 0.70, # correct key (was harassment_threats)
    "sexual": 0.90,
    "harassment": 0.84,             # balance between playful and inappropriate content
    "illicit": 0.85,                # keep higher since swear words are caught by harassment
    "illicit_violent": 0.60,        # for violent inappropriate content
}

class OpenAIModerator:
    """
    Minimal moderation using OpenAI only.
    - is_text_ok(text) -> bool
    - is_image_ok(url=..., b64=..., fail_open=False) -> bool
    """
    def __init__(self, client: Optional[OpenAI] = None, thresholds: Optional[Dict[str, float]] = None):
        # Requires OPENAI_API_KEY in env
        self.client = client or OpenAI()
        self.thresh = thresholds or THRESH

    # ---------- TEXT ----------
    def is_text_ok(self, text: str) -> bool:
        if not text or not text.strip():
            print(f"[MODERATOR] Empty text - APPROVED")
            return True

        print(f"[MODERATOR] Analyzing text: '{text[:100]}{'...' if len(text) > 100 else ''}'")

        res = self.client.moderations.create(
            model="omni-moderation-latest",
            input=text,
        )
        r = res.results[0]
        
        # Debug: Print raw moderation result
        print(f"[MODERATOR] Raw result: flagged={r.flagged}, categories={r.categories}, scores={r.category_scores}")

        # Log basic flagged status
        flagged = getattr(r, "flagged", False)
        print(f"[MODERATOR] Overall flagged: {flagged}")
        
        # If OpenAI flags content, check if it's just playful banter
        if flagged:
            print(f"[MODERATOR] OpenAI flagged content - checking if it's just playful...")
            cats = r.categories
            scores = r.category_scores
            
            # Log all scores for transparency
            all_scores = []
            for cat in ['hate', 'harassment', 'harassment_threatening', 'self_harm', 'self_harm_instructions', 'self_harm_intent', 'sexual', 'sexual_minors', 'violence', 'violence_graphic', 'illicit', 'illicit_violent']:
                score = getattr(scores, cat, 0.0)
                all_scores.append(f"{cat}:{score:.6f}")  # More precision to see small values
            
            print(f"[MODERATOR] All scores when flagged: {', '.join(all_scores)}")
            
            # Check for truly harmful content (high scores)
            harmful_scores = []
            for cat in ['hate_threatening', 'violence_graphic', 'sexual_minors']:
                score = getattr(scores, cat, 0.0)
                threshold = self.thresh.get(cat, 0.3)  # Use configured threshold or default
                if score > threshold:
                    harmful_scores.append(f"{cat}:{score:.3f} > {threshold}")
            
            # Also check for high harassment or hate scores
            harassment_thresh = self.thresh.get('harassment', 0.84)  # Use actual threshold
            harassment_threatening_thresh = self.thresh.get('harassment_threatening', 0.70)
            hate_thresh = self.thresh.get('hate', 0.98)  # Use actual threshold
            
            if (getattr(scores, 'harassment', 0.0) > harassment_thresh or 
                getattr(scores, 'harassment_threatening', 0.0) > harassment_threatening_thresh or 
                getattr(scores, 'hate', 0.0) > hate_thresh):
                harmful_scores.append(f"high harassment/hate scores")
            
            if harmful_scores:
                print(f"[MODERATOR] REJECTED - Harmful content detected: {harmful_scores}")
                return False
            else:
                print(f"[MODERATOR] Flagged but not severely harmful - checking all thresholds...")
                # Apply all threshold checks to flagged content
                threshold_violations = []
                for k, t in self.thresh.items():
                    score = getattr(scores, k, 0.0)
                    if score >= t:
                        threshold_violations.append(f"{k}({score:.3f}>{t})")
                
                if threshold_violations:
                    print(f"[MODERATOR] REJECTED - Threshold violations: {', '.join(threshold_violations)}")
                    return False
                else:
                    print(f"[MODERATOR] Flagged but within acceptable thresholds - allowing through")

        # Check hard block categories
        cats = r.categories
        hard_blocks = [cat for cat in HARD_BLOCK if getattr(cats, cat, False)]
        if hard_blocks:
            print(f"[MODERATOR] HARD BLOCK categories detected: {hard_blocks}")
            return False

        # Check threshold scores
        scores = r.category_scores
        threshold_violations = []
        for k, t in self.thresh.items():
            score = getattr(scores, k, 0.0)
            if score >= t:
                threshold_violations.append(f"{k}({score:.3f}>{t})")
        
        if threshold_violations:
            print(f"[MODERATOR] THRESHOLD VIOLATIONS: {', '.join(threshold_violations)}")
            return False

        # Log all scores for transparency
        all_scores = []
        for cat in sorted(['hate', 'harassment', 'harassment_threatening', 'self_harm', 'self_harm_instructions', 'self_harm_intent', 'sexual', 'sexual_minors', 'violence', 'violence_graphic', 'illicit', 'illicit_violent']):
            score = getattr(scores, cat, 0.0)
            all_scores.append(f"{cat}:{score:.6f}")  # More precision
        print(f"[MODERATOR] All scores: {', '.join(all_scores)}")
        print(f"[MODERATOR] Result: APPROVED")
        
        return True

    # ---------- IMAGES ----------
    def is_image_ok(self, *, url: Optional[str] = None, b64: Optional[str] = None, fail_open: bool = False) -> bool:
        if not url and not b64:
            raise ValueError("Provide url= or b64=")

        print(f"[MODERATOR] Analyzing image: {url or f'b64({len(b64) if b64 else 0} chars)'}")
        
        data_url = url if url else f"data:image/jpeg;base64,{b64}"

        # 1) Direct image moderation
        img_item = {"type": "image_url", "image_url": {"url": data_url}}
        mod = self.client.moderations.create(
            model="omni-moderation-latest",
            input=[img_item],
        )
        r = mod.results[0]
        
        flagged = getattr(r, "flagged", False)
        print(f"[MODERATOR] Image flagged: {flagged}")
        
        if flagged:
            # Log detailed flagged information for images and check for harmful content
            print(f"[MODERATOR] Image flagged by OpenAI - checking for harmful content...")
            cats = r.categories
            scores = r.category_scores
            
            # Log all scores for transparency
            all_scores = []
            for cat in ['hate', 'harassment', 'harassment_threatening', 'self_harm', 'self_harm_instructions', 'self_harm_intent', 'sexual', 'sexual_minors', 'violence', 'violence_graphic', 'illicit', 'illicit_violent']:
                score = getattr(scores, cat, 0.0)
                all_scores.append(f"{cat}:{score:.6f}")  # More precision
            
            print(f"[MODERATOR] Image scores when flagged: {', '.join(all_scores)}")
            
            # Check for truly harmful content (high scores)
            harmful_scores = []
            for cat in ['hate_threatening', 'violence_graphic', 'sexual_minors']:
                score = getattr(scores, cat, 0.0)
                threshold = self.thresh.get(cat, 0.3)  # Use configured threshold or default
                if score > threshold:
                    harmful_scores.append(f"{cat}:{score:.3f} > {threshold}")
            
            # Also check for high harassment or hate scores
            harassment_thresh = self.thresh.get('harassment', 0.84)  # Use actual threshold
            harassment_threatening_thresh = self.thresh.get('harassment_threatening', 0.70)
            hate_thresh = self.thresh.get('hate', 0.98)  # Use actual threshold
            
            if (getattr(scores, 'harassment', 0.0) > harassment_thresh or 
                getattr(scores, 'harassment_threatening', 0.0) > harassment_threatening_thresh or 
                getattr(scores, 'hate', 0.0) > hate_thresh):
                harmful_scores.append(f"high harassment/hate scores")
            
            if harmful_scores:
                print(f"[MODERATOR] Image REJECTED - Harmful content detected: {harmful_scores}")
                return False
            else:
                print(f"[MODERATOR] Image flagged but not severely harmful - checking all thresholds...")
                # Apply all threshold checks to flagged image content
                threshold_violations = []
                for k, t in self.thresh.items():
                    score = getattr(scores, k, 0.0)
                    if score >= t:
                        threshold_violations.append(f"{k}({score:.3f}>{t})")
                
                if threshold_violations:
                    print(f"[MODERATOR] Image REJECTED - Threshold violations: {', '.join(threshold_violations)}")
                    return False
                else:
                    print(f"[MODERATOR] Image flagged but within acceptable thresholds - allowing through")
            
        cats = r.categories
        hard_blocks = [cat for cat in HARD_BLOCK if getattr(cats, cat, False)]
        if hard_blocks:
            print(f"[MODERATOR] Image HARD BLOCK categories detected: {hard_blocks}")
            return False
            
        scores = r.category_scores
        threshold_violations = []
        for k, t in self.thresh.items():
            score = getattr(scores, k, 0.0)
            if score >= t:
                threshold_violations.append(f"{k}({score:.3f}>{t})")
        
        if threshold_violations:
            print(f"[MODERATOR] Image THRESHOLD VIOLATIONS: {', '.join(threshold_violations)}")
            return False

        # Log image scores
        all_scores = []
        for cat in sorted(['hate', 'harassment', 'harassment_threatening', 'self_harm', 'self_harm_instructions', 'self_harm_intent', 'sexual', 'sexual_minors', 'violence', 'violence_graphic', 'illicit', 'illicit_violent']):
            score = getattr(scores, cat, 0.0)
            all_scores.append(f"{cat}:{score:.6f}")  # More precision
        print(f"[MODERATOR] Image scores: {', '.join(all_scores)}")

        # 2) OCR via vision, then text moderation
        try:
            print(f"[MODERATOR] Extracting text from image...")
            text = self._ocr_text_with_openai(data_url)
            if text:
                print(f"[MODERATOR] Extracted text: '{text[:100]}{'...' if len(text) > 100 else ''}'")
                if not self.is_text_ok(text):
                    print(f"[MODERATOR] Image REJECTED - text content inappropriate")
                    return False
            else:
                print(f"[MODERATOR] No text extracted from image")
        except Exception as e:
            print(f"[MODERATOR] OCR failed: {e}")
            # fail-closed by default; set fail_open=True if you prefer permissive behavior on OCR errors
            return True if fail_open else False

        print(f"[MODERATOR] Image APPROVED")
        return True

    # ---------- Vision OCR (OpenAI) ----------
    def _ocr_text_with_openai(self, data_url: str) -> str:
        """
        Extracts visible text with GPT-4o-mini. Deterministic prompt, temperature=0.
        """
        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text",
                     "text": "Extract ALL legible text exactly as it appears. "
                             "Return plain text only. Do NOT add, infer, or translate."},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }]
        )
        return (resp.choices[0].message.content or "").strip()

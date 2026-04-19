from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
FEEDBACK_PATH = BASE_DIR / "feedback_store.json"
DATASET_PATH = BASE_DIR.parent / "TS-PS14.csv"

MODELS_DIR.mkdir(exist_ok=True)

# How strongly to weight a QA correction vs one base sample during retraining
CORRECTION_WEIGHT = 5
# If the incoming complaint is this similar to a stored correction, override with the corrected label
CORRECTION_SIMILARITY_THRESHOLD = 0.75

app = FastAPI()
analyzer = SentimentIntensityAnalyzer()

# All mutable ML state is protected by this lock
_state_lock = threading.Lock()
vectorizer = None
category_model = None
feedback_entries: list[dict] = []
# Vector index of correction texts — rebuilt whenever feedback_entries changes
feedback_matrix = None


def _load_feedback_entries() -> list[dict]:
    if not FEEDBACK_PATH.exists():
        return []
    try:
        with open(FEEDBACK_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [e for e in data if e.get("text") and e.get("category")]
    except (json.JSONDecodeError, OSError):
        pass
    return []


def _persist_feedback_entries(entries: list[dict]) -> None:
    tmp = FEEDBACK_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    os.replace(tmp, FEEDBACK_PATH)


def _load_models_from_disk() -> None:
    """Load the latest vectorizer + classifier from disk into memory."""
    global vectorizer, category_model
    vec_path = MODELS_DIR / "tfidf_vectorizer.pkl"
    model_path = MODELS_DIR / "category_model.pkl"
    if vec_path.exists() and model_path.exists():
        vectorizer = joblib.load(vec_path)
        category_model = joblib.load(model_path)
    else:
        vectorizer = None
        category_model = None


def _rebuild_feedback_index() -> None:
    """Vectorize all stored correction texts so /analyze can do a fast similarity lookup."""
    global feedback_matrix
    if not feedback_entries or vectorizer is None:
        feedback_matrix = None
        return
    texts = [e["text"] for e in feedback_entries]
    try:
        feedback_matrix = vectorizer.transform(texts)
    except Exception:
        feedback_matrix = None


def _retrain_with_feedback() -> None:
    """Retrain the TF-IDF + classifier on original dataset plus weighted QA corrections.

    Runs inline after a feedback submission. For ~50k rows this takes a couple of seconds.
    Writes the new models to disk and swaps them in atomically.
    """
    global vectorizer, category_model
    if not DATASET_PATH.exists():
        # No base dataset — we can't retrain. Corrections are still served from memory.
        return

    df = pd.read_csv(DATASET_PATH)
    X_base = df["text"].fillna("").astype(str).tolist()
    y_base = df["category"].astype(str).tolist()
    w_base = [1.0] * len(X_base)

    X_fb = [e["text"] for e in feedback_entries]
    y_fb = [e["category"] for e in feedback_entries]
    w_fb = [float(CORRECTION_WEIGHT)] * len(X_fb)

    X_all = X_base + X_fb
    y_all = y_base + y_fb
    w_all = w_base + w_fb

    new_vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
    X_vec = new_vectorizer.fit_transform(X_all)
    new_model = LogisticRegression(max_iter=1000)
    new_model.fit(X_vec, y_all, sample_weight=w_all)

    joblib.dump(new_vectorizer, MODELS_DIR / "tfidf_vectorizer.pkl")
    joblib.dump(new_model, MODELS_DIR / "category_model.pkl")

    vectorizer = new_vectorizer
    category_model = new_model
    _rebuild_feedback_index()


def _find_correction_override(text: str) -> Optional[dict]:
    """If a stored QA correction matches the input text closely, return it."""
    if feedback_matrix is None or vectorizer is None or not feedback_entries:
        return None
    try:
        q = vectorizer.transform([text])
    except Exception:
        return None
    sims = cosine_similarity(q, feedback_matrix)[0]
    if sims.size == 0:
        return None
    idx = int(sims.argmax())
    score = float(sims[idx])
    if score >= CORRECTION_SIMILARITY_THRESHOLD:
        entry = feedback_entries[idx]
        return {"category": entry["category"], "score": score, "matched_text": entry["text"]}
    return None


# Initialize at startup
with _state_lock:
    _load_models_from_disk()
    feedback_entries = _load_feedback_entries()
    _rebuild_feedback_index()


class ComplaintInput(BaseModel):
    text: str


class ComplaintOutput(BaseModel):
    category: str
    priority: str
    sentiment: float
    recommendation: str
    validation_flag: bool
    explanation: str


class FeedbackInput(BaseModel):
    text: str
    corrected_category: str
    original_category: Optional[str] = None
    source: Optional[str] = None  # e.g. "QA", "MANAGER"


class FeedbackOutput(BaseModel):
    success: bool
    total_corrections: int
    retrained: bool
    message: str


@app.post("/analyze", response_model=ComplaintOutput)
def analyze_complaint(complaint: ComplaintInput):
    text = complaint.text
    lower_text = text.lower()

    # --- 1. Classification ---
    override = None
    with _state_lock:
        override = _find_correction_override(text)
        if override is not None:
            category = override["category"]
        elif vectorizer is not None and category_model is not None:
            vec = vectorizer.transform([text])
            category = category_model.predict(vec)[0]
        else:
            category = "Unknown"

    # --- Keyword-based override for common misclassifications (skip if a QA correction already matched) ---
    if override is None:
        product_keywords = ["product", "item", "device", "appliance", "gadget", "machine", "stopped working", "malfunctioning", "defective", "not working", "broken product"]
        packaging_keywords = ["box", "packaging", "package", "wrapper", "seal", "carton", "damaged packaging", "broken box"]
        trade_keywords = ["bulk order", "pricing", "trade", "wholesale", "inquiry", "quote", "discount"]

        product_score = sum(1 for kw in product_keywords if kw in lower_text)
        packaging_score = sum(1 for kw in packaging_keywords if kw in lower_text)
        trade_score = sum(1 for kw in trade_keywords if kw in lower_text)

        if product_score > packaging_score and product_score > trade_score and product_score >= 1:
            category = "Product"
        elif packaging_score > product_score and packaging_score > trade_score and packaging_score >= 1:
            category = "Packaging"
        elif trade_score > product_score and trade_score > packaging_score and trade_score >= 1:
            category = "Trade"

    # --- Sentiment ---
    sentiment_dict = analyzer.polarity_scores(text)
    sentiment_score = sentiment_dict["compound"]

    # --- 2. Priority ---
    priority = "Low"
    if sentiment_score < -0.5 or "urgent" in lower_text or "broken" in lower_text or "damaged" in lower_text:
        priority = "High"
    elif sentiment_score < -0.1 or "poor" in lower_text or "defective" in lower_text:
        priority = "Medium"

    # --- 3. Recommendation ---
    recommendation = "Provide info"
    if category == "Product" and priority == "High":
        recommendation = "Replace + escalate to supervisor"
    elif category == "Product" and priority == "Medium":
        recommendation = "Troubleshoot and resolve"
    elif category == "Packaging" and priority in ["High", "Medium"]:
        recommendation = "Apologize and arrange return/logistics"
    elif category == "Trade":
        recommendation = "Route to sales/pricing team"

    # --- 4. QA Validation flag ---
    validation_flag = False
    if category == "Trade" and priority == "High" and sentiment_score > 0:
        validation_flag = True
    if "broken" in lower_text and category != "Packaging" and category != "Product":
        validation_flag = True

    # --- 5. Explanation ---
    if override is not None:
        explanation = (
            f"Classified as '{category}' from QA-learned correction "
            f"(similarity {override['score']:.2f} to a prior reviewed complaint). "
            f"Priority '{priority}' derived from sentiment score ({sentiment_score:.2f}) and keywords."
        )
    else:
        explanation = (
            f"Classified as '{category}' via ML model. "
            f"Priority '{priority}' derived from sentiment score ({sentiment_score:.2f}) and keywords. "
            f"Recommendation generated via rule engine."
        )

    return ComplaintOutput(
        category=category,
        priority=priority,
        sentiment=sentiment_score,
        recommendation=recommendation,
        validation_flag=validation_flag,
        explanation=explanation,
    )


@app.post("/feedback", response_model=FeedbackOutput)
def record_feedback(fb: FeedbackInput):
    """Record a QA correction, then retrain the classifier to learn from it."""
    text = (fb.text or "").strip()
    corrected = (fb.corrected_category or "").strip()
    if not text or not corrected:
        return FeedbackOutput(success=False, total_corrections=len(feedback_entries), retrained=False,
                              message="text and corrected_category are required")

    with _state_lock:
        entry = {
            "text": text,
            "category": corrected,
            "original_category": fb.original_category,
            "source": fb.source or "QA",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # If the same text was corrected before, update the existing entry in place
        existing_idx = next((i for i, e in enumerate(feedback_entries) if e["text"].strip().lower() == text.lower()), None)
        if existing_idx is not None:
            feedback_entries[existing_idx] = entry
        else:
            feedback_entries.append(entry)

        _persist_feedback_entries(feedback_entries)

        retrained = False
        try:
            _retrain_with_feedback()
            retrained = True
        except Exception as exc:
            # Fall back: still keep the correction in memory so /analyze can use similarity override
            print(f"[feedback] Retrain failed, using correction memory only: {exc}")
            _rebuild_feedback_index()

        total = len(feedback_entries)

    return FeedbackOutput(
        success=True,
        total_corrections=total,
        retrained=retrained,
        message=(
            f"Correction stored. Model retrained on {total} corrections weighted {CORRECTION_WEIGHT}x."
            if retrained
            else f"Correction stored. Retrain failed; similarity-based override is active for {total} corrections."
        ),
    )


@app.get("/feedback")
def list_feedback():
    """Inspect what QA has taught the model so far."""
    with _state_lock:
        return {
            "total": len(feedback_entries),
            "correction_weight": CORRECTION_WEIGHT,
            "similarity_threshold": CORRECTION_SIMILARITY_THRESHOLD,
            "entries": feedback_entries,
        }

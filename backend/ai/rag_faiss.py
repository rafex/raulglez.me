import json
import os
import sqlite3
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

try:
    import faiss  # type: ignore
except Exception as e:
    print(json.dumps({"error": f"faiss import error: {e}"}))
    raise


def normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=1, keepdims=True) + 1e-9
    return v / n


def hash_embed(texts: List[str], dim: int = 384) -> np.ndarray:
    mat = np.zeros((len(texts), dim), dtype='float32')
    for i, txt in enumerate(texts):
        for tok in txt.lower().split():
            h = hashlib.md5(tok.encode('utf-8')).hexdigest()
            idx = int(h[:8], 16) % dim
            sign = -1.0 if int(h[8:9], 16) % 2 else 1.0
            mat[i, idx] += sign
    return normalize(mat)


def sentence_transformer_embed(texts: List[str]) -> np.ndarray:
    from sentence_transformers import SentenceTransformer  # type: ignore

    model_name = os.getenv('RAG_EMBED_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
    model = SentenceTransformer(model_name)
    vec = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return vec.astype('float32')


def embed(texts: List[str]) -> np.ndarray:
    try:
        return sentence_transformer_embed(texts)
    except Exception:
        return hash_embed(texts)


def flatten(obj: Any, prefix: str = '') -> List[Tuple[str, str]]:
    rows: List[Tuple[str, str]] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{prefix}.{k}" if prefix else k
            rows.extend(flatten(v, p))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            p = f"{prefix}[{i}]"
            rows.extend(flatten(v, p))
    else:
        if obj is None:
            return rows
        s = str(obj).strip()
        if s:
            rows.append((prefix, s))
    return rows


def read_approved_qa(sqlite_path: str) -> List[Tuple[str, str]]:
    if not Path(sqlite_path).exists():
        return []
    conn = sqlite3.connect(sqlite_path)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT question, COALESCE(adjusted_answer, answer)
        FROM qa_interactions
        WHERE status = 'approved' AND (rating IS NULL OR rating >= 4)
        """
    )
    rows = [(f"qa.question: {q}", f"qa.answer: {a}") for q, a in cur.fetchall() if q and a]
    conn.close()
    return rows


def build_index(cv_json_path: str, sqlite_path: str, index_dir: str) -> Dict[str, Any]:
    data = json.loads(Path(cv_json_path).read_text(encoding='utf-8'))
    flat = flatten(data)
    approved = read_approved_qa(sqlite_path)

    docs: List[Dict[str, str]] = [{"source": src, "text": txt} for src, txt in flat]
    docs.extend({"source": s, "text": t} for s, t in approved)

    texts = [d['text'] for d in docs]
    vec = embed(texts)

    index = faiss.IndexFlatIP(vec.shape[1])
    index.add(vec)

    out = Path(index_dir)
    out.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(out / 'cv.index.faiss'))
    (out / 'cv.meta.json').write_text(json.dumps(docs, ensure_ascii=False), encoding='utf-8')

    return {"ok": True, "docs": len(docs), "dim": int(vec.shape[1])}


def ensure_index(cv_json_path: str, sqlite_path: str, index_dir: str) -> None:
    idx = Path(index_dir) / 'cv.index.faiss'
    meta = Path(index_dir) / 'cv.meta.json'
    if not idx.exists() or not meta.exists():
        build_index(cv_json_path, sqlite_path, index_dir)


def query_index(cv_json_path: str, sqlite_path: str, index_dir: str, question: str, top_k: int = 8) -> Dict[str, Any]:
    ensure_index(cv_json_path, sqlite_path, index_dir)
    idx_path = Path(index_dir) / 'cv.index.faiss'
    meta_path = Path(index_dir) / 'cv.meta.json'

    index = faiss.read_index(str(idx_path))
    docs = json.loads(meta_path.read_text(encoding='utf-8'))

    qv = embed([question])
    scores, ids = index.search(qv, top_k)

    chunks = []
    for score, idx in zip(scores[0].tolist(), ids[0].tolist()):
        if idx < 0 or idx >= len(docs):
            continue
        doc = docs[idx]
        chunks.append({
            "score": float(score),
            "source": doc.get('source', 'unknown'),
            "text": doc.get('text', ''),
        })

    return {"chunks": chunks}


def deterministic_answer(cv_json_path: str, sqlite_path: str, index_dir: str, question: str, top_k: int = 8) -> Dict[str, Any]:
    result = query_index(cv_json_path, sqlite_path, index_dir, question, top_k)
    chunks = result.get("chunks", [])
    if not chunks:
        return {"answer": "No tengo evidencia suficiente en el CV para afirmarlo.", "chunks": []}

    best = chunks[0]
    best_score = float(best.get("score", 0.0))
    if best_score < 0.15:
        return {"answer": "No tengo evidencia suficiente en el CV para afirmarlo.", "chunks": chunks}

    evidence: List[str] = []
    for idx, chunk in enumerate(chunks[:3], start=1):
        text = str(chunk.get("text", "")).strip()
        source = str(chunk.get("source", "unknown")).strip()
        if not text:
            continue
        evidence.append(f"({idx}) [{source}] {text}")

    if not evidence:
        return {"answer": "No tengo evidencia suficiente en el CV para afirmarlo.", "chunks": chunks}

    answer = "Respuesta basada en evidencia del CV:\n" + "\n".join(evidence)
    return {"answer": answer, "chunks": chunks}


def main() -> None:
    payload = json.loads(input())
    action = payload.get('action', 'query')

    cv_json_path = payload['cv_json_path']
    sqlite_path = payload['sqlite_path']
    index_dir = payload['index_dir']

    if action == 'build':
        result = build_index(cv_json_path, sqlite_path, index_dir)
    elif action == 'deterministic_answer':
        result = deterministic_answer(
            cv_json_path=cv_json_path,
            sqlite_path=sqlite_path,
            index_dir=index_dir,
            question=payload['question'],
            top_k=int(payload.get('top_k', 8)),
        )
    else:
        result = query_index(
            cv_json_path=cv_json_path,
            sqlite_path=sqlite_path,
            index_dir=index_dir,
            question=payload['question'],
            top_k=int(payload.get('top_k', 8)),
        )

    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()

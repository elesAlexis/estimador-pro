import hmac
import json
import os
import sqlite3
from contextlib import closing
from uuid import uuid4

from flask import Flask, request


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
db_path = os.environ["SQLITE_PATH"]
expected_auth = f"Bearer {os.environ['STORAGE_API_TOKEN']}".encode()


def connect():
    return sqlite3.connect(db_path, timeout=3)


with closing(connect()) as db, db:
    db.execute("""
        CREATE TABLE IF NOT EXISTS backups (
            id TEXT PRIMARY KEY NOT NULL,
            snapshot TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)


@app.before_request
def authorize_backup_requests():
    if request.path.startswith("/backups"):
        supplied = request.headers.get("Authorization", "").encode()
        if not hmac.compare_digest(supplied, expected_auth):
            return {"error": "Acceso al servicio de respaldos denegado."}, 401


@app.errorhandler(sqlite3.Error)
def database_unavailable(_error):
    return {"error": "No se pudo acceder al archivo SQLite."}, 503


@app.errorhandler(413)
def backup_too_large(_error):
    return {"error": "El respaldo supera el límite de 2 MB."}, 413


@app.get("/health")
def health():
    with closing(connect()) as db:
        db.execute("SELECT 1 FROM backups LIMIT 1").fetchone()
    return {"status": "ok"}


@app.post("/backups")
def save_backup():
    snapshot = request.get_json(silent=True)
    if not isinstance(snapshot, dict):
        return {"error": "El respaldo debe ser un objeto JSON."}, 400
    project = snapshot.get("projectInfo")
    if not isinstance(project, dict) or not isinstance(project.get("name"), str):
        return {"error": "El respaldo debe incluir la información del proyecto."}, 400
    if not isinstance(snapshot.get("sprints"), list):
        return {"error": "El respaldo debe incluir la lista de sprints."}, 400

    backup_id = str(uuid4())
    with closing(connect()) as db, db:
        db.execute("INSERT INTO backups (id, snapshot) VALUES (?, ?)",
                   (backup_id, json.dumps(snapshot, ensure_ascii=False)))
    return {"id": backup_id}, 201


@app.get("/backups/<uuid:backup_id>")
def read_backup(backup_id):
    with closing(connect()) as db:
        row = db.execute("SELECT snapshot, created_at FROM backups WHERE id = ?",
                         (str(backup_id),)).fetchone()
    if row is None:
        return {"error": "No se encontró el respaldo."}, 404
    return {"id": str(backup_id), "snapshot": json.loads(row[0]), "createdAt": row[1]}

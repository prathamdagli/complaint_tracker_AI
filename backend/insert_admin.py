import sqlite3
import uuid
import datetime

conn = sqlite3.connect('dev.db')
id_val = str(uuid.uuid4())
date_val = datetime.datetime.utcnow().isoformat() + 'Z'
hashed_pw = r'$2b$10$WszGYzwPIt4/JDZv5haGMuV2RbkunPQnq4iyZFjeVm.tbU/kgVp1u'

conn.execute(
    "INSERT INTO User (id, username, password, role, createdAt) VALUES (?, ?, ?, ?, ?)",
    (id_val, 'admin@gmail.com', hashed_pw, 'ADMIN', date_val)
)
conn.commit()
print('Admin inserted natively using Python!')
conn.close()

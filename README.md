# Portfolio (Ganesh Suraj)

Interactive portfolio site with a **name gate**, a **SQLite visitor log**, and a **3D hero**.

## Run locally

```powershell
python server.py
```

Then open:
- `http://127.0.0.1:8000/`
- Admin: `http://127.0.0.1:8000/admin`

## Admin security (recommended before sharing)

Set an admin password (enables Basic Auth for `/api/admin/visits`):

```powershell
$env:ADMIN_PASSWORD="your-strong-password"
python server.py
```

## Data

Visitor entries are stored in `data/visitors.sqlite3` (ignored by git).


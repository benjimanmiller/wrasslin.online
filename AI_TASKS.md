# AI Context & Tasks

## Project Goals
- Build a Flask app for "Wrasslin!".
- Use SQLite for data persistence (No ORM dependencies if possible).
- Frontend: Vanilla HTML/CSS/JS served statically by Flask.
- Organize code using Blueprints and Models.

## Current Status
- [x] Project structure initialized.
- [x] README and AI context files created.
- [x] Basic static frontend created (index, login, about, contact).
- [x] Flask serving static files via Blueprint.
- [x] Consolidated entry point to `app.py`.
- [ ] Define database schema (schema.sql).
- [ ] Implement Login logic (API/Form handling).
- [ ] Connect frontend forms to backend endpoints.

## Notes
- HTML files are currently located in `static/` and served directly via `send_static_file` in `blueprints/routes.py`.
- `app.py` contains the `create_app` factory and runs the server.
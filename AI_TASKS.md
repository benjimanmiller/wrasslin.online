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
- [x] Define database schema (schema.sql).
- [x] Initialize Database (init-db command).
- [ ] Implement Login logic (API/Form handling).
- [ ] Implement XP System (Settings & Logging).
- [ ] Create User Registration (handling different user types).
- [ ] Implement Gamification Logic (XP gain on actions).
- [ ] Connect frontend forms to backend endpoints.

## Notes
- HTML files are currently located in `static/` and served directly via `send_static_file` in `blueprints/routes.py`.
- `app.py` contains the `create_app` factory and runs the server.
- Database schema expanded to include detailed user info, wrestler stats, social links, likes, geolocation, calendar export fields, XP system, moderation tools, and awards.
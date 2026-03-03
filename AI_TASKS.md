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
- [x] Implement Login logic (API/Form handling).
- [ ] Implement XP System (Settings & Logging).
- [ ] Create User Registration (handling different user types).
- [x] Create User Registration (handling different user types).
- [ ] Implement Gamification Logic (XP gain on actions).
- [ ] Connect frontend forms to backend endpoints.
- [ ] Implement Group/Faction management (CRUD & Membership).
- [ ] Implement Match Result logging (Card positioning, winners, times).
- [ ] Implement Title Management (Defenses vs Changes, Freebird rule support).

## Notes
- HTML files are currently located in `static/` and served directly via `send_static_file` in `blueprints/routes.py`.
- `app.py` contains the `create_app` factory and runs the server.
- Database schema expanded to include detailed user info, wrestler stats, social links, likes, geolocation, calendar export fields, XP system, moderation tools, and awards.
- **Schema Update (Groups)**: `wrestling_group` table added to handle Factions/Stables. `wrestling_group_member` tracks historical membership (joined/left dates).
- **Schema Update (Matches)**: `match_card` and `match_participant` added. Participants can be linked to a `wrestling_group`.
- **Schema Update (Titles)**: `title_history` updated to support the "Freebird Rule" (linking to a group instead of a specific user). `title_defense` added to track successful retentions.
- **Schema Update (Privacy)**: User table now includes `is_real_name_public`, `is_contact_public`, and `is_location_public` flags.
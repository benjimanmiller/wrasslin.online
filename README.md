# Wrasslin!

Wrasslin! A Flask-based web application.

## Tech Stack

- **Backend**: Flask (Python)
- **Database**: SQLite (Native)
- **Frontend**: Static HTML, CSS, JS (Served via Flask)
- **Architecture**: Blueprints & Application Factory

## Features

- **Multi-Role User System**: Distinct profiles for Promoters, Wrestlers, Staff, Referees, and Fans.
- **Wrestler Profiles**: Track stats like height, weight, hometown, finishers, theme music, and alignment (Face/Heel).
- **Promotion Management**: Manage organizations, rosters, and contracts.
- **Wrestling Groups**: Manage Factions, Stables, and Tag Teams with historical membership tracking.
- **Championship Tracking**: Create titles (belts, briefcases, trophies) and maintain historical lineage of champions.
- **Match Analytics**: Record detailed match results, times, stipulations, and title defenses.
- **Event Scheduling**: Organize shows with venue details, ticketing links, and broadcast info.
- **Social Interaction**: Feed system with posts, comments, likes, and follows.
- **Privacy Controls**: User-defined visibility for real names, contact info, and location.
- **Gamification**: XP system with leveling and digital awards/badges.
- **Moderation Tools**: Admin logs and IP banning capabilities.

## Folder Structure

```text
Wrasslin!/
├── blueprints/          # Route controllers
├── models/              # Database logic
├── static/              # HTML, CSS, JS Assets
├── app.py               # Application entry point & Factory
└── instance/            # Database storage
```

## Setup

1. Initialize the environment.
2. Run the application:
   ```bash
   python run.py
   ```

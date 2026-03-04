from flask import request, jsonify, g
from werkzeug.security import generate_password_hash
from models.models import get_db
from . import api_bp as bp
import traceback

# Whitelist of tables to expose via API
ALLOWED_TABLES = [
    'user', 'promotion', 'roster_member', 'wrestling_group',
    'wrestling_group_member', 'title', 'post', 'comment', 'event',
    'match_card', 'match_participant', 'title_history', 'title_defense',
    'follower', 'post_like', 'xp_setting', 'user_xp_log', 'banned_ip',
    'moderation_log', 'award', 'user_award'
]

def get_table_columns(table_name):
    db = get_db()
    cursor = db.execute(f"PRAGMA table_info({table_name})")
    # row[1] is the column name in PRAGMA table_info results
    return {row[1] for row in cursor.fetchall()}

@bp.route('/<table_name>', methods=['GET'])
def get_all(table_name):
    try:
        if table_name not in ALLOWED_TABLES:
            return jsonify({'error': 'Table not found'}), 404
        
        print(f"--- Executing get_all for table: {table_name} ---")
        print(f"--- Request args: {request.args} ---")
        
        db = get_db()
        
        # Filter query params to only include valid columns (prevents errors on random params)
        valid_columns = get_table_columns(table_name)
        
        query = f"SELECT * FROM {table_name}"
        args = []
        
        valid_filters = {}
        for k, v in request.args.items():
            if k in valid_columns:
                valid_filters[k] = v
        
        if valid_filters:
            filters = [f"{key} = ?" for key in valid_filters.keys()]
            query += " WHERE " + " AND ".join(filters)
            args = list(valid_filters.values())

        print(f"--- Executing query: {query} with args: {args} ---")
        cursor = db.execute(query, args)
        
        # Robust row-to-dict conversion (Manual mapping)
        col_names = [col[0] for col in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append({col_names[i]: row[i] for i in range(len(col_names))})
            
        print(f"--- Successfully fetched {len(results)} rows ---")
        return jsonify(results)
    except Exception as e:
        print("\n" + "="*80)
        print(f"!!!!!! MAJOR ERROR IN get_all('{table_name}') !!!!!!")
        print(f"!!!!!! Request Args: {request.args} !!!!!!")
        traceback.print_exc()
        print("="*80 + "\n")
        return jsonify({'error': str(e)}), 500

@bp.route('/<table_name>/<int:id>', methods=['GET'])
def get_one(table_name, id):
    if table_name not in ALLOWED_TABLES:
        return jsonify({'error': 'Table not found'}), 404

    try:
        db = get_db()
        cursor = db.execute(f"SELECT * FROM {table_name} WHERE id = ?", (id,))
        row = cursor.fetchone()
        
        if row is None:
            return jsonify({'error': 'Record not found'}), 404
            
        col_names = [col[0] for col in cursor.description]
        result = {col_names[i]: row[i] for i in range(len(col_names))}
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<table_name>', methods=['POST'])
def create(table_name):
    if table_name not in ALLOWED_TABLES:
        return jsonify({'error': 'Table not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Special handling for user passwords
    if table_name == 'user' and 'password' in data:
        data['password_hash'] = generate_password_hash(data.pop('password'))

    # Filter data to only include valid columns
    valid_columns = get_table_columns(table_name)
    data = {k: v for k, v in data.items() if k in valid_columns}

    if not data:
        return jsonify({'error': 'No valid data provided (check schema)'}), 400

    keys = data.keys()
    columns = ', '.join(keys)
    placeholders = ', '.join(['?'] * len(keys))
    values = list(data.values())

    sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
    
    db = get_db()
    try:
        cursor = db.execute(sql, values)
        db.commit()

        # Activity Logging & Auto-Posting for Title History
        if table_name == 'title_history' and g.user:
            try:
                # 1. Fetch context for the log/post
                title_row = db.execute("SELECT name, promotion_id FROM title WHERE id = ?", (data.get('title_id'),)).fetchone()
                title_name = title_row['name'] if title_row else "A Title"
                promotion_id = title_row['promotion_id'] if title_row else None

                champ_name = data.get('champion_name')
                if not champ_name and data.get('wrestler_id'):
                    w_row = db.execute("SELECT display_name, username FROM user WHERE id = ?", (data.get('wrestler_id'),)).fetchone()
                    if w_row: champ_name = w_row['display_name'] or w_row['username']
                
                champ_name = champ_name or 'Vacant'

                # 2. Create XP Log Action
                xp_to_gain = 5
                action_msg = f"Title Change: {title_name} -> {champ_name}"
                notes = data.get('notes')
                if notes:
                    action_msg += f" [{notes}]"
                
                db.execute("INSERT INTO user_xp_log (user_id, action_key, xp_gained, source_table, source_id) VALUES (?, ?, ?, ?, ?)",
                           (g.user['id'], action_msg, xp_to_gain, table_name, cursor.lastrowid))
                
                # 3. Update user's total XP and Level
                db.execute("UPDATE user SET xp = xp + ?, level = (xp / 100) + 1 WHERE id = ?", (xp_to_gain, g.user['id']))

                # 4. Create automatic feed post
                post_content = f"BREAKING: {champ_name} has won the {title_name}!"
                db.execute("INSERT INTO post (author_id, promotion_id, content) VALUES (?, ?, ?)", 
                           (g.user['id'], promotion_id, post_content))

                db.commit() # Commit all changes at once
            except Exception as log_e:
                print(f"!!! Non-critical error during logging/auto-posting: {log_e}")
                # We don't want this to fail the whole request, so we can choose to ignore it.
                # If the main commit hasn't happened, we might need to rollback, but here it's okay.
                pass

        return jsonify({'id': cursor.lastrowid, 'message': 'Created successfully'}), 201
    except Exception as e:
        db.rollback() # Rollback on main insertion failure
        return jsonify({'error': str(e)}), 400

@bp.route('/<table_name>/<int:id>', methods=['PUT'])
def update(table_name, id):
    if table_name not in ALLOWED_TABLES:
        return jsonify({'error': 'Table not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Special handling for user passwords
    if table_name == 'user' and 'password' in data:
        data['password_hash'] = generate_password_hash(data.pop('password'))

    # Filter data to only include valid columns
    valid_columns = get_table_columns(table_name)
    data = {k: v for k, v in data.items() if k in valid_columns}

    keys = data.keys()
    set_clause = ', '.join([f"{key} = ?" for key in keys])
    values = list(data.values())
    values.append(id)

    sql = f"UPDATE {table_name} SET {set_clause} WHERE id = ?"
    
    db = get_db()
    try:
        db.execute(sql, values)
        db.commit()
        return jsonify({'message': 'Updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<table_name>/<int:id>', methods=['DELETE'])
def delete(table_name, id):
    if table_name not in ALLOWED_TABLES:
        return jsonify({'error': 'Table not found'}), 404

    db = get_db()
    db.execute(f"DELETE FROM {table_name} WHERE id = ?", (id,))
    db.commit()
    return jsonify({'message': 'Deleted successfully'})

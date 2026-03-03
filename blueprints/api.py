from flask import request, jsonify
from werkzeug.security import generate_password_hash
from models.models import get_db
from . import api_bp as bp

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
    return {row['name'] for row in cursor.fetchall()}

@bp.route('/<table_name>', methods=['GET'])
def get_all(table_name):
    if table_name not in ALLOWED_TABLES:
        return jsonify({'error': 'Table not found'}), 404
    
    try:
        db = get_db()
        
        # Filter query params to only include valid columns (prevents errors on random params)
        valid_columns = get_table_columns(table_name)
        
        query = f"SELECT * FROM {table_name}"
        args = []
        
        valid_filters = {k: v for k, v in request.args.items() if k in valid_columns}
        
        if valid_filters:
            filters = [f"{key} = ?" for key in valid_filters.keys()]
            query += " WHERE " + " AND ".join(filters)
            args = list(valid_filters.values())

        cursor = db.execute(query, args)
        results = [dict(zip(row.keys(), row)) for row in cursor.fetchall()]
        return jsonify(results)
    except Exception as e:
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
            
        return jsonify(dict(zip(row.keys(), row)))
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
        return jsonify({'id': cursor.lastrowid, 'message': 'Created successfully'}), 201
    except Exception as e:
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
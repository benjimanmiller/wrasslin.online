import functools
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify
)
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import get_db

from . import auth_bp as bp

@bp.route('/register', methods=('GET', 'POST'))
def register():
    if request.method == 'POST':
        # Support both JSON (API) and Form data
        if request.is_json:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            email = data.get('email')
            user_type = data.get('user_type', 'fan')
        else:
            username = request.form.get('username')
            password = request.form.get('password')
            email = request.form.get('email')
            user_type = request.form.get('user_type', 'fan')

        db = get_db()
        error = None

        if not username:
            error = 'Username is required.'
        elif not password:
            error = 'Password is required.'
        elif not email:
            error = 'Email is required.'

        if error is None:
            try:
                db.execute(
                    "INSERT INTO user (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)",
                    (username, email, generate_password_hash(password), user_type),
                )
                db.commit()
            except db.IntegrityError:
                error = f"User {username} or email {email} is already registered."
            else:
                if request.is_json:
                    return jsonify({'success': True, 'message': 'Registration successful'}), 201
                return redirect('/') # Redirect to home or login page

        if request.is_json:
            return jsonify({'success': False, 'error': error}), 400
        
        flash(error)

    return "Please use POST to register.", 405

@bp.route('/login', methods=('GET', 'POST'))
def login():
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
        else:
            username = request.form.get('username')
            password = request.form.get('password')

        db = get_db()
        error = None
        user = db.execute(
            'SELECT * FROM user WHERE username = ?', (username,)
        ).fetchone()

        if user is None:
            error = 'Incorrect username.'
        elif not check_password_hash(user['password_hash'], password):
            error = 'Incorrect password.'

        if error is None:
            session.clear()
            session['user_id'] = user['id']
            if request.is_json:
                return jsonify({'success': True, 'message': 'Login successful'})
            return redirect('/')

        if request.is_json:
            return jsonify({'success': False, 'error': error}), 401
        
        flash(error)

    return "Please use POST to login.", 405

@bp.before_app_request
def load_logged_in_user():
    user_id = session.get('user_id')

    if user_id is None:
        g.user = None
    else:
        g.user = get_db().execute(
            'SELECT * FROM user WHERE id = ?', (user_id,)
        ).fetchone()

@bp.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@bp.route('/status')
def status():
    """API endpoint to check auth status from frontend JS"""
    if g.user:
        return jsonify({
            'logged_in': True, 
            'id': g.user['id'],
            'username': g.user['username'], 
            'user_type': g.user['user_type']
        })
    return jsonify({'logged_in': False})

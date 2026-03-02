from flask import current_app
from . import main_bp

@main_bp.route('/')
def index():
    return current_app.send_static_file('index.html')

@main_bp.route('/<path:path>')
def static_proxy(path):
    return current_app.send_static_file(path)
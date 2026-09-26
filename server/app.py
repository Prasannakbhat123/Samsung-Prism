"""HTTP API + static frontend."""
import threading

from flask import Flask, jsonify, request, send_file, send_from_directory
from werkzeug.exceptions import HTTPException

from . import config, models, store
from .store import BadRequest, NotFound, Project


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config['MAX_CONTENT_LENGTH'] = 4 * 1024 ** 3  # uploads of whole videos / frame folders

    def project(name) -> Project:
        p = Project(name)
        p.meta()  # raises NotFound
        return p

    @app.errorhandler(NotFound)
    def _not_found(e):
        return jsonify(error=str(e)), 404

    @app.errorhandler(BadRequest)
    def _bad_request(e):
        return jsonify(error=str(e)), 400

    @app.errorhandler(Exception)
    def _error(e):
        if isinstance(e, HTTPException):
            return jsonify(error=e.description), e.code
        app.logger.exception(e)
        return jsonify(error=f'{type(e).__name__}: {e}'), 500

    # ---- status ---------------------------------------------------------
    @app.get('/api/status')
    def status():
        return jsonify(device=str(models.ritm.device), ritm=models.ritm.status(), xmem=models.xmem.status())

    # ---- projects -------------------------------------------------------
    @app.get('/api/projects')
    def list_projects():
        return jsonify(store.list_projects())

    @app.post('/api/projects')
    def create_project():
        files = request.files.getlist('files')
        uploads = [(f.filename, f.stream) for f in files if f.filename]
        p = store.create_project(request.form.get('name', '').strip(), uploads)
        return jsonify(p.summary()), 201

    @app.get('/api/projects/<name>')
    def get_project(name):
        return jsonify(project(name).summary())

    @app.delete('/api/projects/<name>')
    def delete_project(name):
        store.delete_project(name)
        return '', 204

    @app.get('/api/projects/<name>/export')
    def export_project(name):
        p = project(name)
        return send_file(p.export_zip(), mimetype='application/zip', as_attachment=True,
                         download_name=f'{p.name}.zip')

    # ---- frames ---------------------------------------------------------
    @app.get('/api/projects/<name>/frames/<frame>/image')
    def frame_image(name, frame):
        return send_file(project(name).image_path(frame), max_age=3600)

    @app.get('/api/projects/<name>/frames/<frame>/annotation')
    def get_annotation(name, frame):
        objects, source = project(name).read_annotation(frame)
        return jsonify(objects=objects, source=source)

    @app.put('/api/projects/<name>/frames/<frame>/annotation')
    def put_annotation(name, frame):
        p = project(name)
        p.write_objects(frame, (request.get_json(force=True) or {}).get('objects', []))  # edits make a keyframe
        objects, source = p.read_annotation(frame)
        return jsonify(objects=objects, source=source)

    # ---- models ---------------------------------------------------------
    @app.post('/api/projects/<name>/frames/<frame>/ritm/click')
    def ritm_click(name, frame):
        body = request.get_json(force=True) or {}
        try:
            x, y = float(body['x']), float(body['y'])
        except (KeyError, TypeError, ValueError):
            raise BadRequest('x and y are required')
        p = project(name)
        p.check_frame(frame)
        return jsonify(models.ritm.click(p, frame, x, y, body.get('positive', True)))

    @app.post('/api/projects/<name>/frames/<frame>/ritm/undo')
    def ritm_undo(name, frame):
        return jsonify(models.ritm.undo(project(name), frame))

    @app.post('/api/ritm/reset')
    def ritm_reset():
        return jsonify(models.ritm.reset())

    @app.post('/api/projects/<name>/frames/<frame>/propagate')
    def propagate(name, frame):
        body = request.get_json(force=True) or {}
        refs = body.get('references')  # optional list of frame names; omit for auto
        if refs is not None and not (isinstance(refs, list) and all(isinstance(r, str) for r in refs)):
            raise BadRequest('references must be a list of frame names')
        return jsonify(models.xmem.propagate(project(name), frame, int(body.get('count', 1)), refs))

    # ---- frontend -------------------------------------------------------
    @app.get('/', defaults={'path': ''})
    @app.get('/<path:path>')
    def frontend(path):
        if path.startswith('api/'):
            return jsonify(error=f'Unknown endpoint: /{path}'), 404
        dist = config.FRONTEND_DIST
        if not (dist / 'index.html').exists():
            return ('Frontend not built. Run `npm run build` in web/, '
                    'or use the Vite dev server on http://localhost:5173.'), 404
        if path and (dist / path).is_file():
            return send_from_directory(dist, path)
        return send_from_directory(dist, 'index.html')

    return app


def serve(host=config.HOST, port=config.PORT, warm=True):
    if warm:
        threading.Thread(target=models.warm_up, daemon=True).start()
    print(f'[prism] data dir: {config.DATA_DIR}')
    print(f'[prism] device:   {models.ritm.device}')
    print(f'[prism] open      http://{host}:{port}', flush=True)
    create_app().run(host=host, port=port, threaded=True)

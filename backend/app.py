from flask import Flask, jsonify, request
from flask_cors import CORS

from models import GAME_IDS, Score, db

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
# Frontend runs on Vite's own dev port during development, so this is a
# genuine cross-origin request, not same-origin — CORS has to be open.
CORS(app)

with app.app_context():
    db.create_all()


@app.get('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.get('/api/scores')
def list_scores():
    """Leaderboard: top N scores, optionally filtered to one game."""
    game = request.args.get('game')
    limit = min(int(request.args.get('limit', 10)), 50)
    query = Score.query
    if game:
        query = query.filter_by(game=game)
    scores = query.order_by(Score.score.desc()).limit(limit).all()
    return jsonify([s.to_dict() for s in scores])


@app.get('/api/scores/best')
def best_scores():
    """One number per game: the current all-time high score. Mirrors what
    the frontend's local getHighScore(game) already tracks, but shared
    across devices instead of per-browser."""
    result = {}
    for game in GAME_IDS:
        top = Score.query.filter_by(game=game).order_by(Score.score.desc()).first()
        result[game] = top.score if top else 0
    return jsonify(result)


@app.post('/api/scores')
def submit_score():
    data = request.get_json(silent=True) or {}
    game = data.get('game')
    score = data.get('score')
    player_name = (data.get('player_name') or '').strip()[:40] or 'Jogador'

    if game not in GAME_IDS:
        return jsonify({'error': f'jogo desconhecido: {game}'}), 400
    if not isinstance(score, int) or score < 0:
        return jsonify({'error': 'score precisa ser um inteiro >= 0'}), 400

    entry = Score(game=game, player_name=player_name, score=score)
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201


if __name__ == '__main__':
    app.run(debug=True, port=5001)

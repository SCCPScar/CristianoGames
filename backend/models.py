from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Kept in sync with GameId in src/shared/storage.js — a score for any
# other id is rejected rather than silently accepted.
GAME_IDS = ('tetris', 'zuma', 'connect4', 'sequence')


class Score(db.Model):
    __tablename__ = 'scores'

    id = db.Column(db.Integer, primary_key=True)
    game = db.Column(db.String(20), nullable=False, index=True)
    player_name = db.Column(db.String(40), nullable=False, default='Jogador')
    score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'game': self.game,
            'player_name': self.player_name,
            'score': self.score,
            'created_at': self.created_at.isoformat(),
        }

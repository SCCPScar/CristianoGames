# Backend

API em Flask que guarda as pontuações dos jogos num banco SQLite (relacional), pra funcionar como um placar compartilhado entre dispositivos — o frontend também mantém uma cópia em `localStorage` como cache/fallback offline.

## Rodando localmente

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py
```

Sobe em `http://127.0.0.1:5001`. O banco (`backend/instance/database.db`) é criado automaticamente na primeira execução.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Ping simples |
| GET | `/api/scores?game=tetris&limit=10` | Top N pontuações (todos os jogos se `game` for omitido) |
| GET | `/api/scores/best` | Melhor pontuação de cada jogo, num objeto `{ jogo: pontuação }` |
| POST | `/api/scores` | Salva uma pontuação — corpo `{ "game": "tetris", "score": 1500, "player_name": "opcional" }` |

`game` precisa ser um dos IDs em `GAME_IDS` (`models.py`), que espelham `GameId` em `src/shared/storage.js`.

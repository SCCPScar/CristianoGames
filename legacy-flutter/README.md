# Arcade do Pai

App Flutter (Android/iOS) com dois jogos clássicos em um só lugar: **Tetris** e
um marble-popper estilo **Zuma**. Feito para uma pessoa com daltonismo
vermelho-verde — nenhuma cor sozinha carrega significado em nenhum dos dois
jogos, sempre acompanhada de um ícone/letra distinto. Todo o texto do app está
em português do Brasil.

## Como rodar

```
flutter pub get
flutter run
```

Precisa do Flutter SDK instalado e de um dispositivo/emulador Android ou iOS
conectado (ou o Android Studio/Xcode configurados).

## Estrutura

- `lib/shared/theme.dart` — paleta Okabe-Ito (segura para daltonismo) e o
  mapeamento cor+ícone de cada peça do Tetris e bola do Zuma.
- `lib/shared/storage.dart` — recordes e configurações salvos localmente
  (shared_preferences), sem backend nem login.
- `lib/home/` — tela inicial e configurações (som/vibração).
- `lib/games/tetris/` — tabuleiro, peças, controlador e tela do Tetris.
- `lib/games/zuma/` — caminho, cadeia de bolas, controlador e tela do Zuma.

## Testes

```
flutter analyze
flutter test
```

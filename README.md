# Arcade do Pai

App com dois jogos clássicos em um só lugar: **Tetris** e um
marble-popper estilo **Zuma**. Feito para uma pessoa com daltonismo
vermelho-verde (protanopia) — nenhuma cor sozinha carrega significado em
nenhum dos dois jogos, sempre acompanhada de um ícone ou letra distinto.
Todo o texto do app está em português do Brasil.

Construído com [Phaser 3](https://phaser.io/) (o jogo em si, roda em
qualquer navegador) empacotado com [Capacitor](https://capacitorjs.com/)
(gera o app instalável de Android/iOS de verdade).

> Existe uma versão anterior em Flutter em `legacy-flutter/` — trocamos de
> stack pra facilitar ajustes de visual sem precisar recompilar o app
> inteiro a cada mudança. Nada foi perdido, está tudo lá.

## Rodar durante o desenvolvimento

```
npm install
npm run dev
```

Abre em `http://localhost:5173` — funciona em qualquer navegador, celular
incluso (aponte o navegador do celular pro IP da máquina na mesma rede).
Mudanças no código aparecem na hora, sem precisar recarregar a página.

## Gerar o app instalável (Android)

Isso precisa do [Android Studio](https://developer.android.com/studio)
instalado (ele já vem com o SDK necessário):

```
npm run build
npx cap sync android
npx cap open android
```

O último comando abre o projeto no Android Studio. De lá, "Build > Build
Bundle(s) / APK(s) > Build APK(s)" gera um `.apk` que dá pra instalar
direto no celular (sem precisar de Play Store).

## Estrutura

- `src/shared/theme.js` — paleta Okabe-Ito (segura para daltonismo) e o
  mapeamento cor+ícone de cada peça do Tetris e bola do Zuma.
- `src/shared/storage.js` — recordes e configurações salvos localmente
  (localStorage), sem backend nem login.
- `src/shared/feedback.js` — sons (sintetizados, sem arquivos de áudio) e
  vibração.
- `src/scenes/HomeScene.js` — tela inicial e configurações.
- `src/games/tetris/` + `src/scenes/TetrisScene.js` — lógica e tela do
  Tetris.
- `src/games/zuma/` + `src/scenes/ZumaScene.js` — lógica e tela do Zuma.
- `android/` — projeto nativo gerado pelo Capacitor (comitado de
  propósito, é o que o Android Studio abre).

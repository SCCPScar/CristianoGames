import { AppColors, OkabeIto } from './theme.js';
import { makeButton, showModal } from './ui.js';

/// Shared pause dialog for both games: Pausado / Continuar / Sair.
export function showPauseDialog(scene, { onResume, onExit }) {
  const { panel, close, centerX, centerY, trackExtra } = showModal(scene, { panelWidth: 280, panelHeight: 220 });

  panel.add(
    scene.add.text(0, -80, '⏸  Pausado', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: AppColors.textPrimary }).setOrigin(0.5),
  );
  trackExtra(
    makeButton(scene, {
      x: centerX,
      y: centerY - 10,
      width: 220,
      label: '▶  Continuar',
      bgColor: AppColors.accent,
      onClick: () => {
        close();
        onResume();
      },
    }),
  );
  trackExtra(
    makeButton(scene, {
      x: centerX,
      y: centerY + 55,
      width: 220,
      label: 'Sair',
      filled: false,
      bgColor: AppColors.textSecondary,
      onClick: () => {
        close();
        onExit();
      },
    }),
  );

  return close;
}

/// Shared end-of-round dialog for both games. Used for "game over" and,
/// with isVictory + onNext, for "level complete" too.
export function showGameOverDialog(scene, { isVictory = false, score, bestScore, isNewRecord = false, onPlayAgain, onMenu, onNext = null }) {
  const height = onNext ? 340 : 290;
  const { panel, close, centerX, centerY, trackExtra } = showModal(scene, { panelWidth: 300, panelHeight: height });

  const titleColor = isVictory ? OkabeIto.yellow : AppColors.danger;
  const titleIcon = isVictory ? '🏆' : '😕';
  const titleText = isVictory ? 'Nível completo!' : 'Fim de jogo';

  let y = -height / 2 + 40;
  panel.add(
    scene.add
      .text(0, y, `${titleIcon}  ${titleText}`, { fontFamily: 'system-ui, sans-serif', fontSize: '21px', fontStyle: 'bold', color: titleColor })
      .setOrigin(0.5),
  );
  y += 44;
  panel.add(
    scene.add.text(0, y, `Pontuação: ${score}`, { fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: AppColors.textPrimary }).setOrigin(0.5),
  );
  y += 26;
  panel.add(
    scene.add
      .text(0, y, `Melhor pontuação: ${bestScore}`, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: AppColors.textSecondary })
      .setOrigin(0.5),
  );
  if (isNewRecord) {
    y += 24;
    panel.add(
      scene.add
        .text(0, y, '⭐ Novo recorde!', { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: OkabeIto.yellow })
        .setOrigin(0.5),
    );
  }

  y += 46;
  if (onNext) {
    trackExtra(
      makeButton(scene, {
        x: centerX,
        y: centerY + y,
        width: 240,
        label: 'Próximo nível',
        bgColor: AppColors.accent,
        onClick: () => {
          close();
          onNext();
        },
      }),
    );
    y += 58;
  }
  trackExtra(
    makeButton(scene, {
      x: centerX,
      y: centerY + y,
      width: 240,
      label: 'Jogar de novo',
      bgColor: onNext ? OkabeIto.orange : AppColors.accent,
      onClick: () => {
        close();
        onPlayAgain();
      },
    }),
  );
  y += 58;
  trackExtra(
    makeButton(scene, {
      x: centerX,
      y: centerY + y,
      width: 240,
      label: 'Menu',
      filled: false,
      bgColor: AppColors.textSecondary,
      onClick: () => {
        close();
        onMenu();
      },
    }),
  );

  return close;
}

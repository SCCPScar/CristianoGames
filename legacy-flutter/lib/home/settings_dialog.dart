import 'package:flutter/material.dart';

import '../shared/storage.dart';

/// Minimal settings: sound on/off and haptics on/off. Nothing else — the
/// accessible design (color+icon redundancy) is always on for everyone, so
/// there is no toggle for it.
class SettingsDialog extends StatefulWidget {
  const SettingsDialog({super.key});

  @override
  State<SettingsDialog> createState() => _SettingsDialogState();
}

class _SettingsDialogState extends State<SettingsDialog> {
  bool _soundEnabled = true;
  bool _hapticsEnabled = true;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sound = await GameStorage.getSoundEnabled();
    final haptics = await GameStorage.getHapticsEnabled();
    if (!mounted) return;
    setState(() {
      _soundEnabled = sound;
      _hapticsEnabled = haptics;
      _loaded = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      icon: const Icon(Icons.settings, size: 36),
      title: const Text('Configurações'),
      content: _loaded
          ? Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.volume_up),
                  title: const Text('Som'),
                  value: _soundEnabled,
                  onChanged: (value) {
                    setState(() => _soundEnabled = value);
                    GameStorage.setSoundEnabled(value);
                  },
                ),
                SwitchListTile(
                  secondary: const Icon(Icons.vibration),
                  title: const Text('Vibração'),
                  value: _hapticsEnabled,
                  onChanged: (value) {
                    setState(() => _hapticsEnabled = value);
                    GameStorage.setHapticsEnabled(value);
                  },
                ),
              ],
            )
          : const SizedBox(
              height: 80,
              child: Center(child: CircularProgressIndicator()),
            ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Fechar'),
        ),
      ],
    );
  }
}

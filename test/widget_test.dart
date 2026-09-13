import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:arcade_do_pai/main.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Tela inicial mostra o título e os dois jogos', (tester) async {
    await tester.pumpWidget(const ArcadeDoPaiApp());
    await tester.pumpAndSettle();

    expect(find.text('Arcade do Pai'), findsOneWidget);
    expect(find.text('TETRIS'), findsOneWidget);
    expect(find.text('ZUMA'), findsOneWidget);

    await tester.pumpWidget(Container());
  });

  testWidgets('Abrir o Tetris mostra a pontuação e os controles', (tester) async {
    await tester.pumpWidget(const ArcadeDoPaiApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('TETRIS'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Pontos'), findsOneWidget);
    expect(find.byIcon(Icons.rotate_right), findsOneWidget);

    await tester.pumpWidget(Container());
  });

  testWidgets('Abrir o Zuma mostra a pontuação e o nível', (tester) async {
    await tester.pumpWidget(const ArcadeDoPaiApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('ZUMA'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Nível'), findsOneWidget);

    await tester.pumpWidget(Container());
  });
}

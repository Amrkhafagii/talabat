import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('TalabatButton renders label and responds to taps', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TalabatButton(
            label: 'Test CTA',
            onPressed: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Test CTA'), findsOneWidget);
    await tester.tap(find.text('Test CTA'));
    expect(tapped, isTrue);
  });
}

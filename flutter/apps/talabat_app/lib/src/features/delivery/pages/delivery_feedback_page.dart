import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class DeliveryFeedbackPage extends HookConsumerWidget {
  const DeliveryFeedbackPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rating = useState<double>(5);
    final notesController = useTextEditingController();

    Future<void> submit() async {
      await ref.read(analyticsServiceProvider).logEvent('delivery_feedback_submitted', parameters: {'rating': rating.value});
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback sent')));
        Navigator.pop(context);
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Delivery feedback')),
      body: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Slider(
              value: rating.value,
              min: 1,
              max: 5,
              divisions: 4,
              label: rating.value.toStringAsFixed(0),
              onChanged: (value) => rating.value = value,
            ),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()),
              maxLines: 4,
            ),
            const SizedBox(height: 16),
            TalabatButton(label: 'Submit', onPressed: submit),
          ],
        ),
      ),
    );
  }
}

import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../controllers/incident_queue_controller.dart';

class DeliveryIncidentPage extends HookConsumerWidget {
  const DeliveryIncidentPage({super.key, required this.deliveryId});

  final String deliveryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final category = useState('delay');
    final descriptionController = useTextEditingController();
    final loading = useState(false);

    Future<void> submit() async {
      loading.value = true;
      try {
        await ref.read(incidentQueueControllerProvider.notifier).submitIncident(
              deliveryId: deliveryId,
              category: category.value,
              description: descriptionController.text,
            );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Incident queued')));
          Navigator.pop(context);
        }
      } catch (err) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $err')));
      } finally {
        loading.value = false;
      }
    }

    final queueState = ref.watch(incidentQueueControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Report Incident')),
      body: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropdownButtonFormField<String>(
              value: category.value,
              items: const [
                DropdownMenuItem(value: 'delay', child: Text('Delay')),
                DropdownMenuItem(value: 'safety', child: Text('Safety')),
                DropdownMenuItem(value: 'other', child: Text('Other')),
              ],
              onChanged: (value) => category.value = value ?? 'delay',
              decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descriptionController,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
            ),
            if (queueState.offline)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('Offline – report will send later.', style: Theme.of(context).textTheme.bodySmall),
              ),
          ],
        ),
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.md),
        child: TalabatButton(
          label: loading.value ? 'Submitting...' : 'Submit incident',
          onPressed: loading.value ? null : submit,
        ),
      ),
    );
  }
}

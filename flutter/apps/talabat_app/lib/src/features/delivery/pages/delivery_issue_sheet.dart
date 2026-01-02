import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../controllers/incident_queue_controller.dart';

Future<void> showDeliveryIssueSheet(BuildContext context, {required String deliveryId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => DeliveryIssueSheet(deliveryId: deliveryId),
  );
}

class DeliveryIssueSheet extends HookConsumerWidget {
  const DeliveryIssueSheet({super.key, required this.deliveryId});

  final String deliveryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reason = useState(_reasons.first);
    final descriptionController = useTextEditingController();
    final submitting = useState(false);
    final queueState = ref.watch(incidentQueueControllerProvider);

    Future<void> submit() async {
      submitting.value = true;
      try {
        await ref.read(incidentQueueControllerProvider.notifier).submitIncident(
              deliveryId: deliveryId,
              category: reason.value,
              description: descriptionController.text,
            );
        if (context.mounted) Navigator.pop(context);
      } catch (err) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $err')));
      } finally {
        submitting.value = false;
      }
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(
        TalabatColors.spacing.lg,
        TalabatColors.spacing.lg,
        TalabatColors.spacing.lg,
        MediaQuery.of(context).viewInsets.bottom + TalabatColors.spacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Report issue', style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ],
          ),
          Wrap(
            spacing: 8,
            children: _reasons
                .map((option) => ChoiceChip(
                      label: Text(option),
                      selected: reason.value == option,
                      onSelected: (_) => reason.value = option,
                    ))
                .toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: descriptionController,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Details', border: OutlineInputBorder()),
          ),
          if (queueState.offline)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Offline mode: will upload once back online', style: Theme.of(context).textTheme.bodySmall),
            ),
          const SizedBox(height: 12),
          TalabatButton(label: submitting.value ? 'Submitting...' : 'Submit', onPressed: submitting.value ? null : submit),
        ],
      ),
    );
  }
}

const _reasons = ['Delay', 'Payment', 'Safety', 'Other'];

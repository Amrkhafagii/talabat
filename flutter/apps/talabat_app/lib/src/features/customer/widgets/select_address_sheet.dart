import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../controllers/address_book_controller.dart';

Future<UserAddress?> showSelectAddressSheet(BuildContext context) {
  return showModalBottomSheet<UserAddress>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const SelectAddressSheet(),
  );
}

class SelectAddressSheet extends ConsumerWidget {
  const SelectAddressSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(addressBookControllerProvider);
    return SafeArea(
      child: Padding(
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
                Text('Select address', style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (state.loading)
              const Center(child: CircularProgressIndicator())
            else if (state.addresses.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text('No saved addresses yet.'),
              )
            else
              ...state.addresses.map(
                (address) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(address.label),
                  subtitle: Text(address.addressLine1),
                  trailing: address.isDefault ? const Icon(Icons.check_circle, color: Colors.green) : null,
                  onTap: () async {
                    await ref.read(addressBookControllerProvider.notifier).setDefault(address);
                    if (context.mounted) {
                      Navigator.of(context).pop(address);
                    }
                  },
                ),
              ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () {
                  context.pop();
                  context.push('/customer/addresses/new');
                },
                icon: const Icon(Icons.add),
                label: const Text('Add new'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

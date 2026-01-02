import 'dart:typed_data';

import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:image_picker/image_picker.dart';

class PaymentProofPage extends HookConsumerWidget {
  const PaymentProofPage({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pickedFile = useState<_PickedFile?>(null);
    final reportedAmountController = useTextEditingController();
    final transactionController = useTextEditingController();
    final loading = useState(false);

    Future<void> selectFromGallery() async {
      final result = await FilePicker.platform.pickFiles(withData: true, allowedExtensions: ['png', 'jpg', 'jpeg', 'pdf'], type: FileType.custom);
      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        pickedFile.value = _PickedFile(bytes: file.bytes!, name: file.name, mimeType: file.mimeType ?? 'application/octet-stream');
      }
    }

    Future<void> capturePhoto() async {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.camera);
      if (image != null) {
        final bytes = await image.readAsBytes();
        pickedFile.value = _PickedFile(bytes: bytes, name: image.name, mimeType: 'image/jpeg');
      }
    }

    Future<void> submit() async {
      if (pickedFile.value == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a file first.')));
        return;
      }
      loading.value = true;
      try {
        await ref.read(paymentProofServiceProvider).submitPaymentProof(
              orderId: orderId,
              transactionId: transactionController.text.isEmpty ? 'manual-${DateTime.now().millisecondsSinceEpoch}' : transactionController.text,
              reportedAmount: double.tryParse(reportedAmountController.text) ?? 0,
              bytes: pickedFile.value!.bytes,
              contentType: pickedFile.value!.mimeType,
            );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment proof submitted')));
          context.pop();
        }
      } catch (err) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to submit proof: $err')));
      } finally {
        loading.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Payment Proof')),
      body: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.lg),
        child: Column(
          children: [
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Attach your transfer receipt.', style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TalabatButton(
                          label: 'Pick file',
                          onPressed: selectFromGallery,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TalabatButton(
                          label: 'Take photo',
                          onPressed: capturePhoto,
                        ),
                      ),
                    ],
                  ),
                  if (pickedFile.value != null) ...[
                    const SizedBox(height: 12),
                    Text('Selected: ${pickedFile.value!.name}'),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reportedAmountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Reported amount', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: transactionController,
              decoration: const InputDecoration(labelText: 'Transaction ID (optional)', border: OutlineInputBorder()),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.md),
        child: TalabatButton(
          label: loading.value ? 'Submitting...' : 'Submit',
          onPressed: loading.value ? null : submit,
        ),
      ),
    );
  }
}

class _PickedFile {
  _PickedFile({required this.bytes, required this.name, required this.mimeType});

  final Uint8List bytes;
  final String name;
  final String mimeType;
}

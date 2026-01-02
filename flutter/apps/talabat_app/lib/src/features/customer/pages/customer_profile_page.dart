import 'dart:typed_data';

import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final customerProfileProvider = FutureProvider<CustomerProfile>((ref) async {
  final userId = ref.watch(authStateProvider).user?.id;
  if (userId == null) throw Exception('Not authenticated');
  return ref.watch(customerProfileRepositoryProvider).fetchProfile(userId);
});

class CustomerProfilePage extends HookConsumerWidget {
  const CustomerProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(customerProfileProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: profileAsync.when(
        data: (profile) => _ProfileForm(profile: profile),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load profile: $err')),
      ),
    );
  }
}

class _ProfileForm extends HookConsumerWidget {
  const _ProfileForm({required this.profile});

  final CustomerProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final nameController = useTextEditingController(text: profile.name);
    final phoneController = useTextEditingController(text: profile.phone);
    final loading = useState(false);
    final avatarBytes = useState<Uint8List?>(null);
    final avatarUrl = useState<String?>(profile.avatarUrl);
    final analytics = ref.watch(analyticsServiceProvider);

    Future<void> save() async {
      if (nameController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Name is required.')));
        return;
      }
      loading.value = true;
      try {
        var uploadedAvatar = avatarUrl.value;
        final userId = profile.id;
        if (avatarBytes.value != null) {
          uploadedAvatar = await ref.read(customerProfileRepositoryProvider).uploadAvatar(
                userId: userId,
                bytes: avatarBytes.value!,
              );
        }
        await ref.read(customerProfileRepositoryProvider).updateProfile(
              userId,
              CustomerProfileUpdate(
                name: nameController.text,
                phone: phoneController.text,
                avatarUrl: uploadedAvatar,
              ),
            );
        await ref.read(authRefreshProvider)();
        await analytics.logEvent('profile_updated');
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
        }
        ref.invalidate(customerProfileProvider);
      } catch (err) {
        await analytics.logEvent('profile_update_failed', parameters: {'error': err.toString()});
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update profile: $err')));
      } finally {
        loading.value = false;
      }
    }

    Future<void> pickAvatar() async {
      final result = await FilePicker.platform.pickFiles(withData: true, type: FileType.image);
      if (result?.files.isEmpty ?? true) return;
      avatarBytes.value = result!.files.single.bytes;
      avatarUrl.value = null;
    }

    return ListView(
      padding: EdgeInsets.all(TalabatColors.spacing.lg),
      children: [
        Center(
          child: Stack(
            children: [
              CircleAvatar(
                radius: 48,
                backgroundImage: avatarBytes.value != null
                    ? MemoryImage(avatarBytes.value!)
                    : (avatarUrl.value != null && avatarUrl.value!.isNotEmpty)
                        ? NetworkImage(avatarUrl.value!)
                        : null,
                child: avatarBytes.value == null && (avatarUrl.value == null || avatarUrl.value!.isEmpty)
                    ? Text(profile.name.isNotEmpty ? profile.name.substring(0, 1).toUpperCase() : '?')
                    : null,
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: FloatingActionButton.small(
                  heroTag: 'avatar',
                  onPressed: pickAvatar,
                  child: const Icon(Icons.edit),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text('Email', style: Theme.of(context).textTheme.bodySmall),
        Text(profile.email, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 16),
        TextField(
          controller: nameController,
          decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Phone number', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 24),
        TalabatButton(label: loading.value ? 'Saving...' : 'Save changes', onPressed: loading.value ? null : save),
      ],
    );
  }
}

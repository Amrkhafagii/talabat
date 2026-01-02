import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class LoginPage extends HookConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final emailController = useTextEditingController();
    final passwordController = useTextEditingController();
    final errorText = useState<String?>(null);
    final loading = useState(false);

    Future<void> handleSignIn() async {
      errorText.value = null;
      loading.value = true;
      try {
        await ref.read(authControllerProvider).signIn(
              email: emailController.text.trim(),
              password: passwordController.text,
            );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Signed in successfully')),
          );
        }
      } catch (err) {
        errorText.value = err.toString();
      } finally {
        loading.value = false;
      }
    }

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Welcome back', style: Theme.of(context).textTheme.displayMedium),
              const SizedBox(height: 8),
              Text('Sign in to continue ordering your favorites.', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              TalabatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _LabeledField(
                      label: 'Email',
                      child: TextField(
                        controller: emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'you@email.com'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _LabeledField(
                      label: 'Password',
                      child: TextField(
                        controller: passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '••••••••'),
                      ),
                    ),
                    if (errorText.value != null) ...[
                      const SizedBox(height: 12),
                      Text(errorText.value!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 24),
                    TalabatButton(
                      label: loading.value ? 'Signing in...' : 'Sign in',
                      onPressed: loading.value ? null : handleSignIn,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.push('/signup'),
                child: const Text('New here? Create an account'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}

import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class SignupPage extends HookConsumerWidget {
  const SignupPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final emailController = useTextEditingController();
    final passwordController = useTextEditingController();
    final confirmController = useTextEditingController();
    final role = useState(UserRole.customer);
    final errorText = useState<String?>(null);
    final loading = useState(false);

    Future<void> handleSignup() async {
      if (passwordController.text != confirmController.text) {
        errorText.value = 'Passwords do not match';
        return;
      }
      errorText.value = null;
      loading.value = true;
      try {
        await ref.read(authControllerProvider).signUp(
              email: emailController.text.trim(),
              password: passwordController.text,
              userRole: role.value,
            );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Account created. Please verify your email.')),
          );
          context.pop();
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
              Text('Create account', style: Theme.of(context).textTheme.displayMedium),
              const SizedBox(height: 8),
              Text('Join Talabat as a customer, restaurant, or delivery partner.', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              TalabatCard(
                child: Column(
                  children: [
                    _LabeledField(
                      label: 'Email',
                      child: TextField(
                        controller: emailController,
                        decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'you@email.com'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _LabeledField(
                      label: 'Password',
                      child: TextField(
                        controller: passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _LabeledField(
                      label: 'Confirm Password',
                      child: TextField(
                        controller: confirmController,
                        obscureText: true,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _LabeledField(
                      label: 'Account Type',
                      child: DropdownButtonFormField<UserRole>(
                        value: role.value,
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: UserRole.customer, child: Text('Customer')),
                          DropdownMenuItem(value: UserRole.restaurant, child: Text('Restaurant')),
                          DropdownMenuItem(value: UserRole.delivery, child: Text('Delivery Partner')),
                        ],
                        onChanged: (value) => role.value = value ?? UserRole.customer,
                      ),
                    ),
                    if (errorText.value != null) ...[
                      const SizedBox(height: 12),
                      Text(errorText.value!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 24),
                    TalabatButton(
                      label: loading.value ? 'Creating account...' : 'Sign up',
                      onPressed: loading.value ? null : handleSignup,
                    ),
                  ],
                ),
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

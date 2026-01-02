import 'package:app_services/app_services.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class IncidentQueueState {
  const IncidentQueueState({this.offline = false, this.pending = const []});

  final bool offline;
  final List<PendingIncident> pending;

  IncidentQueueState copyWith({bool? offline, List<PendingIncident>? pending}) {
    return IncidentQueueState(
      offline: offline ?? this.offline,
      pending: pending ?? this.pending,
    );
  }
}

class PendingIncident {
  const PendingIncident({required this.deliveryId, required this.category, required this.description});

  final String deliveryId;
  final String category;
  final String description;
}

final incidentQueueControllerProvider = StateNotifierProvider<IncidentQueueController, IncidentQueueState>((ref) {
  return IncidentQueueController(ref);
});

class IncidentQueueController extends StateNotifier<IncidentQueueState> {
  IncidentQueueController(this._ref) : super(const IncidentQueueState());

  final Ref _ref;

  void toggleOffline(bool offline) {
    state = state.copyWith(offline: offline);
    if (!offline) {
      _flushPending();
    }
  }

  Future<void> submitIncident({required String deliveryId, required String category, required String description}) async {
    if (state.offline) {
      state = state.copyWith(pending: [...state.pending, PendingIncident(deliveryId: deliveryId, category: category, description: description)]);
      return;
    }
    await _sendIncident(deliveryId: deliveryId, category: category, description: description);
  }

  Future<void> _flushPending() async {
    for (final incident in state.pending) {
      await _sendIncident(deliveryId: incident.deliveryId, category: incident.category, description: incident.description);
    }
    state = state.copyWith(pending: []);
  }

  Future<void> _sendIncident({required String deliveryId, required String category, required String description}) async {
    try {
      await _ref.read(deliveryRepositoryProvider).logIncident(deliveryId: deliveryId, category: category, description: description);
      await _ref.read(analyticsServiceProvider).logEvent('delivery_incident_submitted');
    } catch (err, stack) {
      await _ref.read(analyticsServiceProvider).recordCrash(error: err, stack: stack, context: 'delivery_incident_error');
      rethrow;
    }
  }
}

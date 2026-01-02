class DeliveryJob {
  const DeliveryJob({
    required this.id,
    required this.status,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.orderId,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
  });

  final String id;
  final String status;
  final String pickupAddress;
  final String dropoffAddress;
  final String orderId;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;

  factory DeliveryJob.fromJson(Map<String, dynamic> json) {
    return DeliveryJob(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'assigned',
      pickupAddress: json['pickup_address'] as String? ?? '',
      dropoffAddress: json['delivery_address'] as String? ?? '',
      orderId: json['order_id'] as String? ?? '',
      pickupLat: (json['pickup_latitude'] as num?)?.toDouble(),
      pickupLng: (json['pickup_longitude'] as num?)?.toDouble(),
      dropoffLat: (json['delivery_latitude'] as num?)?.toDouble(),
      dropoffLng: (json['delivery_longitude'] as num?)?.toDouble(),
    );
  }
}

class CashReconciliationEntry {
  const CashReconciliationEntry({required this.orderId, required this.amount, required this.status});

  final String orderId;
  final double amount;
  final String status;

  factory CashReconciliationEntry.fromJson(Map<String, dynamic> json) {
    return CashReconciliationEntry(
      orderId: json['order_id'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      status: json['status'] as String? ?? 'pending',
    );
  }
}

class EarningsSummary {
  const EarningsSummary({required this.weekTotal, required this.pendingPayouts, required this.entries});

  final double weekTotal;
  final double pendingPayouts;
  final List<LifetimeLedgerEntry> entries;

  factory EarningsSummary.fromJson(Map<String, dynamic> json) {
    return EarningsSummary(
      weekTotal: (json['week_total'] as num?)?.toDouble() ?? 0,
      pendingPayouts: (json['pending_payouts'] as num?)?.toDouble() ?? 0,
      entries: (json['entries'] as List? ?? [])
          .map((row) => LifetimeLedgerEntry.fromJson(row as Map<String, dynamic>))
          .toList(),
    );
  }
}

class LifetimeLedgerEntry {
  const LifetimeLedgerEntry({required this.label, required this.amount, required this.createdAt});

  final String label;
  final double amount;
  final DateTime createdAt;

  factory LifetimeLedgerEntry.fromJson(Map<String, dynamic> json) {
    return LifetimeLedgerEntry(
      label: json['label'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class DeliveryHistoryEntry {
  const DeliveryHistoryEntry({required this.id, required this.total, required this.completedAt, required this.status});

  final String id;
  final double total;
  final DateTime completedAt;
  final String status;

  factory DeliveryHistoryEntry.fromJson(Map<String, dynamic> json) {
    return DeliveryHistoryEntry(
      id: json['id'] as String,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      completedAt: DateTime.tryParse(json['completed_at'] as String? ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? 'delivered',
    );
  }
}

class DriverProfile {
  const DriverProfile({required this.driverId, required this.name, required this.vehicle, required this.available, required this.documents});

  final String driverId;
  final String name;
  final String vehicle;
  final bool available;
  final List<DriverDocument> documents;

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    return DriverProfile(
      driverId: json['driver_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      vehicle: json['vehicle'] as String? ?? '',
      available: json['available'] as bool? ?? false,
      documents: (json['documents'] as List? ?? [])
          .map((doc) => DriverDocument.fromJson(doc as Map<String, dynamic>))
          .toList(),
    );
  }
}

class DriverDocument {
  const DriverDocument({required this.name, required this.status});

  final String name;
  final String status;

  factory DriverDocument.fromJson(Map<String, dynamic> json) {
    return DriverDocument(
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
    );
  }
}

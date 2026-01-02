class AdminTotals {
  const AdminTotals({required this.totalCustomerPaid, required this.platformFee, required this.paidOrders});

  final double totalCustomerPaid;
  final double platformFee;
  final int paidOrders;

  factory AdminTotals.fromJson(Map<String, dynamic> json) {
    return AdminTotals(
      totalCustomerPaid: (json['total_customer_paid'] as num?)?.toDouble() ?? 0,
      platformFee: (json['total_platform_fee'] as num?)?.toDouble() ?? 0,
      paidOrders: (json['paid_orders'] as num?)?.toInt() ?? 0,
    );
  }
}

class AdminQueueCounts {
  const AdminQueueCounts({required this.paymentReview, required this.photoReview, required this.support});

  final int paymentReview;
  final int photoReview;
  final int support;

  factory AdminQueueCounts.fromJson(Map<String, dynamic> json) {
    return AdminQueueCounts(
      paymentReview: json['payment_review'] as int? ?? 0,
      photoReview: json['photo_review'] as int? ?? 0,
      support: json['support'] as int? ?? 0,
    );
  }
}

class ProfitBreakdown {
  const ProfitBreakdown({required this.name, required this.value, this.email});

  final String name;
  final double value;
  final String? email;

  factory ProfitBreakdown.fromJson(Map<String, dynamic> json) {
    return ProfitBreakdown(
      name: json['full_name'] as String? ?? json['restaurant_name'] as String? ?? 'Unknown',
      value: (json['net_driver_profit'] as num? ?? json['net_restaurant_profit'] as num? ?? 0).toDouble(),
      email: json['email'] as String? ?? json['owner_email'] as String?,
    );
  }
}

class AdminOrderRow {
  const AdminOrderRow({required this.id, required this.status, required this.customerName, required this.slaMinutes});

  final String id;
  final String status;
  final String customerName;
  final int slaMinutes;

  factory AdminOrderRow.fromJson(Map<String, dynamic> json) {
    return AdminOrderRow(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'pending',
      customerName: json['customer_name'] as String? ?? '',
      slaMinutes: json['sla_minutes'] as int? ?? 0,
    );
  }
}

class AdminPayoutRow {
  const AdminPayoutRow({required this.id, required this.userName, required this.amount, required this.status});

  final String id;
  final String userName;
  final double amount;
  final String status;

  factory AdminPayoutRow.fromJson(Map<String, dynamic> json) {
    return AdminPayoutRow(
      id: json['id'] as String,
      userName: json['user_name'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      status: json['status'] as String? ?? 'pending',
    );
  }
}

class AdminReviewItem {
  const AdminReviewItem({required this.id, required this.subject, required this.type, required this.url});

  final String id;
  final String subject;
  final String type;
  final String url;

  factory AdminReviewItem.fromJson(Map<String, dynamic> json) {
    return AdminReviewItem(
      id: json['id'] as String,
      subject: json['subject'] as String? ?? '',
      type: json['type'] as String? ?? 'photo',
      url: json['url'] as String? ?? '',
    );
  }
}

class AdminFeatureFlag {
  const AdminFeatureFlag({required this.key, required this.enabled, this.description});

  final String key;
  final bool enabled;
  final String? description;

  factory AdminFeatureFlag.fromJson(Map<String, dynamic> json) {
    return AdminFeatureFlag(
      key: json['key'] as String,
      enabled: json['enabled'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }
}

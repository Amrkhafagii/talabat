class RestaurantOrder {
  const RestaurantOrder({
    required this.id,
    required this.status,
    required this.customerName,
    required this.total,
    required this.createdAt,
    required this.items,
  });

  final String id;
  final String status;
  final String customerName;
  final double total;
  final DateTime createdAt;
  final List<OrderLineItem> items;

  factory RestaurantOrder.fromJson(Map<String, dynamic> json) {
    final items = (json['order_items'] as List? ?? [])
        .map((item) => OrderLineItem.fromJson(item as Map<String, dynamic>))
        .toList();
    return RestaurantOrder(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'pending',
      customerName: json['user']?['full_name'] as String? ?? 'Customer',
      total: (json['total'] as num?)?.toDouble() ?? 0,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      items: items,
    );
  }
}

class OrderLineItem {
  const OrderLineItem({required this.name, required this.quantity});

  final String name;
  final int quantity;

  factory OrderLineItem.fromJson(Map<String, dynamic> json) {
    return OrderLineItem(
      name: json['menu_item']?['name'] as String? ?? json['name'] as String? ?? 'Item',
      quantity: json['quantity'] as int? ?? 1,
    );
  }
}

class MenuEditorItem {
  const MenuEditorItem({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.description,
    required this.price,
    required this.image,
    required this.isAvailable,
  });

  final String id;
  final String restaurantId;
  final String name;
  final String description;
  final double price;
  final String image;
  final bool isAvailable;

  factory MenuEditorItem.fromJson(Map<String, dynamic> json) {
    return MenuEditorItem(
      id: json['id'] as String,
      restaurantId: json['restaurant_id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      image: json['image'] as String? ?? '',
      isAvailable: json['is_available'] as bool? ?? true,
    );
  }
}

class KycStatusModel {
  const KycStatusModel({required this.status, this.notes});

  final String status;
  final String? notes;

  factory KycStatusModel.fromJson(Map<String, dynamic> json) {
    return KycStatusModel(
      status: json['status'] as String? ?? 'pending',
      notes: json['notes'] as String?,
    );
  }
}

class RestaurantPerformanceSummary {
  const RestaurantPerformanceSummary({
    required this.fulfillmentRate,
    required this.averagePrepMinutes,
    required this.ordersToday,
    required this.trustedArrivalTrend,
  });

  final double fulfillmentRate;
  final double averagePrepMinutes;
  final int ordersToday;
  final List<MetricPoint> trustedArrivalTrend;

  factory RestaurantPerformanceSummary.fromJson(Map<String, dynamic> json) {
    return RestaurantPerformanceSummary(
      fulfillmentRate: (json['fulfillment_rate'] as num?)?.toDouble() ?? 0,
      averagePrepMinutes: (json['avg_prep_minutes'] as num?)?.toDouble() ?? 0,
      ordersToday: json['orders_today'] as int? ?? 0,
      trustedArrivalTrend: (json['trusted_arrival_trend'] as List? ?? [])
          .map((row) => MetricPoint.fromJson(row as Map<String, dynamic>))
          .toList(),
    );
  }
}

class MetricPoint {
  const MetricPoint({required this.label, required this.value});

  final DateTime label;
  final double value;

  factory MetricPoint.fromJson(Map<String, dynamic> json) {
    return MetricPoint(
      label: DateTime.tryParse(json['bucket'] as String? ?? '') ?? DateTime.now(),
      value: (json['value'] as num?)?.toDouble() ?? 0,
    );
  }
}

class RestaurantCategory {
  const RestaurantCategory({required this.id, required this.name, required this.sortOrder});

  final String id;
  final String name;
  final int sortOrder;

  factory RestaurantCategory.fromJson(Map<String, dynamic> json) {
    return RestaurantCategory(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      sortOrder: json['sort_order'] as int? ?? 0,
    );
  }

  RestaurantCategory copyWith({String? name, int? sortOrder}) {
    return RestaurantCategory(id: id, name: name ?? this.name, sortOrder: sortOrder ?? this.sortOrder);
  }
}

class RestaurantOrderDetail {
  const RestaurantOrderDetail({
    required this.id,
    required this.status,
    required this.timeline,
    required this.customerName,
    required this.customerPhone,
    required this.items,
    required this.total,
    this.driverName,
  });

  final String id;
  final String status;
  final List<RestaurantTimelineEntry> timeline;
  final String customerName;
  final String customerPhone;
  final List<OrderLineItem> items;
  final double total;
  final String? driverName;

  factory RestaurantOrderDetail.fromJson(Map<String, dynamic> json) {
    return RestaurantOrderDetail(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'pending',
      timeline: (json['timeline'] as List? ?? [])
          .map((row) => RestaurantTimelineEntry.fromJson(row as Map<String, dynamic>))
          .toList(),
      customerName: json['customer_name'] as String? ?? '',
      customerPhone: json['customer_phone'] as String? ?? '',
      items: (json['items'] as List? ?? [])
          .map((item) => OrderLineItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num?)?.toDouble() ?? 0,
      driverName: json['driver_name'] as String?,
    );
  }
}

class RestaurantTimelineEntry {
  const RestaurantTimelineEntry({required this.label, required this.timestamp, required this.completed});

  final String label;
  final DateTime? timestamp;
  final bool completed;

  factory RestaurantTimelineEntry.fromJson(Map<String, dynamic> json) {
    return RestaurantTimelineEntry(
      label: json['label'] as String? ?? '',
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? ''),
      completed: json['completed'] as bool? ?? false,
    );
  }
}

class RestaurantSettings {
  const RestaurantSettings({
    required this.restaurantId,
    required this.hours,
    required this.latitude,
    required this.longitude,
    required this.staff,
  });

  final String restaurantId;
  final Map<String, HoursRange> hours;
  final double? latitude;
  final double? longitude;
  final List<StaffMember> staff;

  factory RestaurantSettings.fromJson(Map<String, dynamic> json) {
    final hoursMap = <String, HoursRange>{};
    final hoursJson = json['hours'] as Map<String, dynamic>? ?? {};
    hoursJson.forEach((key, value) {
      hoursMap[key] = HoursRange.fromJson(value as Map<String, dynamic>);
    });
    return RestaurantSettings(
      restaurantId: json['restaurant_id'] as String? ?? '',
      hours: hoursMap,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      staff: (json['staff'] as List? ?? [])
          .map((row) => StaffMember.fromJson(row as Map<String, dynamic>))
          .toList(),
    );
  }

  RestaurantSettings copyWith({
    Map<String, HoursRange>? hours,
    double? latitude,
    double? longitude,
    List<StaffMember>? staff,
  }) {
    return RestaurantSettings(
      restaurantId: restaurantId,
      hours: hours ?? this.hours,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      staff: staff ?? this.staff,
    );
  }
}

class HoursRange {
  const HoursRange({required this.open, required this.close});

  final String open;
  final String close;

  factory HoursRange.fromJson(Map<String, dynamic> json) {
    return HoursRange(
      open: json['open'] as String? ?? '08:00',
      close: json['close'] as String? ?? '22:00',
    );
  }

  Map<String, dynamic> toJson() => {'open': open, 'close': close};
}

class StaffMember {
  const StaffMember({required this.name, required this.email, required this.status});

  final String name;
  final String email;
  final String status;

  factory StaffMember.fromJson(Map<String, dynamic> json) {
    return StaffMember(
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
    );
  }
}

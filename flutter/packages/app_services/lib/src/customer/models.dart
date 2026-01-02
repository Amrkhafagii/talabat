class CategoryModel {
  const CategoryModel({required this.id, required this.name, required this.emoji});

  final String id;
  final String name;
  final String emoji;

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      emoji: json['emoji'] as String? ?? '🍽',
    );
  }
}

class RestaurantModel {
  const RestaurantModel({
    required this.id,
    required this.name,
    required this.cuisine,
    required this.image,
    required this.rating,
    required this.deliveryFee,
    required this.deliveryTime,
    required this.isPromoted,
    this.distanceKm,
  });

  final String id;
  final String name;
  final String cuisine;
  final String image;
  final double rating;
  final double deliveryFee;
  final double deliveryTime;
  final bool isPromoted;
  final double? distanceKm;

  factory RestaurantModel.fromJson(Map<String, dynamic> json) {
    return RestaurantModel(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      cuisine: json['cuisine'] as String? ?? '',
      image: json['image'] as String? ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      deliveryFee: (json['delivery_fee'] as num?)?.toDouble() ?? 0,
      deliveryTime: _parseDeliveryTime(json['delivery_time']),
      isPromoted: json['is_promoted'] as bool? ?? false,
      distanceKm: (json['distance_km'] as num?)?.toDouble(),
    );
  }
}

class MenuItemModel {
  const MenuItemModel({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.description,
    required this.price,
    required this.image,
    this.category,
    this.preparationTime,
  });

  final String id;
  final String restaurantId;
  final String name;
  final String description;
  final double price;
  final String image;
  final String? category;
  final double? preparationTime;

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    return MenuItemModel(
      id: json['id'] as String,
      restaurantId: json['restaurant_id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      image: json['image'] as String? ?? '',
      category: json['category'] as String?,
      preparationTime: (json['preparation_time'] as num?)?.toDouble(),
    );
  }
}

double _parseDeliveryTime(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) {
    final parsed = double.tryParse(value);
    if (parsed != null) return parsed;
  }
  return 20;
}

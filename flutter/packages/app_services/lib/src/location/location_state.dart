class Coordinates {
  const Coordinates({required this.latitude, required this.longitude});
  final double latitude;
  final double longitude;
}

class UserAddress {
  const UserAddress({
    required this.id,
    required this.label,
    required this.addressLine1,
    this.addressLine2,
    this.city,
    this.state,
    this.country,
    this.isDefault = false,
    this.latitude,
    this.longitude,
  });

  final String id;
  final String label;
  final String addressLine1;
  final String? addressLine2;
  final String? city;
  final String? state;
  final String? country;
  final bool isDefault;
  final double? latitude;
  final double? longitude;

  factory UserAddress.fromJson(Map<String, dynamic> json) {
    return UserAddress(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
      addressLine1: json['address_line_1'] as String? ?? '',
      addressLine2: json['address_line_2'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      country: json['country'] as String?,
      isDefault: json['is_default'] as bool? ?? false,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }
}

class LocationState {
  const LocationState({
    this.coords,
    this.selectedAddress,
    this.loading = false,
    this.error,
  });

  final Coordinates? coords;
  final UserAddress? selectedAddress;
  final bool loading;
  final String? error;

  LocationState copyWith({
    Coordinates? coords,
    UserAddress? selectedAddress,
    bool? loading,
    String? error,
  }) {
    return LocationState(
      coords: coords ?? this.coords,
      selectedAddress: selectedAddress ?? this.selectedAddress,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

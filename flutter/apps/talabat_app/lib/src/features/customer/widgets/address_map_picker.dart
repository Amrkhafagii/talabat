import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class AddressMapPicker extends StatefulWidget {
  const AddressMapPicker({
    super.key,
    this.initialCoords,
    this.currentLocation,
    this.onRequestGps,
    required this.onLocationChanged,
    this.enableMap = true,
  });

  final Coordinates? initialCoords;
  final Coordinates? currentLocation;
  final VoidCallback? onRequestGps;
  final ValueChanged<Coordinates> onLocationChanged;
  final bool enableMap;

  @override
  State<AddressMapPicker> createState() => _AddressMapPickerState();
}

class _AddressMapPickerState extends State<AddressMapPicker> {
  Coordinates? _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.initialCoords;
  }

  @override
  void didUpdateWidget(covariant AddressMapPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialCoords != oldWidget.initialCoords && widget.initialCoords != null) {
      _selected = widget.initialCoords;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 220,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(TalabatColors.radius.lg),
            child: _supportsMap
                ? GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(_selected?.latitude ?? 30.0444, _selected?.longitude ?? 31.2357),
                      zoom: 13,
                    ),
                    markers: {
                      if (_selected != null)
                        Marker(
                          markerId: const MarkerId('selected'),
                          position: LatLng(_selected!.latitude, _selected!.longitude),
                        ),
                    },
                    onTap: (latLng) {
                      final coords = Coordinates(latitude: latLng.latitude, longitude: latLng.longitude);
                      setState(() => _selected = coords);
                      widget.onLocationChanged(coords);
                    },
                    myLocationButtonEnabled: false,
                    compassEnabled: false,
                    zoomControlsEnabled: false,
                  )
                : _PlaceholderMap(coords: _selected),
          ),
        ),
        const SizedBox(height: 8),
        if (widget.currentLocation != null)
          Wrap(
            spacing: 8,
            children: [
              ActionChip(
                avatar: const Icon(Icons.my_location, size: 18),
                label: const Text('Use GPS pin'),
                onPressed: () {
                  final coords = widget.currentLocation!;
                  setState(() => _selected = coords);
                  widget.onLocationChanged(coords);
                },
              ),
              if (widget.onRequestGps != null)
                TextButton.icon(
                  onPressed: widget.onRequestGps,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Refresh GPS'),
                ),
            ],
          ),
        const SizedBox(height: 8),
        Text(
          _selected != null
              ? 'Lat ${_selected!.latitude.toStringAsFixed(5)}, Lng ${_selected!.longitude.toStringAsFixed(5)}'
              : 'Tap map to drop a pin',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  bool get _supportsMap {
    if (!widget.enableMap) return false;
    if (kIsWeb) return false;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
      case TargetPlatform.iOS:
        return true;
      default:
        return false;
    }
  }
}

class _PlaceholderMap extends StatelessWidget {
  const _PlaceholderMap({this.coords});

  final Coordinates? coords;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(TalabatColors.radius.lg),
      ),
      child: Center(
        child: Text(
          coords != null
              ? 'Lat ${coords!.latitude.toStringAsFixed(4)}, Lng ${coords!.longitude.toStringAsFixed(4)}'
              : 'Map preview unavailable',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }
}

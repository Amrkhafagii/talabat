class EtaBand {
  EtaBand({
    required this.etaMinutes,
    required this.etaLowMinutes,
    required this.etaHighMinutes,
    required this.trusted,
  });

  final int etaMinutes;
  final int etaLowMinutes;
  final int etaHighMinutes;
  final bool trusted;
}

EtaBand computeEtaBand({
  required int prepP50Minutes,
  required int prepP90Minutes,
  required int bufferMinutes,
  required int travelMinutes,
  double reliabilityScore = 0.9,
}) {
  final prep = _clamp(prepP50Minutes, 8, 90);
  final prepHigh = _clamp(prepP90Minutes, prep + 4, 120);
  final travel = _clamp(travelMinutes, 4, 60);
  final buffer = _clamp(bufferMinutes, 2, 20);
  final etaLow = prep + travel;
  final etaHigh = prepHigh + travel + buffer;
  final eta = ((etaLow + etaHigh) / 2).round();
  final trusted = reliabilityScore >= 0.7 && etaHigh - etaLow <= 40;
  return EtaBand(
    etaMinutes: eta,
    etaLowMinutes: etaLow,
    etaHighMinutes: etaHigh,
    trusted: trusted,
  );
}

int _clamp(int value, int min, int max) => value < min ? min : (value > max ? max : value);

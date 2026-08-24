import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_theme.dart';
import '../core/custom_widgets.dart';

class ParsedPinToken {
  final String pin;
  final String? serial;
  final String raw;

  ParsedPinToken({required this.pin, this.serial, required this.raw});
}

List<ParsedPinToken> parsePinTokens(String? rawContent) {
  if (rawContent == null || rawContent.trim().isEmpty) return [];

  // Split by pipe or newlines
  final blocks = rawContent
      .split(RegExp(r'\s*\|\s*|\n+'))
      .where((s) => s.trim().isNotEmpty)
      .toList();
  final List<ParsedPinToken> parsed = [];

  for (final block in blocks) {
    final trimmed = block.trim();
    if (trimmed.isEmpty) continue;

    // 1. Check for explicit PIN and SERIAL labels
    final pinMatch = RegExp(
      r'(?:PIN|TOKEN|Pin|Token)\s*[:=\-]?\s*([A-Za-z0-9]+)',
      caseSensitive: false,
    ).firstMatch(trimmed);
    final serialMatch = RegExp(
      r'(?:SERIAL|SERIALNO|SERIAL\s*NO|S\/N|Serial|SerialNo|S\/No)\s*[:=\-]?\s*([A-Za-z0-9]+)',
      caseSensitive: false,
    ).firstMatch(trimmed);

    if (pinMatch != null && serialMatch != null) {
      parsed.add(ParsedPinToken(
        pin: pinMatch.group(1)!,
        serial: serialMatch.group(1)!,
        raw: trimmed,
      ));
      continue;
    }

    if (pinMatch != null && serialMatch == null) {
      parsed.add(ParsedPinToken(
        pin: pinMatch.group(1)!,
        serial: null,
        raw: trimmed,
      ));
      continue;
    }

    // 2. Comma, slash, or dash separated: e.g. "458129841203, WRN2024192841"
    final parts = trimmed
        .split(RegExp(r'[\/,\-]+'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    if (parts.length == 2) {
      final p1 = parts[0];
      final p2 = parts[1];
      if (RegExp(r'^[A-Za-z]').hasMatch(p2) || p1.length >= p2.length) {
        parsed.add(ParsedPinToken(pin: p1, serial: p2, raw: trimmed));
      } else if (RegExp(r'^[A-Za-z]').hasMatch(p1)) {
        parsed.add(ParsedPinToken(pin: p2, serial: p1, raw: trimmed));
      } else {
        parsed.add(ParsedPinToken(pin: p1, serial: p2, raw: trimmed));
      }
      continue;
    }

    // 3. Fallback single PIN
    parsed.add(ParsedPinToken(
      pin: trimmed.replaceAll(
        RegExp(r'^(?:PIN|TOKEN)\s*[:=\-]?\s*', caseSensitive: false),
        '',
      ),
      serial: null,
      raw: trimmed,
    ));
  }

  return parsed;
}

class PinDisplayWidget extends StatelessWidget {
  final String pinContent;
  final String title;

  const PinDisplayWidget({
    super.key,
    required this.pinContent,
    this.title = 'Purchased PIN Details',
  });

  void _copy(BuildContext context, String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    AppToast.show(context, message: '$label copied to clipboard', type: ToastType.success);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = parsePinTokens(pinContent);
    if (tokens.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827), // Dark slate/gray-900 background
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.vpn_key_rounded, size: 14, color: AppTheme.secondaryColor),
                  const SizedBox(width: 6),
                  Text(
                    title.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white70,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              if (tokens.isNotEmpty)
                GestureDetector(
                  onTap: () => _copy(context, pinContent, 'All PIN details'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white10,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.copy_rounded, size: 11, color: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'Copy All',
                          style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Token Items
          ...tokens.asMap().entries.map((entry) {
            final idx = entry.key;
            final token = entry.value;
            final isDual = token.serial != null;

            return Container(
              margin: EdgeInsets.only(bottom: idx == tokens.length - 1 ? 0 : 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF1F2937),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (tokens.length > 1) ...[
                    Text(
                      'TOKEN #${idx + 1}',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.white54,
                      ),
                    ),
                    const SizedBox(height: 6),
                  ],

                  if (isDual) ...[
                    // PIN ROW
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF111827),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'PIN (USE FOR LOGIN)',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white54,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                SelectableText(
                                  token.pin,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    letterSpacing: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 16, color: Colors.white70),
                            onPressed: () => _copy(context, token.pin, 'PIN'),
                            tooltip: 'Copy PIN',
                            constraints: const BoxConstraints(),
                            padding: const EdgeInsets.all(6),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),

                    // SERIAL ROW
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF111827),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'SERIAL NUMBER',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFFBBF24), // Amber/Yellow
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                SelectableText(
                                  token.serial!,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFFEF3C7), // Light amber
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFFFBBF24)),
                            onPressed: () => _copy(context, token.serial!, 'Serial Number'),
                            tooltip: 'Copy Serial Number',
                            constraints: const BoxConstraints(),
                            padding: const EdgeInsets.all(6),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    // SINGLE PIN (e.g. NECO)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF111827),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'TOKEN / PIN',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white54,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                SelectableText(
                                  token.pin,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    letterSpacing: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 16, color: Colors.white70),
                            onPressed: () => _copy(context, token.pin, 'Token/PIN'),
                            tooltip: 'Copy PIN',
                            constraints: const BoxConstraints(),
                            padding: const EdgeInsets.all(6),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

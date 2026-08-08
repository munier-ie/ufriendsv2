import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/skeleton_loader.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';

class PinScreen extends StatefulWidget {
  final String title;
  final String? warningText;
  final Future<Map<String, dynamic>> Function(String pin) onVerify;

  const PinScreen({
    super.key, 
    this.title = 'Enter Transaction PIN',
    this.warningText,
    required this.onVerify,
  });

  @override
  State<PinScreen> createState() => _PinScreenState();
}

class _PinScreenState extends State<PinScreen> {
  String _pin = '';
  bool _isLoading = false;

  void _onKeyPress(String val) async {
    if (_isLoading) return;
    
    if (val == 'backspace') {
      if (_pin.isNotEmpty) {
        setState(() {
          _pin = _pin.substring(0, _pin.length - 1);
        });
      }
    } else {
      if (_pin.length < 4) {
        setState(() {
          _pin += val;
        });
        if (_pin.length == 4) {
          setState(() {
            _isLoading = true;
          });
          try {
            final result = await widget.onVerify(_pin);
            if (!mounted) return;
            Navigator.pop(context, result);
          } catch (e) {
            if (!mounted) return;
            Navigator.pop(context, {'success': false, 'error': 'An error occurred: $e'});
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: context.cardColor,
        body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.only(top: 68),
                child: Column(
                  children: [
                    const Spacer(flex: 1),
            
            if (_isLoading) ...[
              const Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Skeleton(width: 200, height: 120),
                      SizedBox(height: 24),
                      Text(
                        'Processing transaction...',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              Text(
                'Enter your 4-digit PIN',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.textPrimary),
              ),
              const SizedBox(height: 12),
              const Text(
                'To authorize this transaction',
                style: TextStyle(fontSize: 14, color: Colors.grey),
              ),
              
              if (widget.warningText != null) ...[
                const SizedBox(height: 24),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 24),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    border: Border.all(color: Colors.orange.shade200),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.warningText!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange.shade900,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              
              const SizedBox(height: 32),
              
              // PIN Display
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (index) {
                  bool isFilled = index < _pin.length;
                  return Container(
                    width: 56,
                    height: 56,
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: context.cardColor,
                      border: Border.all(
                        color: isFilled ? const Color(0xFF1E90FF) : Colors.grey.shade300,
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: isFilled ? [
                        BoxShadow(
                          color: const Color(0xFF1E90FF).withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        )
                      ] : [],
                    ),
                    alignment: Alignment.center,
                    child: isFilled
                        ? Container(
                            width: 16,
                            height: 16,
                            decoration: const BoxDecoration(
                              color: Color(0xFF1E90FF),
                              shape: BoxShape.circle,
                            ),
                          )
                        : null,
                  );
                }),
              ),
              
              const Spacer(flex: 2),
              
              // Number Pad
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                decoration: BoxDecoration(
                  color: context.subtleBg,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(32),
                    topRight: Radius.circular(32),
                  ),
                ),
                child: Column(
                  children: [
                    _buildPadRow(['1', '2', '3']),
                    const SizedBox(height: 24),
                    _buildPadRow(['4', '5', '6']),
                    const SizedBox(height: 24),
                    _buildPadRow(['7', '8', '9']),
                    const SizedBox(height: 24),
                    _buildPadRow(['', '0', 'backspace']),
                  ],
                ),
              ),
            ],
                  ],
                ),
              ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FloatingScreenHeader(
                title: 'Processing transaction...',
                onBackPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildPadRow(List<String> keys) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: keys.map((key) {
        if (key.isEmpty) {
          return const SizedBox(width: 64, height: 64);
        }
        return _buildPadButton(key);
      }).toList(),
    );
  }

  Widget _buildPadButton(String key) {
    final isBackspace = key == 'backspace';
    
    return GestureDetector(
      onTap: () => _onKeyPress(key),
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: isBackspace ? Colors.transparent : context.cardColor,
          shape: BoxShape.circle,
          border: isBackspace ? null : Border.all(color: context.borderColor, width: 1),
          boxShadow: isBackspace ? [] : [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: isBackspace
            ? Icon(Icons.backspace_rounded, color: Color(0xFF1E90FF), size: 24)
            : Text(
                key,
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: context.textPrimary),
              ),
      ),
    );
  }
}

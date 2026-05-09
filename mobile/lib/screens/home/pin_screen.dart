import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PinScreen extends StatefulWidget {
  final String title;
  final Future<Map<String, dynamic>> Function(String pin) onVerify;

  const PinScreen({
    super.key, 
    this.title = 'Enter Transaction PIN',
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
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Column(
          children: [
            // Custom Floating TopBar
            Container(
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: Colors.grey.shade200, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Color(0xFF1E90FF)),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    widget.title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  const Spacer(),
                ],
              ),
            ),
            
            const Spacer(flex: 1),
            
            if (_isLoading) ...[
              const Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(
                        color: Color(0xFF1E90FF),
                      ),
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
              const Text(
                'Enter your 4-digit PIN',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 12),
              const Text(
                'To authorize this transaction',
                style: TextStyle(fontSize: 14, color: Colors.grey),
              ),
              
              const SizedBox(height: 48),
              
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
                      color: Colors.white,
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
                  color: Colors.grey.shade50,
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
          color: isBackspace ? Colors.transparent : Colors.white,
          shape: BoxShape.circle,
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
            ? const Icon(Icons.backspace_rounded, color: Color(0xFF1E90FF), size: 24)
            : Text(
                key,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
      ),
    );
  }
}

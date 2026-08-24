import 'package:flutter/material.dart';
import '../../core/custom_widgets.dart';
import '../../core/app_theme.dart';
import '../../widgets/pin_display_widget.dart';

class TransactionStatusScreen extends StatelessWidget {
  final bool isSuccess;
  final String title;
  final String message;
  final Map<String, String>? details;
  final String? pinContent;

  const TransactionStatusScreen({
    super.key,
    required this.isSuccess,
    required this.title,
    required this.message,
    this.details,
    this.pinContent,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.cardColor,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    
                    // Status Icon with Animation/Glow
                    Center(
                      child: Container(
                        width: 110,
                        height: 110,
                        decoration: BoxDecoration(
                          color: isSuccess ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: isSuccess ? Colors.green : Colors.red,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: (isSuccess ? Colors.green : Colors.red).withValues(alpha: 0.3),
                                  blurRadius: 12,
                                  offset: const Offset(0, 6),
                                )
                              ],
                            ),
                            child: Icon(
                              isSuccess ? Icons.check_rounded : Icons.close_rounded,
                              color: Colors.white,
                              size: 44,
                            ),
                          ),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // Title
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: context.textPrimary,
                      ),
                    ),
                    
                    const SizedBox(height: 8),
                    
                    // Message
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        message,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          color: context.textSecondary,
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 24),

                    // Dedicated PIN & Serial Display if available
                    if (pinContent != null && pinContent!.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: PinDisplayWidget(pinContent: pinContent!),
                      ),
                    
                    // Details Block
                    if (details != null && details!.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: context.subtleBg,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: context.borderColor),
                        ),
                        child: Column(
                          children: details!.entries.map((entry) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    entry.key,
                                    style: TextStyle(color: context.textSecondary, fontSize: 13),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      entry.value,
                                      textAlign: TextAlign.end,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                        color: context.textPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            
            // Action Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: GradientButton(
                text: 'Done',
                onPressed: () {
                  // Navigate back to home or pop until home
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

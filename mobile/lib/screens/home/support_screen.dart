import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/api_service.dart';
import '../../core/custom_widgets.dart';
import 'package:intl/intl.dart';
import 'ai_chat_screen.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  bool _loading = true;
  List<dynamic> _messages = [];

  @override
  void initState() {
    super.initState();
    _fetchMessages();
  }

  Future<void> _fetchMessages() async {
    setState(() => _loading = true);
    final result = await ApiService.getSupportMessages();
    if (mounted) {
      setState(() {
        _loading = false;
        if (result['success']) {
          _messages = result['messages'];
        } else {
          AppToast.show(context, message: result['error'] ?? 'Failed to load support history', type: ToastType.error);
        }
      });
    }
  }

  void _showNewRequestDialog() {
    final subjectController = TextEditingController();
    final messageController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'New Support Request',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  
                  const Text('Subject', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: subjectController,
                    decoration: InputDecoration(
                      hintText: 'Briefly summarize your issue',
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  const Text('Message', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: messageController,
                    maxLines: 5,
                    decoration: InputDecoration(
                      hintText: 'Please provide details about your issue...',
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  GradientButton(
                    text: 'Send Message',
                    loading: isSubmitting,
                    onPressed: () async {
                      if (subjectController.text.trim().isEmpty || messageController.text.trim().isEmpty) {
                        AppToast.show(context, message: 'Please fill in all fields', type: ToastType.warning);
                        return;
                      }
                      
                      setModalState(() => isSubmitting = true);
                      final result = await ApiService.createSupportMessage(
                        subject: subjectController.text.trim(),
                        message: messageController.text.trim(),
                      );
                      
                      if (!mounted) return;
                      
                      if (result['success']) {
                        Navigator.pop(context);
                        AppToast.show(context, message: 'Your message has been sent to our support team.', type: ToastType.success);
                        _fetchMessages();
                      } else {
                        setModalState(() => isSubmitting = false);
                        AppToast.show(context, message: result['error'] ?? 'Failed to send message', type: ToastType.error);
                      }
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
            Container(
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF1E90FF), size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const Spacer(),
                      const Text(
                        'Support Center',
                        style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const Spacer(),
                      const SizedBox(width: 48),
                    ],
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.support_agent, size: 80, color: Colors.grey.shade300),
                              const SizedBox(height: 16),
                              const Text('No support requests yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              const Text('Need help? Create a new request and\nour team will assist you.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(20),
                          itemCount: _messages.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            final isReplied = msg['status'] == 2;
                            final date = DateTime.tryParse(msg['createdAt'] ?? '');
                            final dateStr = date != null ? DateFormat('MMM d, yyyy - h:mm a').format(date) : '';
                            
                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 2)),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          msg['subject'] ?? 'No Subject',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isReplied ? Colors.green.shade50 : Colors.orange.shade50,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isReplied ? Icons.check_circle : Icons.access_time,
                                              size: 12,
                                              color: isReplied ? Colors.green.shade600 : Colors.orange.shade600,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              isReplied ? 'Replied' : 'Pending Review',
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: isReplied ? Colors.green.shade600 : Colors.orange.shade600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(dateStr, style: TextStyle(color: Colors.grey.shade400, fontSize: 11)),
                                  const SizedBox(height: 12),
                                  Text(
                                    msg['message'] ?? '',
                                    style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                                  ),
                                  
                                  if (isReplied && msg['reply'] != null) ...[
                                    const SizedBox(height: 16),
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.shade50,
                                        borderRadius: const BorderRadius.only(
                                          topRight: Radius.circular(12),
                                          bottomLeft: Radius.circular(12),
                                          bottomRight: Radius.circular(12),
                                        ),
                                        border: Border(left: BorderSide(color: Colors.blue.shade400, width: 4)),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text('Response from Support', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 12)),
                                          const SizedBox(height: 4),
                                          Text(
                                            msg['reply'],
                                            style: TextStyle(color: Colors.blue.shade900, fontSize: 13),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'ai_chat',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AiChatScreen())),
            backgroundColor: Colors.indigo,
            icon: const Icon(Icons.auto_awesome, color: Colors.white),
            label: const Text('AI Consultant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'human_support',
            onPressed: _showNewRequestDialog,
            backgroundColor: AppTheme.primaryColor,
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('New Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

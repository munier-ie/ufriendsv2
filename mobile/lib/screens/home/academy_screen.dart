import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

class AcademyScreen extends StatefulWidget {
  const AcademyScreen({super.key});

  @override
  State<AcademyScreen> createState() => _AcademyScreenState();
}

class _AcademyScreenState extends State<AcademyScreen> {
  bool _loading = true;
  List<dynamic> _contents = [];
  double _walletBalance = 0;
  String _activeFilter = '';
  String _searchQuery = '';

  static const _filters = [
    {'label': 'All', 'value': ''},
    {'label': 'Free', 'value': 'free'},
    {'label': 'Premium', 'value': 'premium'},
    {'label': 'Videos', 'value': 'video'},
    {'label': 'PDFs', 'value': 'pdf'},
    {'label': 'Articles', 'value': 'text'},
    {'label': 'Live', 'value': 'livestream'},
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      ApiService.fetchAcademyContent(),
      ApiService.getProfile(),
    ]);

    final contentRes = results[0];
    final userRes = results[1];

    if (mounted) {
      setState(() {
        if (contentRes['success'] == true) {
          _contents = contentRes['data']['contents'] ?? [];
        }
        if (userRes['success'] == true) {
          _walletBalance = double.tryParse(userRes['user']['balance']?.toString() ?? '0') ?? 0;
        }
        _loading = false;
      });
    }
  }

  Future<void> _handleView(dynamic content) async {
    if (content['locked'] == true) {
      _handlePurchase(content);
      return;
    }

    // Fetch full content
    AppToast.show(context, message: 'Loading content...', type: ToastType.success);
    final res = await ApiService.fetchAcademyItem(content['id']);
    if (!mounted) return;

    if (res['success'] == true) {
      final fullContent = res['data']['content'];
      _openContent(fullContent);
    } else {
      AppToast.show(context, message: res['error'] ?? 'Failed to load content', type: ToastType.error);
    }
  }

  Future<void> _openContent(dynamic fullContent) async {
    final type = fullContent['type'];
    
    if (type == 'text') {
      // Show bottom sheet with text
      _showArticleSheet(fullContent);
    } else {
      // For video, pdf, image, livestream -> open URL
      String? url;
      if (type == 'video' && fullContent['youtubeUrl'] != null && fullContent['youtubeUrl'].toString().isNotEmpty) {
        url = fullContent['youtubeUrl'];
      } else if (type == 'livestream' && fullContent['externalUrl'] != null) {
        url = fullContent['externalUrl'];
      } else {
        url = fullContent['fileUrl'];
      }

      if (url != null && url.isNotEmpty) {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          if (mounted) AppToast.show(context, message: 'Could not open link', type: ToastType.error);
        }
      } else {
        if (mounted) AppToast.show(context, message: 'No content URL available', type: ToastType.error);
      }
    }
  }

  void _showArticleSheet(dynamic content) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, controller) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12)),
                      child: Icon(Icons.article_rounded, color: Colors.green.shade600),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(content['title'] ?? 'Article', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: SingleChildScrollView(
                  controller: controller,
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    content['body'] ?? 'No content available.',
                    style: const TextStyle(fontSize: 16, height: 1.6, color: Colors.black87),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handlePurchase(dynamic content) async {
    final price = double.tryParse(content['price']?.toString() ?? '0') ?? 0;
    
    if (_walletBalance < price) {
      AppToast.show(context, message: 'Insufficient balance to unlock content.', type: ToastType.error);
      return;
    }

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'Unlock Content',
          onVerify: (pin) async {
            return await ApiService.purchaseAcademyContent(content['id'], pin);
          },
        ),
      ),
    );

    if (result != null && mounted) {
      if (result['success'] == true) {
        AppToast.show(context, message: 'Content unlocked successfully!', type: ToastType.success);
        setState(() {
          final index = _contents.indexWhere((c) => c['id'] == content['id']);
          if (index != -1) {
            _contents[index]['locked'] = false;
          }
        });
        _handleView(_contents.firstWhere((c) => c['id'] == content['id']));
      } else {
        AppToast.show(context, message: result['error'] ?? 'Unlock failed', type: ToastType.error);
      }
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'video': return Icons.play_circle_fill_rounded;
      case 'pdf': return Icons.picture_as_pdf_rounded;
      case 'image': return Icons.image_rounded;
      case 'livestream': return Icons.podcasts_rounded;
      case 'text':
      default: return Icons.article_rounded;
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'video': return Colors.blue;
      case 'pdf': return Colors.red;
      case 'image': return Colors.pink;
      case 'livestream': return Colors.orange;
      case 'text':
      default: return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    final freeCount = _contents.where((c) => c['plan'] == 'free').length;
    final premiumCount = _contents.where((c) => c['plan'] == 'premium').length;

    var filtered = _contents.where((c) {
      final matchesSearch = _searchQuery.isEmpty || 
          (c['title'] ?? '').toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (c['description'] ?? '').toString().toLowerCase().contains(_searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (_activeFilter.isEmpty) return true;
      if (_activeFilter == 'free' || _activeFilter == 'premium') return c['plan'] == _activeFilter;
      return c['type'] == _activeFilter;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Academy', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF004687),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Hero Header
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF004687), Color(0xFF1E90FF)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.school_rounded, color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 12),
                    const Text('Ufriends Academy', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1)),
                  ],
                ),
                const SizedBox(height: 16),
                const Text('Learn & Grow', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Study guides, tutorials, videos, and more — curated to help you succeed.', style: TextStyle(color: Colors.white70, fontSize: 14)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                      child: Row(
                        children: [
                          const Text('Free: ', style: TextStyle(color: Colors.white70)),
                          Text('$freeCount', style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                      child: Row(
                        children: [
                          const Text('Premium: ', style: TextStyle(color: Colors.white70)),
                          Text('$premiumCount', style: const TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Search & Filters
          Container(
            color: Colors.grey.shade50,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: InputDecoration(
                    hintText: 'Search lessons, guides, tutorials...',
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _filters.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final f = _filters[index];
                      final isSelected = _activeFilter == f['value'];
                      return GestureDetector(
                        onTap: () => setState(() => _activeFilter = f['value']!),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primaryColor : Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300),
                          ),
                          child: Text(
                            f['label']!,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.grey.shade700,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          
          // Content Grid
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text('No content found', style: TextStyle(color: Colors.grey)))
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            childAspectRatio: 0.75,
                          ),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) => _buildContentCard(filtered[index]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentCard(dynamic content) {
    final bool isLocked = content['locked'] == true;
    final bool isPremium = content['plan'] == 'premium';
    final type = content['type'] ?? 'text';
    final typeColor = _getTypeColor(type);

    return GestureDetector(
      onTap: () => _handleView(content),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail Area
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: typeColor.withValues(alpha: 0.1),
                    child: content['thumbnailUrl'] != null && content['thumbnailUrl'].toString().isNotEmpty
                        ? Image.network(content['thumbnailUrl'], fit: BoxFit.cover, errorBuilder: (_, __, ___) => Icon(_getTypeIcon(type), size: 48, color: typeColor.withValues(alpha: 0.3)))
                        : Icon(_getTypeIcon(type), size: 48, color: typeColor.withValues(alpha: 0.3)),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isPremium ? Colors.amber : Colors.green,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(isPremium ? Icons.lock_outline_rounded : Icons.lock_open_rounded, size: 10, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(isPremium ? 'Premium' : 'Free', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  if (isLocked)
                    Container(
                      color: Colors.black45,
                      child: const Center(child: Icon(Icons.lock_rounded, color: Colors.white, size: 36)),
                    ),
                ],
              ),
            ),
            // Details Area
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      content['title'] ?? 'Untitled',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, height: 1.2),
                    ),
                    const Spacer(),
                    isLocked
                        ? Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.lock_rounded, size: 12, color: Colors.orange.shade700),
                                const SizedBox(width: 4),
                                Text('Unlock ₦${content['price']}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange.shade700)),
                              ],
                            ),
                          )
                        : Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.visibility_rounded, size: 12, color: AppTheme.primaryColor),
                                const SizedBox(width: 4),
                                const Text('View Content', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                              ],
                            ),
                          ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

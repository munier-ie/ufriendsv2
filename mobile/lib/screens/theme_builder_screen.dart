import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../theme_state.dart';
import '../core/app_theme.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

class ThemeBuilderScreen extends StatefulWidget {
  const ThemeBuilderScreen({super.key});

  @override
  State<ThemeBuilderScreen> createState() => _ThemeBuilderScreenState();
}

class _ThemeBuilderScreenState extends State<ThemeBuilderScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _initNotifications();
  }

  Future<void> _initNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );
    await flutterLocalNotificationsPlugin.initialize(settings: initializationSettings);
    
    flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 800;
    final themeState = Provider.of<ThemeState>(context);

    return Scaffold(
      backgroundColor: themeState.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: themeState.isDarkMode ? Colors.white : Colors.black),
        title: Text('Ufriends Theme Builder', style: TextStyle(color: themeState.isDarkMode ? Colors.white : Colors.black, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: Icon(Icons.code, color: themeState.isDarkMode ? Colors.white : Colors.black),
            tooltip: 'Export Theme Code',
            onPressed: () => _showExportDialog(context),
          ),
        ],
      ),
      drawer: const ModernDrawer(),
      body: Stack(
        children: [
          isWide
              ? Row(
                  children: [
                    Expanded(flex: 1, child: const ControlsPane()),
                    const VerticalDivider(width: 1, thickness: 1),
                    Expanded(flex: 2, child: const PreviewPane()),
                  ],
                )
              : Column(
                  children: [
                    Expanded(flex: 1, child: const PreviewPane()),
                    const Divider(height: 1, thickness: 1),
                    Expanded(flex: 1, child: const ControlsPane()),
                  ],
                ),
          // Custom Floating Navbar
          Positioned(
            bottom: 20,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: MediaQuery.of(context).size.width * 0.9,
                height: 70,
                decoration: BoxDecoration(
                  color: themeState.surfaceColor,
                  borderRadius: BorderRadius.circular(35),
                  border: Border.all(color: context.borderColor, width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: themeState.primaryColor.withValues(alpha: 0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _NavBarItem(
                      icon: Icons.home_rounded,
                      label: 'Home',
                      isSelected: _selectedIndex == 0,
                      onTap: () => setState(() => _selectedIndex = 0),
                    ),
                    _NavBarItem(
                      icon: Icons.wallet_rounded,
                      label: 'Wallet',
                      isSelected: _selectedIndex == 1,
                      onTap: () => setState(() => _selectedIndex = 1),
                    ),
                    _NavBarItem(
                      icon: Icons.qr_code_scanner_rounded,
                      label: '',
                      isCenter: true,
                      isSelected: false,
                      onTap: () {},
                    ),
                    _NavBarItem(
                      icon: Icons.receipt_long_rounded,
                      label: 'Activity',
                      isSelected: _selectedIndex == 2,
                      onTap: () => setState(() => _selectedIndex = 2),
                    ),
                    _NavBarItem(
                      icon: Icons.person_rounded,
                      label: 'Profile',
                      isSelected: _selectedIndex == 3,
                      onTap: () => setState(() => _selectedIndex = 3),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showExportDialog(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context, listen: false);
    final code = themeState.exportTheme();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Exported Dart Class'),
          content: SingleChildScrollView(
            child: SelectableText(
              code,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: code));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Copied to clipboard!')),
                );
                Navigator.of(context).pop();
              },
              child: const Text('Copy to Clipboard'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }
}

class _NavBarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final bool isCenter;
  final VoidCallback onTap;

  const _NavBarItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.isCenter = false,
  });

  @override
  Widget build(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context);
    if (isCenter) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            gradient: themeState.primaryGradient,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(color: themeState.primaryColor.withValues(alpha: 0.4), blurRadius: 10, spreadRadius: 2, offset: const Offset(0, 4)),
            ],
          ),
          child: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 28),
        ),
      );
    }

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? themeState.primaryColor.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? themeState.primaryColor : Colors.grey.shade500, size: 24),
            if (isSelected && label.isNotEmpty) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(color: themeState.primaryColor, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ModernDrawer extends StatelessWidget {
  const ModernDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context);
    return Drawer(
      backgroundColor: themeState.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(topRight: Radius.circular(30), bottomRight: Radius.circular(30)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 60, 20, 30),
            decoration: BoxDecoration(
              gradient: themeState.primaryGradient,
            ),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 30),
                Row(
                  children: [
                    const CircleAvatar(radius: 30, backgroundImage: NetworkImage('https://i.pravatar.cc/150?u=ufriends')),
                    const SizedBox(width: 15),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Bardia Adibi', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                          Text('bardiaadb@gmail.com', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              children: [
                _DrawerItem(icon: Icons.auto_awesome_outlined, label: 'Learn and earn', onTap: () {}),
                _DrawerItem(icon: Icons.person_add_outlined, label: 'Invite friends', onTap: () {}),
                _DrawerItem(icon: Icons.card_giftcard_outlined, label: 'Send a gift', trailing: '₦10', onTap: () {}),
                _DrawerItem(icon: Icons.account_balance_wallet_outlined, label: 'Get wallet', onTap: () {}),
                _DrawerItem(icon: Icons.settings_outlined, label: 'Setting', onTap: () {}),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: GradientButton(
              text: 'Sign out',
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? trailing;
  final VoidCallback onTap;

  const _DrawerItem({required this.icon, required this.label, this.trailing, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context);
    return ListTile(
      leading: Icon(icon, color: themeState.primaryColor),
      title: Text(label, style: TextStyle(fontWeight: FontWeight.w500, color: themeState.isDarkMode ? Colors.white : Colors.black87)),
      trailing: trailing != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: themeState.secondaryColor.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
              child: Text(trailing!, style: TextStyle(color: themeState.secondaryColor, fontSize: 12, fontWeight: FontWeight.bold)),
            )
          : null,
      onTap: onTap,
    );
  }
}

class ControlsPane extends StatelessWidget {
  const ControlsPane({super.key});

  @override
  Widget build(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context);

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        const Text('Core Design', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        _ColorPickerRow(title: 'Deep Blue (Primary)', color: themeState.primaryColor, onColorChanged: themeState.updatePrimaryColor),
        _ColorPickerRow(title: 'Dodger Blue (Sec)', color: themeState.secondaryColor, onColorChanged: themeState.updateSecondaryColor),
        _ColorPickerRow(title: 'Background', color: themeState.backgroundColor, onColorChanged: themeState.updateBackgroundColor),
        _ColorPickerRow(title: 'Surface', color: themeState.surfaceColor, onColorChanged: themeState.updateSurfaceColor),
        
        const Divider(height: 32),

        const Text('Modern Tuning', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        _SliderRow(title: 'Border Radius', value: themeState.borderRadius, min: 0, max: 40, onChanged: themeState.updateBorderRadius),
        _SliderRow(title: 'Spacing Multiplier', value: themeState.spacingMultiplier, min: 0.5, max: 2.0, onChanged: themeState.updateSpacingMultiplier),
        
        const Divider(height: 32),
        const Text('Typography', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: themeState.fontFamily,
          decoration: const InputDecoration(labelText: 'Font Family'),
          items: themeState.availableFonts.map((font) {
            return DropdownMenuItem(value: font, child: Text(font));
          }).toList(),
          onChanged: (val) {
            if (val != null) themeState.updateFontFamily(val);
          },
        ),
      ],
    );
  }
}


class _ColorPickerRow extends StatelessWidget {
  final String title;
  final Color color;
  final ValueChanged<Color> onColorChanged;

  const _ColorPickerRow({required this.title, required this.color, required this.onColorChanged});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      title: Text(title),
      trailing: Container(
        width: 30, height: 30,
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4), border: Border.all(color: Colors.grey.shade300)),
      ),
      onTap: () {
        showDialog(context: context, builder: (context) {
          Color tempColor = color;
          return AlertDialog(
            title: Text('Pick $title'),
            content: SingleChildScrollView(child: ColorPicker(pickerColor: color, onColorChanged: (c) => tempColor = c)),
            actions: [TextButton(onPressed: () { onColorChanged(tempColor); Navigator.of(context).pop(); }, child: const Text('Save'))],
          );
        });
      },
    );
  }
}

class _SliderRow extends StatelessWidget {
  final String title;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;

  const _SliderRow({required this.title, required this.value, required this.min, required this.max, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('$title: ${value.toStringAsFixed(1)}', style: const TextStyle(fontSize: 12)),
      Slider(value: value, min: min, max: max, onChanged: onChanged),
    ]);
  }
}

class PreviewPane extends StatelessWidget {
  const PreviewPane({super.key});

  @override
  Widget build(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context);
    
    return Theme(
      data: themeState.themeData,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            Text('Dashboard Overview', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Balance', style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                    const SizedBox(height: 8),
                    Text('₦ 150,000.00', style: TextStyle(color: themeState.primaryColor, fontSize: 28, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(child: GradientButton(text: 'Fund Wallet', onPressed: () => _showNotification(context))),
                        const SizedBox(width: 8),
                        Expanded(child: OutlinedButton(onPressed: () => _showConfirmDrawer(context), child: const Text('Transfer'))),
                      ],
                    )
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            const SectionHeader(title: 'Quick Actions'),
            Row(
              children: [
                _QuickAction(icon: Icons.phone_android, label: 'Data', color: themeState.secondaryColor),
                _QuickAction(icon: Icons.receipt_long, label: 'Bills', color: themeState.primaryColor),
                _QuickAction(icon: Icons.tv, label: 'Cable', color: themeState.successColor),
                _QuickAction(icon: Icons.bolt, label: 'Power', color: themeState.warningColor),
              ],
            ),

            const SizedBox(height: 24),
            const SectionHeader(title: 'Communications'),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _triggerPushNotification(context),
                    icon: const Icon(Icons.notifications_active),
                    label: const Text('Trigger Push Notification'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: themeState.primaryColor,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),
            const SectionHeader(title: 'Loading States'),
            Shimmer.fromColors(
              baseColor: context.borderColor,
              highlightColor: Colors.grey.shade100,
              child: Card(child: SizedBox(height: 80, width: double.infinity)),
            ),

            const SizedBox(height: 100), // Padding for navbar
          ],
        ),
      ),
    );
  }

  Future<void> _triggerPushNotification(BuildContext context) async {
    const AndroidNotificationDetails androidNotificationDetails = AndroidNotificationDetails(
      'ufriends_channel_id',
      'Ufriends Notifications',
      channelDescription: 'Main channel for Ufriends app notifications',
      importance: Importance.max,
      priority: Priority.high,
      ticker: 'ticker',
    );
    const NotificationDetails notificationDetails = NotificationDetails(android: androidNotificationDetails);
    
    await flutterLocalNotificationsPlugin.show(
      id: 0,
      title: 'Ufriends Update',
      body: 'This is a real mobile push notification!',
      notificationDetails: notificationDetails,
      payload: 'item x',
    );
  }

  void _showNotification(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context, listen: false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        padding: EdgeInsets.zero,
        duration: const Duration(seconds: 4),
        content: Center(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
            decoration: BoxDecoration(
              gradient: themeState.primaryGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 10, offset: const Offset(0, 5))],
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.white),
                const SizedBox(width: 15),
                const Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('System Notification', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      Text('Funds successfully added to your wallet.', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(icon: const Icon(Icons.close, color: Colors.white, size: 18), onPressed: () => ScaffoldMessenger.of(context).hideCurrentSnackBar()),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showConfirmDrawer(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => const ConfirmDrawer(),
    );
  }
}

class ConfirmDrawer extends StatelessWidget {
  const ConfirmDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context);
    return Container(
      decoration: BoxDecoration(
        color: themeState.surfaceColor,
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 24),
          const Text('Confirm Transaction', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          const Text('Are you sure you want to proceed? This will transfer ₦10,000 to the recipient.', textAlign: TextAlign.center),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Decline'))),
              const SizedBox(width: 12),
              Expanded(child: GradientButton(text: 'Accept', onPressed: () => Navigator.pop(context))),
            ],
          ),
        ],
      ),
    );
  }
}

class GradientButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  const GradientButton({super.key, required this.text, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final themeState = Provider.of<ThemeState>(context);
    return Container(
      decoration: BoxDecoration(gradient: themeState.primaryGradient, borderRadius: BorderRadius.circular(themeState.borderRadius)),
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, shadowColor: Colors.transparent),
        onPressed: onPressed,
        child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _QuickAction({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  const SectionHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(title.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade500, letterSpacing: 1.2)),
    );
  }
}

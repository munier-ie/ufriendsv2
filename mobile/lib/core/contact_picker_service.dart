import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_native_contact_picker/flutter_native_contact_picker.dart';

class ContactPickerService {
  static const _channel = MethodChannel('com.ufriends.ng/contact_picker');

  /// Returns only the selected number, or null when the user cancels.
  static Future<String?> pickPhoneNumber() async {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return _channel.invokeMethod<String>('pickPhoneNumber');
    }

    // Preserve the existing native picker on iOS.
    final contact = await FlutterNativeContactPicker().selectContact();
    final numbers = contact?.phoneNumbers;
    return numbers == null || numbers.isEmpty ? null : numbers.first;
  }
}

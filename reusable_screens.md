# Reusable Screens and Widgets Documentation

This document outlines the reusable screens and widgets available in the project, their parameters, and their use cases.

## Reusable Screens

### 1. PinScreen

**Location**: `mobile/lib/screens/home/pin_screen.dart`

**Use Case**: 
Used to prompt the user for a 4-digit PIN to authorize sensitive actions, primarily transactions like buying data or airtime. It handles input and calls a verification callback.

**Parameters**:
- `title` (String, default: 'Enter Transaction PIN'): The title displayed at the top.
- `onVerify` (Future<Map<String, dynamic>> Function(String pin)): A callback function that takes the entered PIN and returns a map indicating success or failure.

**Example Usage**:
```dart
final result = await Navigator.push(
  context,
  MaterialPageRoute(
    builder: (_) => PinScreen(
      onVerify: (pin) async {
        return await ApiService.verifyPinAndDoAction(pin);
      },
    ),
  ),
);
```

### 2. TransactionStatusScreen

**Location**: `mobile/lib/screens/home/transaction_status_screen.dart`

**Use Case**: 
Used to display the outcome of a transaction or any operation that requires a success/failure confirmation. It features a rich, premium design with large icons and a details breakdown.

**Parameters**:
- `isSuccess` (bool): Determines if it shows a success (green) or failure (red) state.
- `title` (String): The main heading (e.g., "Transaction Successful").
- `message` (String): A descriptive message about the outcome.
- `details` (Map<String, String>?, optional): A key-value map of transaction details (e.g., Amount, Recipient) to display in a styled container.

**Example Usage**:
```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (_) => TransactionStatusScreen(
      isSuccess: true,
      title: 'Transaction Successful',
      message: 'Your request was processed successfully.',
      details: {
        'Service': 'Airtime Purchase',
        'Amount': '₦1000',
      },
    ),
  ),
);
```

---

## Reusable Widgets

These are smaller components located in `mobile/lib/core/custom_widgets.dart`.

### 1. GradientButton

**Use Case**: 
The standard call-to-action button with a premium gradient look and shadow.

**Parameters**:
- `text` (String): Button label.
- `onPressed` (VoidCallback): Action on click.
- `width` (double, default: double.infinity): Button width.
- `icon` (IconData?, optional): Leading icon.

**Example Usage**:
```dart
GradientButton(
  text: 'Confirm',
  icon: Icons.check_rounded,
  onPressed: () => print('Confirmed'),
)
```

### 2. AppToast

**Use Case**: 
Displaying non-intrusive floating alerts for feedback.

**Methods**:
- `show(BuildContext context, {required String message, required ToastType type})`
  - `type` can be `ToastType.success`, `ToastType.error`, or `ToastType.warning`.

**Example Usage**:
```dart
AppToast.show(context, message: 'Settings saved!', type: ToastType.success);
```

### 3. AppLogo

**Use Case**: 
Displaying the app's SVG logo with a fallback icon.

**Parameters**:
- `size` (double, default: 80): Width and height of the logo.

**Example Usage**:
```dart
AppLogo(size: 120)
```

### 4. App Drawer

**Location**: `mobile/lib/screens/home/home_screen.dart` (Currently implemented as `_buildDrawer()`)

**Use Case**: 
Used as the main side-navigation menu in the application. It provides access to the user's profile summary, main features, settings, and logout. It uses a clean, premium design with active state highlighting.

**Key Features**:
- Displays user profile picture, name, and email.
- Navigation links to Dashboard, Wallet, Services, Activity, and Settings.
- Logout button at the bottom.

**Note**: This is currently a method in `HomeScreen` but can be extracted into a standalone reusable widget if needed in other screens.

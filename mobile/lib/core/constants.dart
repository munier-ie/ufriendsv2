class AppConstants {
  // Use the local network IP of your laptop since you're testing on a physical Samsung device
  // Current IP: 10.190.206.125
  static const String baseUrl = 'http://10.26.187.125:3000/api';
  // static const String baseUrl = 'https://api.ufriends.com.ng/api';

  // Base server URL without /api — dynamically derived from baseUrl so host/port are always aligned
  static String get baseServerUrl {
    final uri = Uri.parse(baseUrl);
    return '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
  }

  static const String loginEndpoint = '/auth/access';
  static const String registerEndpoint = '/auth/register';
}

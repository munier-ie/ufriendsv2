class AppConstants {
  // Use the local network IP of your laptop since you're testing on a physical Samsung device
  // Current IP: 10.190.206.125
  // static const String baseUrl = 'http://10.190.206.125:3000/api';
  static const String baseUrl = 'https://api.ufriends.com.ng/api';

  // Base server URL without /api — used for file downloads (slips, uploads)
  // static const String baseServerUrl = 'http://10.190.206.125:3000';
  static const String baseServerUrl = 'https://api.ufriends.com.ng';

  static const String loginEndpoint = '/auth/access';
  static const String registerEndpoint = '/auth/register';
}

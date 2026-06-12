class AppConstants {
  // Use the local network IP of your laptop since you're testing on a physical Samsung device
  // Current IP: 10.66.39.21
  static const String baseUrl = 'http://10.142.155.125:3000/api';

  // Base server URL without /api — used for file downloads (slips, uploads)
  static const String baseServerUrl = 'http://10.142.155.125:3000';

  static const String loginEndpoint = '/auth/access';
  static const String registerEndpoint = '/auth/register';
}

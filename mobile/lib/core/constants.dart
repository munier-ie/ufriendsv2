class AppConstants {
  // Use the local network IP of your laptop since you're testing on a physical Samsung device
  // Current IP: 10.66.39.21
  static const String baseUrl = 'http://10.66.39.21:3000/api';

  static const String loginEndpoint = '/auth/access';
  static const String registerEndpoint = '/auth/register';
}

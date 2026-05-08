class AppConstants {
  // Use the local network IP of your laptop since you're testing on a physical Samsung device
  // Current IP: 10.42.111.125
  static const String baseUrl = 'http://10.42.111.125:3000/api';

  static const String loginEndpoint = '/auth/access';
  static const String registerEndpoint = '/auth/register';
}

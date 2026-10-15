import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// Android emulator can reach the host machine through 10.0.2.2.
// For a physical phone, replace this with your computer's LAN IP address.
const String apiBase = 'http://10.0.2.2:8000';

void main() => runApp(const AgentOS());

class AgentOS extends StatelessWidget {
  const AgentOS({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'AgentOS Admin',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        scaffoldBackgroundColor: const Color(0xfff6f8fb),
        useMaterial3: true,
      ),
      home: const Home(),
    );
  }
}

class Home extends StatefulWidget {
  const Home({super.key});

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  String? token;
  Map<String, dynamic> data = <String, dynamic>{};
  bool loading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('token');

    if (token != null) {
      try {
        final response = await http.get(
          Uri.parse('$apiBase/api/analytics'),
          headers: <String, String>{'Authorization': 'Bearer $token'},
        );
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          if (decoded is Map<String, dynamic>) {
            data = decoded;
          }
          errorMessage = null;
        } else {
          errorMessage = 'Could not load analytics (${response.statusCode}).';
        }
      } catch (_) {
        errorMessage = 'Cannot connect to the backend at $apiBase.';
      }
    }

    if (mounted) {
      setState(() => loading = false);
    }
  }

  Future<void> login() async {
    final emailController = TextEditingController(text: 'demo@example.com');
    final passwordController = TextEditingController(text: 'Demo123!');

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign in'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                final response = await http.post(
                  Uri.parse('$apiBase/api/auth/login'),
                  headers: <String, String>{
                    'Content-Type': 'application/json',
                  },
                  body: jsonEncode(<String, String>{
                    'email': emailController.text.trim(),
                    'password': passwordController.text,
                  }),
                );

                if (response.statusCode == 200) {
                  final decoded = jsonDecode(response.body);
                  if (decoded is Map && decoded['access_token'] != null) {
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.setString('token', decoded['access_token'].toString());
                    if (dialogContext.mounted) {
                      Navigator.of(dialogContext).pop();
                    }
                    if (mounted) {
                      setState(() => loading = true);
                      await load();
                    }
                  } else {
                    _showMessage('Login response did not include an access token.');
                  }
                } else {
                  _showMessage('Login failed (${response.statusCode}). Check credentials and backend.');
                }
              } catch (_) {
                _showMessage('Cannot connect to backend at $apiBase.');
              }
            },
            child: const Text('Login'),
          ),
        ],
      ),
    );

    emailController.dispose();
    passwordController.dispose();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    if (!mounted) return;
    setState(() {
      token = null;
      data = <String, dynamic>{};
      errorMessage = null;
    });
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Widget metricCard(String title, String value, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: <Widget>[
            Icon(icon, size: 30, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(title, style: const TextStyle(color: Colors.grey)),
                  const SizedBox(height: 8),
                  Text(
                    value,
                    style: const TextStyle(fontSize: 25, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<List<http.Response>> _bookingAnalytics() {
    final headers = <String, String>{'Authorization': 'Bearer $token'};
    return Future.wait(<Future<http.Response>>[
      http.get(Uri.parse('$apiBase/api/analytics/bookings/monthly'), headers: headers),
      http.get(Uri.parse('$apiBase/api/analytics/bookings/time-wise'), headers: headers),
      http.get(Uri.parse('$apiBase/api/analytics/bookings/category'), headers: headers),
    ]);
  }

  Widget bookingAnalytics() {
    return FutureBuilder<List<http.Response>>(
      future: _bookingAnalytics(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return const Text('Booking analytics unavailable.');
        }

        final responses = snapshot.data!;
        if (responses.any((response) => response.statusCode != 200)) {
          return const Text('Booking analytics unavailable for this account.');
        }

        final monthly = jsonDecode(responses[0].body);
        final times = jsonDecode(responses[1].body);
        final categories = jsonDecode(responses[2].body);
        if (monthly is! List || times is! List || categories is! List) {
          return const Text('Unexpected booking analytics response.');
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text('Monthly', style: TextStyle(fontWeight: FontWeight.bold)),
            for (final item in monthly.take(6))
              ListTile(
                dense: true,
                title: Text('${item['month'] ?? 'Unknown month'}'),
                trailing: Text('${item['bookings'] ?? 0} bookings'),
              ),
            const Text('Peak hours', style: TextStyle(fontWeight: FontWeight.bold)),
            for (final item in times.take(5))
              ListTile(
                dense: true,
                title: Text('${item['label'] ?? 'Unknown time'}'),
                trailing: Text('${item['bookings'] ?? 0}'),
              ),
            const Text('Categories', style: TextStyle(fontWeight: FontWeight.bold)),
            for (final item in categories.take(5))
              ListTile(
                dense: true,
                title: Text('${item['category'] ?? 'Uncategorized'}'),
                trailing: Text('${item['bookings'] ?? 0} bookings'),
              ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('AgentOS Admin'),
        actions: <Widget>[
          if (token == null)
            IconButton(onPressed: login, icon: const Icon(Icons.login), tooltip: 'Sign in')
          else
            IconButton(onPressed: logout, icon: const Icon(Icons.logout), tooltip: 'Sign out'),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: token == null
            ? Center(
                child: FilledButton.icon(
                  onPressed: login,
                  icon: const Icon(Icons.login),
                  label: const Text('Sign in to workspace'),
                ),
              )
            : ListView(
                children: <Widget>[
                  const Text(
                    'Operations overview',
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 18),
                  if (errorMessage != null) ...<Widget>[
                    Text(errorMessage!, style: const TextStyle(color: Colors.red)),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: () {
                        setState(() => loading = true);
                        load();
                      },
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retry'),
                    ),
                  ],
                  metricCard('Conversations', '${data['total_conversations'] ?? 0}', Icons.forum_outlined),
                  metricCard('Messages', '${(data['events'] is Map ? data['events']['message'] : null) ?? 0}', Icons.message_outlined),
                  metricCard('Knowledge gaps', '${data['knowledge_gaps'] ?? 0}', Icons.find_in_page_outlined),
                  const SizedBox(height: 12),
                  const Text('Booking analytics', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  bookingAnalytics(),
                  const SizedBox(height: 12),
                  const Text(
                    'Connect this app to the same FastAPI backend for live tenant data.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
      ),
    );
  }
}

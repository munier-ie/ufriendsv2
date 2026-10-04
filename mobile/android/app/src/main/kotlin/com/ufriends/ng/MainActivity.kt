package com.ufriends.ng

import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity: FlutterFragmentActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        if (!flutterEngine.plugins.has(ContactPickerPlugin::class.java)) {
            flutterEngine.plugins.add(ContactPickerPlugin())
        }
    }
}

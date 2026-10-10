package com.ufriends.ng

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity: FlutterFragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Match Android 15+'s enforced behavior on older supported versions too.
        // Flutter screens already protect interactive content with SafeArea.
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        if (!flutterEngine.plugins.has(ContactPickerPlugin::class.java)) {
            flutterEngine.plugins.add(ContactPickerPlugin())
        }
    }
}

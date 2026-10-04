package com.ufriends.ng

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.PluginRegistry
import java.util.concurrent.Executors

/** Bridges Flutter to a permission-free, single phone-number selection. */
class ContactPickerPlugin : FlutterPlugin, ActivityAware,
    MethodChannel.MethodCallHandler, PluginRegistry.ActivityResultListener {
    private lateinit var channel: MethodChannel
    private var activityBinding: ActivityPluginBinding? = null
    private var pendingResult: MethodChannel.Result? = null
    private var isSession = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val queryExecutor = Executors.newSingleThreadExecutor()

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel = MethodChannel(binding.binaryMessenger, "com.ufriends.ng/contact_picker")
        channel.setMethodCallHandler(this)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        if (call.method != "pickPhoneNumber") {
            result.notImplemented()
            return
        }
        if (pendingResult != null) {
            result.error("picker_busy", "A contact picker is already open", null)
            return
        }
        val activity = activityBinding?.activity
        if (activity == null) {
            result.error("picker_unavailable", "No activity is available", null)
            return
        }
        pendingResult = result
        isSession = Build.VERSION.SDK_INT >= ContactPickerContract.ANDROID_17
        try {
            activity.startActivityForResult(
                ContactPickerContract.createIntent(Build.VERSION.SDK_INT),
                REQUEST_PICK_PHONE
            )
        } catch (_: ActivityNotFoundException) {
            finishError("picker_unavailable", "No contact picker is available")
        } catch (_: Exception) {
            finishError("picker_failed", "Could not open the contact picker")
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        if (requestCode != REQUEST_PICK_PHONE) return false
        val result = pendingResult ?: return true
        if (resultCode != Activity.RESULT_OK) {
            pendingResult = null
            result.success(null)
            return true
        }
        val uri = data?.data
        val resolver = activityBinding?.activity?.contentResolver
        if (uri == null || resolver == null) {
            finishError("picker_failed", "The picker returned no contact data")
            return true
        }
        val session = isSession
        // Consume the temporary URI grant immediately, off the UI thread.
        queryExecutor.execute {
            val number = runCatching {
                ContactPickerContract.readPhoneNumber(resolver, uri, session)
            }
            mainHandler.post {
                if (pendingResult === result) {
                    pendingResult = null
                    number.fold(
                        onSuccess = { result.success(it) },
                        onFailure = {
                            result.error("picker_failed", "Could not read the selected phone number", null)
                        }
                    )
                }
            }
        }
        return true
    }

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        activityBinding = binding
        binding.addActivityResultListener(this)
    }

    override fun onDetachedFromActivityForConfigChanges() {
        detachActivity()
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        onAttachedToActivity(binding)
    }

    override fun onDetachedFromActivity() {
        detachActivity()
        finishError("picker_unavailable", "The activity was closed")
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        detachActivity()
        finishError("picker_unavailable", "The app was closed")
        channel.setMethodCallHandler(null)
        queryExecutor.shutdown()
    }

    private fun detachActivity() {
        activityBinding?.removeActivityResultListener(this)
        activityBinding = null
    }

    private fun finishError(code: String, message: String) {
        val result = pendingResult
        pendingResult = null
        result?.error(code, message, null)
    }

    private companion object {
        const val REQUEST_PICK_PHONE = 7137
    }
}

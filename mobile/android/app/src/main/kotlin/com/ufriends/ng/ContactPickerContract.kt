package com.ufriends.ng

import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.provider.ContactsContract.Data

internal object ContactPickerContract {
    const val ANDROID_17 = 37

    // Public ContactsPickerSessionContract wire values allow compiling with SDK 36.
    // Only send them on Android 17+; no reflection or READ_CONTACTS is needed.
    // https://developer.android.com/reference/android/provider/ContactsPickerSessionContract
    const val ACTION_PICK_CONTACTS = "android.provider.action.PICK_CONTACTS"
    private const val EXTRA_REQUESTED_DATA_FIELDS =
        "android.provider.extra.PICK_CONTACTS_REQUESTED_DATA_FIELDS"
    private const val EXTRA_SELECTION_LIMIT =
        "android.provider.extra.PICK_CONTACTS_SELECTION_LIMIT"

    fun createIntent(sdkVersion: Int): Intent =
        if (sdkVersion >= ANDROID_17) {
            Intent(ACTION_PICK_CONTACTS).apply {
                putStringArrayListExtra(
                    EXTRA_REQUESTED_DATA_FIELDS,
                    arrayListOf(Phone.CONTENT_ITEM_TYPE)
                )
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
                putExtra(EXTRA_SELECTION_LIMIT, 1)
            }
        } else {
            Intent(Intent.ACTION_PICK).apply { type = Phone.CONTENT_TYPE }
        }

    fun readPhoneNumber(
        resolver: ContentResolver,
        resultUri: Uri,
        isSession: Boolean
    ): String {
        require(resultUri.scheme == ContentResolver.SCHEME_CONTENT) {
            "Expected a contact picker content URI"
        }
        val projection = if (isSession) {
            arrayOf(Data.MIMETYPE, Data.DATA1)
        } else {
            arrayOf(Phone.NUMBER)
        }
        // Query only the user-granted URI. Session URIs forbid selection/selectionArgs.
        val numbers = linkedSetOf<String>()
        resolver.query(resultUri, projection, null, null, null)?.use { cursor ->
            val numberColumn = cursor.getColumnIndexOrThrow(
                if (isSession) Data.DATA1 else Phone.NUMBER
            )
            val mimeColumn = if (isSession) cursor.getColumnIndexOrThrow(Data.MIMETYPE) else -1
            while (cursor.moveToNext()) {
                if (!isSession || cursor.getString(mimeColumn) == Phone.CONTENT_ITEM_TYPE) {
                    cursor.getString(numberColumn)?.trim()?.takeIf { it.isNotEmpty() }
                        ?.let(numbers::add)
                }
            }
        }
        // Never silently choose an arbitrary recipient if a provider returns extra numbers.
        check(numbers.size == 1) { "Expected one selected phone number" }
        return numbers.single()
    }
}

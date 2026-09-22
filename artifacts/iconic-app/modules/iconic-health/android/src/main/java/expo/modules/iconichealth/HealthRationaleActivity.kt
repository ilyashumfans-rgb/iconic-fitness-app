package expo.modules.iconichealth

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle

/** OS-invoked rationale, not a React screen. URL is configured by the host config plugin. */
class HealthRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val url = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
      .metaData?.getString("expo.modules.iconichealth.PRIVACY_POLICY_URL")
    val dialog = AlertDialog.Builder(this)
      .setTitle("Health data access")
      .setMessage("Iconic Fitness reads the health categories you choose: steps, active calories, distance, sleep, heart rate and weight. These are used for your daily fitness dashboard. No health data is written. Your watch must sync through its own app to Health Connect. You can revoke access in Health Connect at any time.")
      .setPositiveButton("Done") { _, _ -> finish() }
      .setOnCancelListener { finish() }
    if (url != null && Uri.parse(url).scheme == "https") {
      dialog.setNeutralButton("Privacy policy") { _, _ ->
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        catch (_: android.content.ActivityNotFoundException) {
          AlertDialog.Builder(this).setMessage("Open this privacy policy in a browser: $url")
            .setPositiveButton("Done") { _, _ -> finish() }.show()
          return@setNeutralButton
        }
        finish()
      }
    }
    dialog.show()
  }
}
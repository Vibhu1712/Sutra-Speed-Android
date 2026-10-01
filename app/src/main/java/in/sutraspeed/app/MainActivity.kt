package `in`.sutraspeed.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import java.io.File

/**
 * Sutra Speed is a self-contained offline app: the whole interface lives in assets/,
 * and this activity is the shell that hosts it and owns the saved progress file.
 *
 * Nothing leaves the device. There is no network permission in the manifest, so even a
 * mistake in the web layer cannot send anything anywhere.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        web = WebView(this)
        setContentView(web)

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            // keep the app's own type scale regardless of the system font setting
            textZoom = 100
        }
        web.setBackgroundColor(0xFFF5EFE3.toInt())
        web.isVerticalScrollBarEnabled = false
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.addJavascriptInterface(Bridge(), "Android")
        // Serve assets over https://appassets.androidplatform.net/assets/ so that fetch()
        // can read lessons.json and questions.json. fetch() does not work on file:// URLs.
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
        }
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.onAndroidBack && window.onAndroidBack()", null)
            }
        })
    }

    private fun stateFile() = File(filesDir, "progress.json")

    inner class Bridge {

        /** Progress as JSON, or an empty string on a first run. */
        @JavascriptInterface
        fun load(): String = try {
            if (stateFile().exists()) stateFile().readText() else ""
        } catch (e: Exception) {
            ""
        }

        /** Written to the app's private storage: streaks, badges, drill and topic statistics. */
        @JavascriptInterface
        fun save(json: String) {
            try {
                stateFile().writeText(json)
            } catch (e: Exception) {
                // Losing one save is better than crashing mid-drill; the next save will retry.
            }
        }

        @JavascriptInterface
        fun finishApp() {
            runOnUiThread { finish() }
        }
    }
}

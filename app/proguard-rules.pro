# The web layer calls into Bridge by name, so its methods must survive shrinking.
-keepclassmembers class in.sutraspeed.app.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}

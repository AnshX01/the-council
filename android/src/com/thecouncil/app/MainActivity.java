package com.thecouncil.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREFS_NAME = "council_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_USB_URL = "http://localhost:3000";
    private static final String DEFAULT_WIFI_URL = "http://192.168.1.21:3000";

    private WebView mWebView;
    private FrameLayout mContainer;
    private LinearLayout mErrorLayout;
    private ProgressBar mProgressBar;
    private TextView mErrorDetail;
    private String mCurrentUrl;
    private boolean mAttemptedWifiFallback = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark system bars (Atlas DNA pure black)
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        window.setStatusBarColor(0xFF000000);
        window.setNavigationBarColor(0xFF000000);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = window.getDecorView();
            int flags = decor.getSystemUiVisibility();
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            decor.setSystemUiVisibility(flags);
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        mCurrentUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_USB_URL);

        setupViews();
        loadServerUrl(mCurrentUrl);
    }

    private void setupViews() {
        mContainer = new FrameLayout(this);
        mContainer.setBackgroundColor(0xFF000000);

        // WebView setup
        mWebView = new WebView(this);
        mWebView.setBackgroundColor(0xFF000000);
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(mWebView, true);
        }
        CookieManager.getInstance().setAcceptCookie(true);

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (mProgressBar != null) {
                    if (newProgress < 100) {
                        mProgressBar.setVisibility(View.VISIBLE);
                        mProgressBar.setProgress(newProgress);
                    } else {
                        mProgressBar.setVisibility(View.GONE);
                    }
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                return super.onConsoleMessage(cm);
            }
        });

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                hideErrorScreen();
                // Save successful URL
                getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_SERVER_URL, url)
                    .apply();
                mAttemptedWifiFallback = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    handleMainFrameError(request.getUrl().toString());
                }
            }
        });

        mContainer.addView(mWebView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        // Top progress bar
        mProgressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        mProgressBar.setMax(100);
        mProgressBar.setProgress(0);
        mProgressBar.setVisibility(View.GONE);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 8);
        pbParams.gravity = Gravity.TOP;
        mContainer.addView(mProgressBar, pbParams);

        // Error / Connection screen
        setupErrorLayout();
        mContainer.addView(mErrorLayout, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(mContainer);
    }

    private void setupErrorLayout() {
        mErrorLayout = new LinearLayout(this);
        mErrorLayout.setOrientation(LinearLayout.VERTICAL);
        mErrorLayout.setBackgroundColor(0xFF000000);
        mErrorLayout.setGravity(Gravity.CENTER);
        mErrorLayout.setPadding(48, 48, 48, 48);
        mErrorLayout.setVisibility(View.GONE);

        TextView title = new TextView(this);
        title.setText("The Council");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER);
        mErrorLayout.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Deliberation Chamber Offline");
        subtitle.setTextColor(0xFF71717A);
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 8, 0, 32);
        mErrorLayout.addView(subtitle);

        mErrorDetail = new TextView(this);
        mErrorDetail.setText("Cannot connect to server at:\n" + mCurrentUrl);
        mErrorDetail.setTextColor(0xFFA1A1AA);
        mErrorDetail.setTextSize(13);
        mErrorDetail.setGravity(Gravity.CENTER);
        mErrorDetail.setPadding(0, 0, 0, 24);
        mErrorLayout.addView(mErrorDetail);

        // USB connect button
        Button btnUsb = new Button(this);
        btnUsb.setText("Connect via USB (localhost:3000)");
        btnUsb.setBackgroundColor(0xFF18181B);
        btnUsb.setTextColor(0xFFE4E4E7);
        btnUsb.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                loadServerUrl(DEFAULT_USB_URL);
            }
        });
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btnParams.setMargins(0, 0, 0, 16);
        mErrorLayout.addView(btnUsb, btnParams);

        // Wi-Fi connect button
        Button btnWifi = new Button(this);
        btnWifi.setText("Connect via Wi-Fi (192.168.1.21:3000)");
        btnWifi.setBackgroundColor(0xFF18181B);
        btnWifi.setTextColor(0xFFE4E4E7);
        btnWifi.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                loadServerUrl(DEFAULT_WIFI_URL);
            }
        });
        mErrorLayout.addView(btnWifi, btnParams);

        // Retry button
        Button btnRetry = new Button(this);
        btnRetry.setText("Retry Connection");
        btnRetry.setBackgroundColor(0xFF27272A);
        btnRetry.setTextColor(0xFFFFFFFF);
        btnRetry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                loadServerUrl(mCurrentUrl);
            }
        });
        mErrorLayout.addView(btnRetry, btnParams);

        // Custom URL button
        Button btnCustom = new Button(this);
        btnCustom.setText("Set Custom Server URL...");
        btnCustom.setBackgroundColor(0xFF111113);
        btnCustom.setTextColor(0xFF71717A);
        btnCustom.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                promptCustomUrl();
            }
        });
        mErrorLayout.addView(btnCustom, btnParams);
    }

    private void handleMainFrameError(String failedUrl) {
        // Automatic fallback from localhost to WiFi if connected to same router
        if (failedUrl.contains("localhost") && !mAttemptedWifiFallback) {
            mAttemptedWifiFallback = true;
            Toast.makeText(this, "Trying Wi-Fi connection (192.168.1.21:3000)...", Toast.LENGTH_SHORT).show();
            loadServerUrl(DEFAULT_WIFI_URL);
            return;
        }

        showErrorScreen(failedUrl);
    }

    private void showErrorScreen(String url) {
        if (mErrorDetail != null) {
            mErrorDetail.setText("Cannot connect to server at:\n" + url + "\n\nMake sure the Next.js server is running on your PC.");
        }
        if (mErrorLayout != null) {
            mErrorLayout.setVisibility(View.VISIBLE);
        }
        if (mWebView != null) {
            mWebView.setVisibility(View.GONE);
        }
    }

    private void hideErrorScreen() {
        if (mErrorLayout != null) {
            mErrorLayout.setVisibility(View.GONE);
        }
        if (mWebView != null) {
            mWebView.setVisibility(View.VISIBLE);
        }
    }

    private void loadServerUrl(String url) {
        mCurrentUrl = url;
        hideErrorScreen();
        if (mWebView != null) {
            mWebView.loadUrl(url);
        }
    }

    private void promptCustomUrl() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Enter Server URL");
        final EditText input = new EditText(this);
        input.setText(mCurrentUrl);
        builder.setView(input);
        builder.setPositiveButton("Connect", (dialog, which) -> {
            String newUrl = input.getText().toString().trim();
            if (!newUrl.isEmpty()) {
                if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                    newUrl = "http://" + newUrl;
                }
                loadServerUrl(newUrl);
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

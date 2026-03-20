package com.dotsandboxes.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean isBackPressInProgress = false;

    @Override
    public void onBackPressed() {
        if (isBackPressInProgress) return;
        isBackPressInProgress = true;

        // If Capacitor isn't ready yet, fall back to default behavior.
        if (bridge == null) {
            isBackPressInProgress = false;
            super.onBackPressed();
            return;
        }

        // Ask the web layer to handle the back press.
        // window.__androidBackPressed():
        //   - returns true  => web handled navigation
        //   - returns false => native should decide (usually go back or close)
        bridge.eval(
            "(function(){"
                + "try {"
                + "  if (typeof window.__androidBackPressed === 'function') {"
                + "    return window.__androidBackPressed();"
                + "  }"
                + "  return 'not_ready';"
                + "} catch (e) {"
                + "  return 'not_ready';"
                + "}"
                + "})();",
            (result) -> {
                runOnUiThread(() -> {
                    isBackPressInProgress = false;

                    String res = result == null ? "" : result.trim().replace("\"", "");
                    boolean handled = "true".equalsIgnoreCase(res) || "1".equals(res);

                    if ("not_ready".equalsIgnoreCase(res)) {
                        // If web handler is not ready, use default Capacitor/Android behavior
                        super.onBackPressed();
                    } else if (!handled) {
                        // Web layer explicitly didn't handle it, use default behavior
                        super.onBackPressed();
                    }
                });
            }
        );
    }
}

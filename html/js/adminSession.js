// Shared by every admin page.
// - Keeps the sign-in alive while an admin page is open, so a long edit
//   doesn't end in a failed save.
// - If the sign-in has ended anyway, shows a banner saying so, with a link
//   to sign in again in a new tab (so nothing typed on this page is lost).
(function () {
    var PING_EVERY_MS = 5 * 60 * 1000;
    var banner = null;

    function showSignedOut() {
        if (banner) {
            banner.style.display = 'block';
            return;
        }
        banner = document.createElement('div');
        banner.setAttribute('role', 'alert');
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:20000;padding:14px 20px;' +
            'background:#b3261e;color:#fff;font:16px/1.4 system-ui,sans-serif;text-align:center;' +
            'box-shadow:0 2px 8px rgba(0,0,0,.3)';
        banner.innerHTML = 'You have been signed out, so your last change was <strong>not saved</strong>. ' +
            '<a href="../signIn/signIn.php" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline;font-weight:bold">' +
            'Sign in again</a> (it opens in a new tab, so this page stays as it is), then come back here and save again.';
        document.body.appendChild(banner);
    }

    function hideSignedOut() {
        if (banner) {
            banner.style.display = 'none';
        }
    }

    function ping() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '../actions/sessionPing.php');
        xhr.onload = function () {
            try {
                if (JSON.parse(xhr.responseText).signedIn) {
                    hideSignedOut();
                } else {
                    showSignedOut();
                }
            } catch (e) { /* ignore a garbled answer; the next ping will tell */ }
        };
        xhr.send();
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (window.jQuery) {
            jQuery(document).ajaxError(function (event, xhr) {
                if (xhr.status === 401) {
                    showSignedOut();
                }
            });
        }
        setInterval(ping, PING_EVERY_MS);
        // Coming back to the tab (for example after signing in again)
        window.addEventListener('focus', ping);
    });
})();

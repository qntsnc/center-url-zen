// ==UserScript==
// @name           Center URL
// @version        1.2
// @description    Displays only the domain name in URL bar, centered
// @author         Claude
// @include        main
// @startup        center_url_startup
// @shutdown       center_url_shutdown
// @onlyonce
// ==/UserScript==

let urlObserver = null;
let currentDomain = "";

function center_url_startup() {
  try {
    if (window.document.readyState === "complete") {
      initScript();
    } else {
      window.addEventListener('load', initScript, { once: true });
    }
  } catch (e) {
    console.error("Center URL startup error:", e);
  }
}

function center_url_shutdown() {
  try {
    if (urlObserver) {
      urlObserver.disconnect();
      urlObserver = null;
    }
    
    // Remove CSS variable
    document.documentElement.style.removeProperty("--current-domain");
  } catch (e) {
    console.error("Center URL shutdown error:", e);
  }
}

function initScript() {
  try {
    // Create a MutationObserver to watch for URL changes
    urlObserver = new MutationObserver(() => updateURL());
    
    // Start observing urlbar for changes
    const urlbar = document.getElementById("urlbar-input");
    if (urlbar) {
      urlObserver.observe(urlbar, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
      });
      
      // Also observe the tab container for tab switches
      const tabContainer = gBrowser.tabContainer;
      if (tabContainer) {
        tabContainer.addEventListener("TabSelect", updateURL);
      }
      
      // Initial URL processing
      updateURL();
      
      console.log("Center URL script initialized successfully");
    } else {
      console.error("Could not find urlbar-input element");
    }
  } catch (e) {
    console.error("Error initializing Center URL script:", e);
  }
}

function updateURL() {
  try {
    // Get current URL
    let currentURL = "";
    
    try {
      if (gBrowser && gBrowser.selectedBrowser) {
        currentURL = gBrowser.selectedBrowser.currentURI.spec;
      }
    } catch (e) {
      console.error("Error getting URL from browser:", e);
    }
    
    // If that didn't work, try from the URL bar
    if (!currentURL) {
      const urlbar = document.getElementById("urlbar-input");
      if (urlbar && urlbar.value) {
        currentURL = urlbar.value;
      }
    }
    
    if (!currentURL) {
      return;
    }
    
    // Extract just the domain
    const domain = extractMainDomain(currentURL);
    
    // Update only if domain changed
    if (domain !== currentDomain) {
      currentDomain = domain;
      document.documentElement.style.setProperty("--current-domain", `"${domain}"`);
      console.log("Domain set to:", domain);
    }
  } catch (e) {
    console.error("Error updating URL:", e);
  }
}

function extractMainDomain(url) {
  try {
    // Handle special URLs
    if (url.startsWith("about:") || 
        url.startsWith("chrome:") || 
        url.startsWith("moz-extension:")) {
      return url.split(/[/?#]/)[0];
    }
    
    // Try to parse URL and extract hostname
    let hostname = "";
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname;
    } catch (e) {
      // If URL parsing fails, try a simple extraction
      const match = url.match(/^(?:https?:\/\/)?([^\/]+)/i);
      if (match && match[1]) {
        hostname = match[1];
      } else {
        return url; // Return original if we can't parse it
      }
    }
    
    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }
    
    // Extract main domain from hostname
    const parts = hostname.split(".");
    
    // Keep only the main domain
    if (parts.length >= 2) {
      // Handle special TLDs like .co.uk, .com.br etc.
      if (parts.length > 2 && 
          parts[parts.length-1].length === 2 && 
          ["co", "com", "org", "net", "gov", "edu"].includes(parts[parts.length-2])) {
        // For cases like example.co.uk, return example.co.uk
        return parts.slice(-3).join(".");
      } else {
        // For normal domains like example.com or sub.example.com, return example.com
        return parts.slice(-2).join(".");
      }
    }
    
    return hostname;
  } catch (e) {
    console.error("Error extracting domain:", e);
    return url;
  }
}

// Initialize on script load
if (typeof _ucUtils !== 'undefined') {
  _ucUtils.startupFinished();
} 
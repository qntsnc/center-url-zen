// ==UserScript==
// @name           Center URL
// @version        1.3
// @description    Displays only the domain name in URL bar, centered
// @author         Claude
// @include        main
// @startup        center_url_startup
// @shutdown       center_url_shutdown
// @onlyonce
// ==/UserScript==

let urlObserver = null;
let currentDomain = "";
let cssAdded = false;

function center_url_startup() {
  try {
    console.log("Center URL mod starting up...");
    
    // Apply our CSS directly to ensure it's loaded
    applyCSS();
    
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
    console.log("Center URL mod shutting down...");
    
    if (urlObserver) {
      urlObserver.disconnect();
      urlObserver = null;
    }
    
    // Remove CSS variable
    document.documentElement.style.removeProperty("--current-domain");
    
    // Remove our added style element
    const styleEl = document.getElementById("center-url-style");
    if (styleEl) {
      styleEl.remove();
    }
  } catch (e) {
    console.error("Center URL shutdown error:", e);
  }
}

// Apply CSS directly to ensure it's loaded
function applyCSS() {
  if (cssAdded) return;
  
  try {
    const css = `
      /* Center URL CSS styles */
      :root {
        --current-domain: "";
      }
      
      /* Method 1: Modify the actual URL bar */
      #urlbar-input-container #urlbar-input {
        color: transparent !important;
      }
      
      #urlbar-input-container::after {
        content: var(--current-domain) !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        font-size: 14px !important;
        color: inherit !important;
        z-index: 100 !important;
        pointer-events: none !important;
        white-space: nowrap !important;
      }
      
      /* Method 2: Alternative selectors for different browser versions */
      #urlbar::after {
        content: var(--current-domain) !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        font-size: 14px !important;
        color: inherit !important;
        z-index: 100 !important;
        pointer-events: none !important;
        white-space: nowrap !important;
      }
    `;
    
    const styleEl = document.createElement("style");
    styleEl.id = "center-url-style";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    cssAdded = true;
    console.log("Center URL CSS applied directly");
  } catch (e) {
    console.error("Error applying CSS:", e);
  }
}

function initScript() {
  try {
    console.log("Initializing Center URL script...");
    
    // Analyze DOM to find the right elements
    analyzeDOM();
    
    // Create a MutationObserver to watch for URL changes
    urlObserver = new MutationObserver(() => {
      console.log("URL change detected");
      updateURL();
    });
    
    // Find URL bar element with multiple selectors to ensure compatibility
    const urlInputs = [
      document.getElementById("urlbar-input"),
      document.querySelector("#urlbar input"),
      document.querySelector(".urlbar-input")
    ];
    
    // Find the first valid element
    const urlbar = urlInputs.find(el => el !== null);
    
    if (urlbar) {
      console.log("Found URL bar element:", urlbar);
      urlObserver.observe(urlbar, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
      });
      
      // Also try to observe the tab container for tab switches
      if (typeof gBrowser !== 'undefined' && gBrowser.tabContainer) {
        console.log("Found tab container, adding listener");
        gBrowser.tabContainer.addEventListener("TabSelect", updateURL);
      }
      
      // Initial URL processing
      updateURL();
      console.log("Center URL script initialized successfully");
    } else {
      console.error("Could not find any URL bar element");
    }
  } catch (e) {
    console.error("Error initializing Center URL script:", e);
  }
}

// Analyze DOM to help with debugging
function analyzeDOM() {
  try {
    console.log("Analyzing DOM structure for debugging...");
    
    // Look for URL bar related elements
    const urlbar = document.getElementById("urlbar");
    console.log("Element #urlbar exists:", !!urlbar);
    
    const urlbarInput = document.getElementById("urlbar-input");
    console.log("Element #urlbar-input exists:", !!urlbarInput);
    
    const urlbarContainer = document.getElementById("urlbar-input-container");
    console.log("Element #urlbar-input-container exists:", !!urlbarContainer);
    
    // List alternative selectors
    const altUrlInput = document.querySelector("#urlbar input");
    console.log("Element #urlbar input exists:", !!altUrlInput);
    
    // Look for navigation elements
    if (typeof gBrowser !== 'undefined') {
      console.log("gBrowser exists:", !!gBrowser);
      if (gBrowser) {
        console.log("gBrowser.tabContainer exists:", !!gBrowser.tabContainer);
      }
    } else {
      console.log("gBrowser not found");
    }
  } catch (e) {
    console.error("Error analyzing DOM:", e);
  }
}

function updateURL() {
  try {
    // Get current URL
    let currentURL = "";
    
    // Try multiple methods to get the current URL
    try {
      if (typeof gBrowser !== 'undefined' && gBrowser && gBrowser.selectedBrowser) {
        currentURL = gBrowser.selectedBrowser.currentURI.spec;
        console.log("Got URL from gBrowser:", currentURL);
      }
    } catch (e) {
      console.error("Error getting URL from browser:", e);
    }
    
    // If that didn't work, try from the URL bar
    if (!currentURL) {
      // Try multiple selectors to find the URL input
      const selectors = [
        "#urlbar-input",
        "#urlbar input",
        ".urlbar-input"
      ];
      
      for (const selector of selectors) {
        const input = document.querySelector(selector);
        if (input && input.value) {
          currentURL = input.value;
          console.log("Got URL from selector", selector, ":", currentURL);
          break;
        }
      }
    }
    
    if (!currentURL) {
      console.log("Could not get current URL");
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
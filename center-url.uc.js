// ==UserScript==
// @name           Center URL
// @version        1.1
// @description    Extracts domain from URL and sets it as CSS variable for styling
// @author         Claude
// @include        main
// @startup        center_url_startup
// @shutdown       center_url_shutdown
// @onlyonce
// ==/UserScript==

let domainObserver = null;
let tabUpdateHandlerId = null;
let tabSelectHandlerId = null;
let lastURLChecked = "";
let clickListener = null;
const MAX_DOMAIN_LENGTH = 30;

function center_url_startup() {
  try {
    if (typeof window !== 'undefined' && window.document) {
      window.addEventListener('load', initializeURLHandler, { once: true });
    }
  } catch (e) {
    console.error("Error in center-url startup:", e);
  }
}

function center_url_shutdown() {
  try {
    cleanupHandlers();
  } catch (e) {
    console.error("Error in center-url shutdown:", e);
  }
}

function cleanupHandlers() {
  if (domainObserver) {
    domainObserver.disconnect();
    domainObserver = null;
  }
  
  if (tabUpdateHandlerId && typeof gBrowser !== 'undefined') {
    gBrowser.tabContainer.removeEventListener("TabAttrModified", handleTabUpdate);
    tabUpdateHandlerId = null;
  }
  
  if (tabSelectHandlerId && typeof gBrowser !== 'undefined') {
    gBrowser.tabContainer.removeEventListener("TabSelect", handleTabSelect);
    tabSelectHandlerId = null;
  }
  
  if (clickListener && typeof gBrowser !== 'undefined') {
    gBrowser.tabContainer.removeEventListener("click", handleTabClick);
    clickListener = null;
  }
}

function initializeURLHandler() {
  try {
    if (typeof gBrowser === 'undefined') {
      console.log("gBrowser not available, waiting...");
      setTimeout(initializeURLHandler, 1000);
      return;
    }

    // Clean up any existing handlers
    cleanupHandlers();
    
    // Set up multiple ways to detect URL changes
    setupURLObserver();
    setupTabHandlers();
    setupClickListener();
    
    // Initialize with current URL
    updateDomainFromCurrentTab();
    
    console.log("Center URL mod initialized successfully");
  } catch (e) {
    console.error("Error initializing center-url mod:", e);
  }
}

function setupURLObserver() {
  try {
    // Set up observer for URL bar changes
    domainObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" || mutation.type === "childList") {
          updateDomainFromCurrentTab();
          break;
        }
      }
    });
    
    const urlBar = document.getElementById("urlbar");
    if (urlBar) {
      domainObserver.observe(urlBar, { 
        attributes: true,
        childList: true,
        subtree: true
      });
    }
  } catch (e) {
    console.error("Error setting up URL observer:", e);
  }
}

function setupTabHandlers() {
  try {
    // Set up handlers for tab updates and selection
    if (typeof gBrowser !== 'undefined') {
      gBrowser.tabContainer.addEventListener("TabAttrModified", handleTabUpdate);
      tabUpdateHandlerId = true;
      
      gBrowser.tabContainer.addEventListener("TabSelect", handleTabSelect);
      tabSelectHandlerId = true;
    }
  } catch (e) {
    console.error("Error setting up tab handlers:", e);
  }
}

function setupClickListener() {
  try {
    // Set up click listener as another way to detect tab changes
    if (typeof gBrowser !== 'undefined') {
      gBrowser.tabContainer.addEventListener("click", handleTabClick);
      clickListener = true;
    }
  } catch (e) {
    console.error("Error setting up click listener:", e);
  }
}

function handleTabUpdate(event) {
  updateDomainFromCurrentTab();
}

function handleTabSelect(event) {
  updateDomainFromCurrentTab();
}

function handleTabClick(event) {
  // Small delay to ensure tab selection is complete
  setTimeout(updateDomainFromCurrentTab, 100);
}

function updateDomainFromCurrentTab() {
  try {
    let currentURL = getCurrentURL();
    
    // Skip if URL hasn't changed
    if (currentURL === lastURLChecked) {
      return;
    }
    
    lastURLChecked = currentURL;
    
    if (!currentURL) {
      console.log("No URL found");
      return;
    }
    
    const domain = extractDomain(currentURL);
    if (domain) {
      setDomainVariable(domain);
    }
  } catch (e) {
    console.error("Error updating domain from current tab:", e);
  }
}

function getCurrentURL() {
  try {
    // Method 1: Get URL from location bar
    const urlBar = document.getElementById("urlbar");
    if (urlBar && urlBar.value) {
      return urlBar.value;
    }
    
    // Method 2: Get URL from selected tab
    if (typeof gBrowser !== 'undefined' && gBrowser.selectedBrowser) {
      return gBrowser.selectedBrowser.currentURI.spec;
    }
    
    // Method 3: Get URL from location object
    if (window.content && window.content.location) {
      return window.content.location.href;
    }
    
    // Method 4: Get URL from active tab content
    if (typeof gBrowser !== 'undefined' && gBrowser.selectedTab && gBrowser.selectedTab.linkedBrowser) {
      return gBrowser.selectedTab.linkedBrowser.currentURI.spec;
    }
    
    return "";
  } catch (e) {
    console.error("Error getting current URL:", e);
    return "";
  }
}

function extractDomain(url) {
  try {
    if (!url) return "";
    
    // Handle special pages
    if (url.startsWith("about:") || url.startsWith("chrome:") || 
        url.startsWith("resource:") || url.startsWith("moz-extension:")) {
      return url.split(/[/?#]/)[0];
    }
    
    // Extract domain from URL
    let domain = "";
    
    try {
      // Simple and reliable domain extraction
      let urlObj = new URL(url);
      domain = urlObj.hostname;
      
      // Remove www. prefix if present
      if (domain.startsWith("www.")) {
        domain = domain.substring(4);
      }
      
      // Get just the main domain (e.g., example.com from sub.example.com)
      // This is a simplified approach that works for most cases
      let parts = domain.split('.');
      
      if (parts.length > 2) {
        // Check for country code TLDs (e.g., .co.uk, .com.au)
        let lastPart = parts[parts.length - 1];
        let secondLastPart = parts[parts.length - 2];
        
        // Special cases for known country TLDs
        if (lastPart.length === 2 && ['co', 'ac', 'org', 'gov', 'edu'].includes(secondLastPart)) {
          // For cases like example.co.uk, keep last three parts
          if (parts.length > 2) {
            domain = parts.slice(-3).join('.');
          }
        } else {
          // For regular domains like sub.example.com, keep last two parts
          domain = parts.slice(-2).join('.');
        }
      }
    } catch (e) {
      console.error("Error in URL parsing:", e);
      // Fallback to regex extraction
      const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
      domain = match ? match[1] : url;
    }
    
    // Truncate very long domains
    if (domain.length > MAX_DOMAIN_LENGTH) {
      domain = domain.substring(0, MAX_DOMAIN_LENGTH) + "...";
    }
    
    console.log("Extracted domain:", domain, "from URL:", url);
    return domain;
  } catch (e) {
    console.error("Error extracting domain:", e);
    return url; // Return the original URL as fallback
  }
}

function setDomainVariable(domain) {
  try {
    document.documentElement.style.setProperty("--current-domain", `"${domain}"`);
    console.log("Domain variable set:", domain);
  } catch (e) {
    console.error("Error setting domain variable:", e);
  }
}

// Initialize on script load
if (typeof _ucUtils !== 'undefined') {
  _ucUtils.startupFinished();
} 
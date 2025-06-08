// ==UserScript==
// @name           Center URL Bar Domain
// @version        1.4
// @description    Shows only domain in URL bar when not focused
// @author         qntsnc
// @include        main
// ==/UserScript==

// Настройки мода
const MOD_OPTIONS = {
  SHOW_DOMAIN_ONLY: "mod.center-url.show-domain-only",
  CENTER_URLBAR: "mod.center-url.center-urlbar",
  UPDATE_METHOD: "mod.center-url.update-method"
};

/**
 * Мод для отображения только домена в URL-баре Zen Browser
 */
class CenterUrlDomain {
  constructor() {
    this.init();
  }

  /**
   * Проверяет, включена ли определенная опция
   * @param {string} optionName - имя опции для проверки
   * @return {boolean} - состояние опции
   */
  isOptionEnabled(optionName) {
    try {
      // Проверяем, доступен ли Zen API
      if (typeof zen !== "undefined" && zen.preferences && zen.preferences.get) {
        return zen.preferences.get(optionName);
      }
      
      // Проверяем через Services.prefs
      if (Services && Services.prefs) {
        return Services.prefs.getBoolPref(optionName, true);
      }
      
      // Если API недоступен, возвращаем значение по умолчанию
      return true;
    } catch (e) {
      console.error("Error checking option:", e);
      return true;
    }
  }

  /**
   * Получает значение опции
   * @param {string} optionName - имя опции
   * @param {string} defaultValue - значение по умолчанию
   * @return {string} - значение опции
   */
  getOptionValue(optionName, defaultValue) {
    try {
      // Проверяем, доступен ли Zen API
      if (typeof zen !== "undefined" && zen.preferences && zen.preferences.get) {
        return zen.preferences.get(optionName) || defaultValue;
      }
      
      // Проверяем через Services.prefs
      if (Services && Services.prefs) {
        if (Services.prefs.getPrefType(optionName) === Services.prefs.PREF_STRING) {
          return Services.prefs.getStringPref(optionName, defaultValue);
        }
      }
      
      // Если API недоступен, возвращаем значение по умолчанию
      return defaultValue;
    } catch (e) {
      console.error("Error getting option value:", e);
      return defaultValue;
    }
  }

  /**
   * Извлекает домен из URL и упрощает его до основного домена
   * @param {string} url - URL для извлечения домена
   * @return {string} - основной домен или пустая строка
   */
  getDomainFromUrl(url) {
    try {
      // Обработка специальных URL
      if (url.startsWith("about:") || 
          url.startsWith("chrome:") || 
          url.startsWith("moz-extension:")) {
        return url.split(/[/?#]/)[0];
      }
      
      // Создаем объект URL для корректного парсинга
      const urlObj = new URL(url);
      let hostname = urlObj.hostname;
      
      // Удаляем www. префикс если есть
      if (hostname.startsWith("www.")) {
        hostname = hostname.substring(4);
      }
      
      // Выделяем основной домен из хоста
      const parts = hostname.split(".");
      
      // Сохраняем только основной домен
      if (parts.length >= 2) {
        // Обработка специальных TLD, таких как .co.uk, .com.br и т.д.
        if (parts.length > 2 && 
            parts[parts.length-1].length === 2 && 
            ["co", "com", "org", "net", "gov", "edu"].includes(parts[parts.length-2])) {
          // Для случаев типа example.co.uk
          return parts.slice(-3).join(".");
        } else {
          // Для обычных доменов, таких как example.com или sub.example.com
          return parts.slice(-2).join(".");
        }
      }
      
      return hostname;
    } catch (e) {
      // Если URL некорректный, пробуем простую регулярку
      try {
        const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
        if (match && match[1]) {
          return match[1];
        }
      } catch (regexError) {
        console.error("Error parsing URL with regex:", regexError);
      }
      
      console.error("Error parsing URL:", e);
      return url; // Возвращаем исходный URL если не смогли обработать
    }
  }

  /**
   * Обновляет отображаемый домен в URL-баре
   */
  updateDisplayedDomain() {
    // Проверяем, включена ли опция отображения только домена
    if (!this.isOptionEnabled(MOD_OPTIONS.SHOW_DOMAIN_ONLY)) {
      return; // Если нет, не обновляем домен
    }
    
    // Определяем метод обновления
    const method = this.getOptionValue(MOD_OPTIONS.UPDATE_METHOD, "auto");
    
    try {
      // Получаем текущий URL из активной вкладки
      const gBrowser = window.gBrowser;
      if (!gBrowser) return;
      
      const currentTab = gBrowser.selectedTab;
      if (!currentTab) return;
      
      const browser = gBrowser.getBrowserForTab(currentTab);
      if (!browser) return;
      
      const currentUrl = browser.currentURI?.spec || "";
      
      // Извлекаем домен
      const domain = this.getDomainFromUrl(currentUrl);
      
      // Устанавливаем CSS-переменную с доменом для отображения
      document.documentElement.style.setProperty("--current-domain", `"${domain}"`);
      console.log("Domain set to:", domain);
    } catch (e) {
      console.error("Error updating domain:", e);
      
      // Если метод "auto" или ошибка, пробуем альтернативный метод
      if (method === "auto" || method === "standard") {
        this.updateDisplayedDomainAlternative();
      }
    }
  }
  
  /**
   * Альтернативный метод обновления домена через DOM
   */
  updateDisplayedDomainAlternative() {
    try {
      const urlbar = document.getElementById("urlbar");
      if (!urlbar) return;
      
      const inputField = urlbar.querySelector(".urlbar-input");
      if (!inputField) return;
      
      const currentUrl = inputField.value;
      
      // Извлекаем домен
      const domain = this.getDomainFromUrl(currentUrl);
      
      // Устанавливаем CSS-переменную с доменом для отображения
      document.documentElement.style.setProperty("--current-domain", `"${domain}"`);
      console.log("Domain set to (alternative method):", domain);
    } catch (e) {
      console.error("Error updating domain (alternative method):", e);
    }
  }

  /**
   * Слушатель изменения настроек
   */
  onPrefChanged() {
    this.updateDisplayedDomain();
  }

  /**
   * Добавляет CSS стили напрямую
   */
  injectCSS() {
    try {
      const css = `
        /* URL-бар: только домен и центрирование */
        
        /* ПОЛНОСТЬЮ скрываем URL-текст в неактивном состоянии */
        #urlbar:not(:focus):not([focused]) .urlbar-input:not(:focus),
        #urlbar:not(:focus):not([focused]) input.urlbar-input:not(:focus),
        #urlbar:not(:focus):not([focused]) .urlbar-input,
        #urlbar:not(:focus):not([focused]) input {
            color: transparent !important;
            opacity: 0 !important;
            text-shadow: none !important;
            font-size: 0 !important; /* Делаем текст нулевого размера */
        }
        
        /* Отображаем домен через псевдоэлемент */
        #urlbar:not(:focus):not([focused]) .urlbar-input-container:after {
            /* Используем CSS-переменную для отображения текущего домена */
            content: var(--current-domain, ""); /* Значение по умолчанию - пустая строка */
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            color: currentColor !important;
            font-weight: bold !important;
            font-size: 14px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            pointer-events: none !important;
            z-index: 9999 !important;
            background: transparent !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 70% !important;
        }
        
        /* Возвращаем обычный вид при фокусе */
        #urlbar:focus .urlbar-input,
        #urlbar[focused] .urlbar-input,
        #urlbar .urlbar-input:focus {
            color: inherit !important;
            opacity: 1 !important;
            text-shadow: none !important;
            font-size: inherit !important;
            text-align: left !important;
        }
        
        /* Скрываем псевдоэлемент при фокусе */
        #urlbar:focus .urlbar-input-container:after,
        #urlbar[focused] .urlbar-input-container:after {
            content: "" !important;
            display: none !important;
        }
        
        /* Центрируем контейнер */
        .urlbar-input-container,
        #urlbar .urlbar-input-container {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            position: relative !important;
        }
      `;
      
      const styleEl = document.createElement("style");
      styleEl.id = "center-url-style";
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
      
      console.log("CSS styles injected successfully");
    } catch (e) {
      console.error("Error injecting CSS:", e);
    }
  }

  /**
   * Настраивает слушатели событий для отслеживания изменений URL
   */
  setupListeners() {
    console.log("Setting up event listeners");
    
    // Привязываем this к методам для использования в слушателях
    this.boundUpdateDomain = this.updateDisplayedDomain.bind(this);
    this.boundPrefChanged = this.onPrefChanged.bind(this);
    
    // Добавляем CSS-стили
    this.injectCSS();
    
    // Наблюдаем за изменениями вкладок
    const tabContainer = gBrowser.tabContainer;
    
    // Обновляем домен при смене активной вкладки
    tabContainer.addEventListener("TabSelect", this.boundUpdateDomain);
    
    // Обновляем домен при обновлении страницы
    this.progressListener = {
      onLocationChange: (aWebProgress, aRequest, aLocation, aFlags) => {
        this.updateDisplayedDomain();
      }
    };
    
    gBrowser.addProgressListener(this.progressListener);
    
    // Слушаем изменения настроек
    if (Services && Services.prefs) {
      Services.prefs.addObserver(MOD_OPTIONS.SHOW_DOMAIN_ONLY, this.boundPrefChanged);
      Services.prefs.addObserver(MOD_OPTIONS.CENTER_URLBAR, this.boundPrefChanged);
      Services.prefs.addObserver(MOD_OPTIONS.UPDATE_METHOD, this.boundPrefChanged);
    }
    
    // Поддержка Zen API
    if (typeof zen !== "undefined" && zen.preferences && zen.preferences.onChanged) {
      zen.preferences.onChanged.addListener((changes) => {
        if (changes[MOD_OPTIONS.SHOW_DOMAIN_ONLY] || 
            changes[MOD_OPTIONS.CENTER_URLBAR] ||
            changes[MOD_OPTIONS.UPDATE_METHOD]) {
          this.updateDisplayedDomain();
        }
      });
    }
    
    // Дополнительные слушатели для поддержки различных событий
    window.addEventListener("DOMContentLoaded", this.boundUpdateDomain);
    window.addEventListener("pageshow", this.boundUpdateDomain);
    window.addEventListener("load", this.boundUpdateDomain);
    
    // Обновляем домен при загрузке
    this.updateDisplayedDomain();
  }

  /**
   * Удаляет слушатели событий при выгрузке мода
   */
  cleanup() {
    if (this.boundUpdateDomain) {
      const tabContainer = gBrowser.tabContainer;
      tabContainer.removeEventListener("TabSelect", this.boundUpdateDomain);
      
      window.removeEventListener("DOMContentLoaded", this.boundUpdateDomain);
      window.removeEventListener("pageshow", this.boundUpdateDomain);
      window.removeEventListener("load", this.boundUpdateDomain);
      
      if (this.progressListener) {
        gBrowser.removeProgressListener(this.progressListener);
      }
      
      if (Services && Services.prefs && this.boundPrefChanged) {
        Services.prefs.removeObserver(MOD_OPTIONS.SHOW_DOMAIN_ONLY, this.boundPrefChanged);
        Services.prefs.removeObserver(MOD_OPTIONS.CENTER_URLBAR, this.boundPrefChanged);
        Services.prefs.removeObserver(MOD_OPTIONS.UPDATE_METHOD, this.boundPrefChanged);
      }
      
      // Удаляем CSS стили
      const styleEl = document.getElementById("center-url-style");
      if (styleEl) {
        styleEl.remove();
      }
    }
  }

  /**
   * Инициализация мода
   */
  init() {
    console.log("Initializing Center URL Domain mod");
    if (gBrowserInit.delayedStartupFinished) {
      this.setupListeners();
    } else {
      this.delayedListener = (subject, topic) => {
        if (topic === "browser-delayed-startup-finished" && subject === window) {
          Services.obs.removeObserver(this.delayedListener, "browser-delayed-startup-finished");
          this.setupListeners();
        }
      };
      Services.obs.addObserver(this.delayedListener, "browser-delayed-startup-finished");
    }
  }
}

// Создаем экземпляр мода
var centerUrlDomain = null;

// Startup handler
function center_url_startup() {
  try {
    console.log("Center URL Domain mod startup");
    if (!centerUrlDomain) {
      centerUrlDomain = new CenterUrlDomain();
    }
  } catch (e) {
    console.error("Error in center_url_startup:", e);
  }
}

// Shutdown handler
function center_url_shutdown() {
  try {
    console.log("Center URL Domain mod shutdown");
    if (centerUrlDomain) {
      centerUrlDomain.cleanup();
      centerUrlDomain = null;
    }
  } catch (e) {
    console.error("Error in center_url_shutdown:", e);
  }
}

// Автозапуск мода если не определены startup/shutdown хуки
if (typeof window !== 'undefined') {
  try {
    center_url_startup();
  } catch (e) {
    console.error("Error auto-starting Center URL Domain mod:", e);
  }
} 
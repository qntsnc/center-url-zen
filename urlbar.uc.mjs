// ==UserScript==
// @name           Center URL Bar Domain
// @version        1.2
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
export default class CenterUrlDomain {
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
   * Извлекает домен из URL
   * @param {string} url - URL для извлечения домена
   * @return {string} - домен или пустая строка
   */
  getDomainFromUrl(url) {
    try {
      // Создаем объект URL для корректного парсинга
      const urlObj = new URL(url);
      
      // Возвращаем хост (домен)
      return urlObj.hostname;
    } catch (e) {
      // Если URL некорректный, возвращаем пустую строку
      console.error("Error parsing URL:", e);
      return "";
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
   * Настраивает слушатели событий для отслеживания изменений URL
   */
  setupListeners() {
    // Привязываем this к методам для использования в слушателях
    this.boundUpdateDomain = this.updateDisplayedDomain.bind(this);
    this.boundPrefChanged = this.onPrefChanged.bind(this);
    
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
    }
  }

  /**
   * Инициализация мода
   */
  init() {
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
new CenterUrlDomain(); 
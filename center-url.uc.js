// ==UserScript==
// @name           Center URL - Domain Display
// @description    Sets the current domain CSS variable for the center-url mod
// @author         Claude
// @include        main
// @startup        center_url_startup
// @shutdown       center_url_shutdown
// ==/UserScript==

let centerURLInstance = null;

function center_url_startup() {
  try {
    console.log("Center URL mod starting up");
    if (!centerURLInstance) {
      centerURLInstance = new CenterURL();
      centerURLInstance.init();
    }
  } catch (e) {
    console.error("Error in center_url_startup:", e);
  }
}

function center_url_shutdown() {
  try {
    console.log("Center URL mod shutting down");
    if (centerURLInstance) {
      centerURLInstance.unload();
      centerURLInstance = null;
    }
  } catch (e) {
    console.error("Error in center_url_shutdown:", e);
  }
}

/**
 * Улучшенный скрипт для отображения только доменного имени в адресной строке
 * Этот скрипт обеспечивает надежное обновление CSS-переменной --current-domain 
 * при переключении вкладок и навигации
 */
class CenterURL {
  constructor() {
    // Кеширование состояния
    this.currentTabId = null;
    this.currentDomain = "";
    this.lastLocation = "";
    
    // Интервал проверки (мс)
    this.checkInterval = 100;
    this.intervalId = null;
    
    // Объект для отслеживания состояния вкладок и их доменов
    this.tabDomains = new Map();
    
    // Привязываем методы к this
    this.boundUpdateDomain = this.updateCurrentDomain.bind(this);
    this.boundOnTabChange = this.onTabChange.bind(this);
    this.boundOnLocationChange = this.onLocationChange.bind(this);
    this.boundCheckForChanges = this.checkForChanges.bind(this);
  }
  
  /**
   * Инициализация функциональности
   */
  init() {
    console.log("Center URL: Initializing...");
    
    // Добавляем CSS стили
    this.injectCSS();
    
    // Установка обработчиков событий для всех возможных случаев изменения URL
    this.setupEventListeners();
    
    // Запуск интервала для периодической проверки изменений URL
    this.startPolling();
    
    // Первоначальное обновление
    this.updateCurrentDomain();
    
    console.log("Center URL: Initialized successfully");
  }
  
  /**
   * Добавляет CSS стили напрямую в DOM
   */
  injectCSS() {
    try {
      // Удаляем предыдущие стили, если они есть
      let oldStyle = document.getElementById("center-url-css");
      if (oldStyle) {
        oldStyle.remove();
      }
      
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
      
      const styleElem = document.createElement("style");
      styleElem.id = "center-url-css";
      styleElem.textContent = css;
      document.head.appendChild(styleElem);
      
      console.log("Center URL: CSS styles injected");
    } catch (e) {
      console.error("Center URL: Error injecting CSS:", e);
    }
  }
  
  /**
   * Настройка слушателей событий
   */
  setupEventListeners() {
    try {
      // 1. Слушатели событий браузера
      if (typeof gBrowser !== 'undefined') {
        // Переключение вкладок
        gBrowser.tabContainer.addEventListener("TabSelect", this.boundOnTabChange);
        
        // Изменение URL
        gBrowser.addTabsProgressListener({
          onLocationChange: this.boundOnLocationChange
        });
        
        // При создании новой вкладки
        gBrowser.tabContainer.addEventListener("TabOpen", (e) => {
          // Небольшая задержка, чтобы дать вкладке загрузиться
          setTimeout(this.boundUpdateDomain, 100);
        });
      }
      
      // 2. Наблюдение за фокусом окна
      window.addEventListener("focus", this.boundUpdateDomain, true);
      
      // 3. Слушатель DOM-событий для отслеживания нажатий на элементы вкладок
      document.addEventListener("click", (e) => {
        // Проверка, если клик был по вкладке или внутри вкладки
        let el = e.target;
        while (el && el.tagName) {
          if (el.tagName.toLowerCase() === "tab" || 
              (el.classList && (el.classList.contains("tab") || el.classList.contains("tabbrowser-tab")))) {
            // Задержка, чтобы дать вкладке полностью активироваться
            setTimeout(this.boundUpdateDomain, 50);
            break;
          }
          el = el.parentElement;
        }
      });
      
      // 4. Отслеживание изменений в DOM адресной строки
      const urlbar = document.getElementById("urlbar-input") || document.getElementById("urlbar");
      if (urlbar) {
        // Создаем наблюдатель за изменениями атрибутов URL-бара
        const observer = new MutationObserver(this.boundUpdateDomain);
        
        // Наблюдаем за изменениями в значении и атрибутах
        observer.observe(urlbar, {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true
        });
      }
    } catch (e) {
      console.error("Center URL: Error setting up event listeners:", e);
    }
  }
  
  /**
   * Запуск периодической проверки URL
   */
  startPolling() {
    // Проверяем URL каждые 100мс как запасной вариант
    this.intervalId = setInterval(this.boundCheckForChanges, this.checkInterval);
  }
  
  /**
   * Проверка изменений в URL
   */
  checkForChanges() {
    try {
      // Получаем текущий URL
      const url = this.getCurrentURL();
      
      // Если URL изменился с последней проверки, обновляем домен
      if (url && url !== this.lastLocation) {
        this.lastLocation = url;
        this.updateCurrentDomain();
      }
      
      // Проверяем, не изменилась ли текущая вкладка
      if (typeof gBrowser !== 'undefined' && gBrowser.selectedTab) {
        const currentId = gBrowser.selectedTab.linkedPanel || gBrowser.selectedTab.id;
        
        if (this.currentTabId !== currentId) {
          this.currentTabId = currentId;
          this.updateCurrentDomain();
        }
      }
    } catch (e) {
      console.error("Center URL: Error checking for changes:", e);
    }
  }
  
  /**
   * Обработчик события переключения вкладки
   */
  onTabChange() {
    try {
      // Обновляем URL сразу после переключения вкладки
      this.updateCurrentDomain();
      
      // И еще раз через короткий промежуток времени для надежности
      setTimeout(this.boundUpdateDomain, 50);
    } catch (e) {
      console.error("Center URL: Error on tab change:", e);
    }
  }
  
  /**
   * Обработчик события изменения URL
   */
  onLocationChange(browser, webProgress, request, location, flags) {
    try {
      // Проверяем, является ли изменившийся браузер текущим
      if (browser === gBrowser.selectedBrowser) {
        const url = location ? location.spec : this.getCurrentURL();
        this.lastLocation = url;
        this.updateCurrentDomain();
      }
      
      // Сохраняем домен для этой вкладки в кеш
      if (browser && browser.getAttribute) {
        const tabId = browser.getAttribute("linkedpanel") || browser.id;
        if (tabId && location) {
          const domain = this.extractDomain(location.spec);
          this.tabDomains.set(tabId, domain);
        }
      }
    } catch (e) {
      console.error("Center URL: Error on location change:", e);
    }
  }
  
  /**
   * Пытается получить текущий URL различными методами
   */
  getCurrentURL() {
    let url = "";
    
    // Метод 1: через gBrowser API
    try {
      if (typeof gBrowser !== 'undefined' && gBrowser.selectedBrowser) {
        if (gBrowser.selectedBrowser.currentURI && gBrowser.selectedBrowser.currentURI.spec) {
          url = gBrowser.selectedBrowser.currentURI.spec;
          if (url) return url;
        }
      }
    } catch (e) {}
    
    // Метод 2: из адресной строки
    try {
      const urlbar = document.getElementById("urlbar-input") || document.getElementById("urlbar");
      if (urlbar) {
        if (urlbar.value) {
          url = urlbar.value;
        } else if (urlbar.textContent) {
          url = urlbar.textContent;
        }
        
        if (url) return url;
      }
    } catch (e) {}
    
    // Метод 3: из объекта location для текущей вкладки
    try {
      if (typeof gBrowser !== 'undefined' && gBrowser.selectedTab && gBrowser.selectedTab.linkedBrowser) {
        const browser = gBrowser.selectedTab.linkedBrowser;
        // Используем свойство contentWindow.location
        if (browser.contentWindow && browser.contentWindow.location) {
          url = browser.contentWindow.location.href;
          if (url) return url;
        }
      }
    } catch (e) {}
    
    // Метод 4: из кеша известных URL для вкладок
    try {
      if (typeof gBrowser !== 'undefined' && gBrowser.selectedTab) {
        const tabId = gBrowser.selectedTab.linkedPanel || gBrowser.selectedTab.id;
        if (tabId && this.tabDomains.has(tabId)) {
          // Возвращаем домен вместо полного URL, так как это всё, что нам нужно
          return "http://" + this.tabDomains.get(tabId);
        }
      }
    } catch (e) {}
    
    // Если все методы не сработали, возвращаем пустую строку
    return url;
  }
  
  /**
   * Обновляет текущий домен и CSS-переменную
   */
  updateCurrentDomain() {
    try {
      const url = this.getCurrentURL();
      
      if (url) {
        const domain = this.extractDomain(url);
        
        // Обновляем только если домен изменился
        if (domain !== this.currentDomain) {
          console.log("Center URL: Updating domain to", domain);
          this.currentDomain = domain;
          
          // Устанавливаем CSS-переменную для использования в стилях
          document.documentElement.style.setProperty("--current-domain", `"${domain}"`);
          
          // Кешируем домен для текущей вкладки
          if (typeof gBrowser !== 'undefined' && gBrowser.selectedTab) {
            const tabId = gBrowser.selectedTab.linkedPanel || gBrowser.selectedTab.id;
            if (tabId) {
              this.tabDomains.set(tabId, domain);
            }
          }
        }
      }
    } catch (e) {
      console.error("Center URL: Error updating domain:", e);
    }
  }
  
  /**
   * Извлекает домен из URL и упрощает его до основного домена
   */
  extractDomain(url) {
    try {
      // Обработка специальных URL
      if (url.startsWith("about:")) {
        return url.split("#")[0]; // Удаляем хеш-часть
      }
      
      if (url.startsWith("moz-extension:")) {
        return "Extension";
      }
      
      if (url.startsWith("view-source:")) {
        // Получаем домен из исходного URL после view-source:
        const sourceUrl = url.substring(12);
        return "Source: " + this.extractDomain(sourceUrl);
      }
      
      if (url.startsWith("file:")) {
        // Извлекаем имя файла из file:// URL
        const parts = url.split("/");
        return "File: " + parts[parts.length - 1];
      }
      
      if (url.startsWith("data:")) {
        return "Data URL";
      }
      
      // Извлекаем домен с помощью объекта URL
      try {
        const urlObj = new URL(url);
        let domain = urlObj.hostname;
        
        // Удаляем www. префикс для более чистого отображения
        if (domain.startsWith("www.")) {
          domain = domain.substring(4);
        }
        
        // Выделяем основной домен (убираем поддомены)
        const parts = domain.split(".");
        if (parts.length >= 2) {
          // Обработка специальных TLD вроде .co.uk, .com.br и т.д.
          if (parts.length > 2 && 
              parts[parts.length-1].length === 2 && 
              ["co", "com", "org", "net", "gov", "edu"].includes(parts[parts.length-2])) {
            // Для случаев вида example.co.uk
            return parts.slice(-3).join(".");
          } else {
            // Для обычных доменов вроде sub.example.com -> example.com
            return parts.slice(-2).join(".");
          }
        }
        
        // Обрезаем очень длинные домены
        if (domain.length > 40) {
          domain = domain.substring(0, 37) + "...";
        }
        
        return domain || url;
      } catch (e) {
        // Если парсинг URL не удался, используем регулярное выражение
        const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
        return match && match[1] ? match[1] : url;
      }
    } catch (e) {
      console.error("Center URL: Error extracting domain:", e);
      return url;
    }
  }
  
  /**
   * Очистка ресурсов при выгрузке
   */
  unload() {
    // Остановка интервала проверки
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Отписка от событий
    if (typeof gBrowser !== 'undefined') {
      gBrowser.tabContainer.removeEventListener("TabSelect", this.boundOnTabChange);
      gBrowser.removeTabsProgressListener({
        onLocationChange: this.boundOnLocationChange
      });
    }
    
    window.removeEventListener("focus", this.boundUpdateDomain, true);
    
    // Удаление стилей
    const styleElem = document.getElementById("center-url-css");
    if (styleElem) {
      styleElem.remove();
    }
    
    // Очистка карты доменов
    this.tabDomains.clear();
    
    console.log("Center URL: Unloaded");
  }
} 
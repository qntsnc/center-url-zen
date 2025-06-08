// ==UserScript==
// @name           Center URL - Domain Display
// @description    Sets the current domain CSS variable for the center-url mod
// @author         Claude
// @include        main
// ==/UserScript==

(function() {
  /**
   * Улучшенный скрипт для отображения только доменного имени в адресной строке
   * Этот скрипт обеспечивает надежное обновление CSS-переменной --current-domain 
   * при переключении вкладок и навигации
   */
  const CenterURL = {
    // Кеширование состояния
    currentTabId: null,
    currentDomain: "",
    lastLocation: "",
    
    // Интервал проверки (мс)
    checkInterval: 100,
    intervalId: null,
    
    // Объект для отслеживания состояния вкладок и их доменов
    tabDomains: new Map(),
    
    /**
     * Инициализация функциональности
     */
    init: function() {
      console.log("Center URL: Initializing...");
      
      // Установка обработчиков событий для всех возможных случаев изменения URL
      this.setupEventListeners();
      
      // Запуск интервала для периодической проверки изменений URL
      this.startPolling();
      
      // Первоначальное обновление
      this.updateCurrentDomain();
      
      console.log("Center URL: Initialized successfully");
    },
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners: function() {
      try {
        // 1. Слушатели событий браузера
        if (typeof gBrowser !== 'undefined') {
          // Переключение вкладок
          gBrowser.tabContainer.addEventListener("TabSelect", () => {
            this.onTabChange();
          });
          
          // Изменение URL
          gBrowser.addTabsProgressListener({
            onLocationChange: (browser, webProgress, request, location, flags) => {
              this.onLocationChange(browser, location);
            }
          });
          
          // При создании новой вкладки
          gBrowser.tabContainer.addEventListener("TabOpen", (e) => {
            const tab = e.target;
            // Небольшая задержка, чтобы дать вкладке загрузиться
            setTimeout(() => this.updateCurrentDomain(), 100);
          });
        }
        
        // 2. Наблюдение за фокусом окна
        window.addEventListener("focus", () => this.updateCurrentDomain(), true);
        
        // 3. Слушатель DOM-событий для отслеживания нажатий на элементы вкладок
        document.addEventListener("click", (e) => {
          // Проверка, если клик был по вкладке или внутри вкладки
          let el = e.target;
          while (el && el.tagName) {
            if (el.tagName.toLowerCase() === "tab" || 
                (el.classList && (el.classList.contains("tab") || el.classList.contains("tabbrowser-tab")))) {
              // Задержка, чтобы дать вкладке полностью активироваться
              setTimeout(() => this.updateCurrentDomain(), 50);
              break;
            }
            el = el.parentElement;
          }
        });
        
        // 4. Отслеживание изменений в DOM адресной строки
        const urlbar = document.getElementById("urlbar-input") || document.getElementById("urlbar");
        if (urlbar) {
          // Создаем наблюдатель за изменениями атрибутов URL-бара
          const observer = new MutationObserver(() => {
            this.updateCurrentDomain();
          });
          
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
    },
    
    /**
     * Запуск периодической проверки URL
     */
    startPolling: function() {
      // Проверяем URL каждые 100мс как запасной вариант
      this.intervalId = setInterval(() => {
        this.checkForChanges();
      }, this.checkInterval);
    },
    
    /**
     * Проверка изменений в URL
     */
    checkForChanges: function() {
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
    },
    
    /**
     * Обработчик события переключения вкладки
     */
    onTabChange: function() {
      try {
        // Обновляем URL сразу после переключения вкладки
        this.updateCurrentDomain();
        
        // И еще раз через короткий промежуток времени для надежности
        setTimeout(() => this.updateCurrentDomain(), 50);
      } catch (e) {
        console.error("Center URL: Error on tab change:", e);
      }
    },
    
    /**
     * Обработчик события изменения URL
     */
    onLocationChange: function(browser, location) {
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
    },
    
    /**
     * Пытается получить текущий URL различными методами
     */
    getCurrentURL: function() {
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
    },
    
    /**
     * Обновляет текущий домен и CSS-переменную
     */
    updateCurrentDomain: function() {
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
    },
    
    /**
     * Извлекает домен из URL
     */
    extractDomain: function(url) {
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
    },
    
    /**
     * Очистка ресурсов при выгрузке
     */
    unload: function() {
      // Остановка интервала проверки
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // Очистка карты доменов
      this.tabDomains.clear();
      
      console.log("Center URL: Unloaded");
    }
  };
  
  // Инициализация при загрузке страницы
  if (document.readyState === "complete") {
    CenterURL.init();
  } else {
    window.addEventListener("load", () => CenterURL.init(), { once: true });
  }
  
  // Очистка при выгрузке окна
  window.addEventListener("unload", () => {
    CenterURL.unload();
  }, { once: true });
})(); 
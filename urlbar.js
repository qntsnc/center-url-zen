// Настройки мода
const MOD_OPTIONS = {
  SHOW_DOMAIN_ONLY: "mod.center-url.show-domain-only",
  CENTER_URLBAR: "mod.center-url.center-urlbar",
  UPDATE_METHOD: "mod.center-url.update-method"
};

// Функция для проверки включенной опции
function isOptionEnabled(optionName) {
  try {
    // Проверяем, доступен ли Zen API для доступа к настройкам
    if (typeof zen !== "undefined" && zen.preferences && zen.preferences.get) {
      return zen.preferences.get(optionName);
    } else if (typeof Services !== "undefined" && Services.prefs) {
      // Если Zen API недоступен, используем Services.prefs
      return Services.prefs.getBoolPref(optionName, true);
    } else {
      // Используем значение по умолчанию, если API недоступен
      return true;
    }
  } catch (e) {
    console.error("Error checking option:", e);
    return true;
  }
}

// Функция для получения значения опции
function getOptionValue(optionName, defaultValue) {
  try {
    // Проверяем, доступен ли Zen API для доступа к настройкам
    if (typeof zen !== "undefined" && zen.preferences && zen.preferences.get) {
      return zen.preferences.get(optionName) || defaultValue;
    } else if (typeof Services !== "undefined" && Services.prefs) {
      // Если Zen API недоступен, используем Services.prefs
      if (Services.prefs.getPrefType(optionName) === Services.prefs.PREF_STRING) {
        return Services.prefs.getStringPref(optionName, defaultValue);
      }
    }
    // Используем значение по умолчанию, если API недоступен
    return defaultValue;
  } catch (e) {
    console.error("Error getting option value:", e);
    return defaultValue;
  }
}

// Функция для извлечения домена из URL
function getDomainFromUrl(url) {
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

// Функция для обновления отображаемого домена (стандартный метод)
function updateDisplayedDomainStandard() {
  // Проверяем, включена ли опция отображения только домена
  if (!isOptionEnabled(MOD_OPTIONS.SHOW_DOMAIN_ONLY)) {
    return; // Если нет, не обновляем домен
  }
  
  // Получаем текущий URL из адресной строки
  const urlbar = document.getElementById("urlbar");
  if (!urlbar) return;
  
  const inputField = urlbar.querySelector(".urlbar-input");
  if (!inputField) return;
  
  const currentUrl = inputField.value;
  
  // Извлекаем домен
  const domain = getDomainFromUrl(currentUrl);
  
  // Устанавливаем CSS-переменную с доменом для отображения
  document.documentElement.style.setProperty("--current-domain", `"${domain}"`);
}

// Функция для обновления отображаемого домена (устаревший метод)
function updateDisplayedDomainLegacy() {
  // Проверяем, включена ли опция отображения только домена
  if (!isOptionEnabled(MOD_OPTIONS.SHOW_DOMAIN_ONLY)) {
    return; // Если нет, не обновляем домен
  }
  
  try {
    // Получаем текущий URL из адресной строки
    const gBrowser = window.gBrowser;
    if (!gBrowser) return;
    
    const currentTab = gBrowser.selectedTab;
    if (!currentTab) return;
    
    const browser = gBrowser.getBrowserForTab(currentTab);
    if (!browser) return;
    
    const currentUrl = browser.currentURI?.spec || "";
    
    // Извлекаем домен
    const domain = getDomainFromUrl(currentUrl);
    
    // Устанавливаем CSS-переменную с доменом для отображения
    document.documentElement.style.setProperty("--current-domain", `"${domain}"`);
  } catch (e) {
    console.error("Error updating domain (legacy method):", e);
    // Если что-то пошло не так, пробуем стандартный метод
    updateDisplayedDomainStandard();
  }
}

// Функция для обновления отображаемого домена (авто-выбор метода)
function updateDisplayedDomain() {
  const method = getOptionValue(MOD_OPTIONS.UPDATE_METHOD, "auto");
  
  if (method === "legacy") {
    updateDisplayedDomainLegacy();
  } else if (method === "standard") {
    updateDisplayedDomainStandard();
  } else {
    // Авто-метод: пробуем сначала устаревший, затем стандартный
    try {
      if (window.gBrowser) {
        updateDisplayedDomainLegacy();
      } else {
        updateDisplayedDomainStandard();
      }
    } catch (e) {
      console.error("Auto method failed, falling back to standard:", e);
      updateDisplayedDomainStandard();
    }
  }
}

// Слушаем события изменения URL
function setupListeners() {
  // Проверяем доступность стандартного метода
  const urlbar = document.getElementById("urlbar");
  const hasUrlbar = !!urlbar;
  
  // Проверяем доступность устаревшего метода
  const hasBrowser = typeof window.gBrowser !== "undefined";
  
  // Устанавливаем подходящие слушатели событий
  if (hasUrlbar) {
    // Обновляем домен при загрузке страницы
    updateDisplayedDomain();
    
    // Слушаем изменения URL (переходы между страницами)
    window.addEventListener("DOMContentLoaded", updateDisplayedDomain);
    window.addEventListener("pageshow", updateDisplayedDomain);
    window.addEventListener("load", updateDisplayedDomain);
    
    // Слушаем изменения в адресной строке
    const inputField = urlbar.querySelector(".urlbar-input");
    if (inputField) {
      inputField.addEventListener("input", updateDisplayedDomain);
      inputField.addEventListener("change", updateDisplayedDomain);
    }
    
    // Наблюдаем за обновлениями DOM, чтобы отловить изменения URL
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          updateDisplayedDomain();
        }
      });
    });
    
    observer.observe(urlbar, { 
      childList: true, 
      attributes: true,
      subtree: true
    });
  }
  
  if (hasBrowser) {
    // Наблюдаем за изменениями вкладок
    const tabContainer = window.gBrowser.tabContainer;
    tabContainer.addEventListener("TabSelect", updateDisplayedDomain);
    
    // Обновляем домен при обновлении страницы
    window.gBrowser.addProgressListener({
      onLocationChange: function(aWebProgress, aRequest, aLocation, aFlags) {
        updateDisplayedDomain();
      }
    });
  }
  
  // Слушаем изменения настроек мода
  if (typeof zen !== "undefined" && zen.preferences && zen.preferences.onChanged) {
    zen.preferences.onChanged.addListener((changes) => {
      // Если изменились настройки мода, обновляем домен
      if (changes[MOD_OPTIONS.SHOW_DOMAIN_ONLY] || 
          changes[MOD_OPTIONS.CENTER_URLBAR] ||
          changes[MOD_OPTIONS.UPDATE_METHOD]) {
        updateDisplayedDomain();
      }
    });
  }
  
  // Если ни один из методов не доступен, пробуем позже
  if (!hasUrlbar && !hasBrowser) {
    console.warn("Neither urlbar nor gBrowser available, retrying setup later");
    setTimeout(setupListeners, 1000);
  }
}

// Запускаем настройку слушателей при загрузке скрипта
document.addEventListener("DOMContentLoaded", setupListeners);
window.addEventListener("load", setupListeners);

// Запускаем сразу для ранней инициализации
setupListeners(); 
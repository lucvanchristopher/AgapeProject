/**
 * ==========================================================================
 * api.js
 * Client JSONP pour GitHub Pages → Apps Script Web App
 * ==========================================================================
 */

const AGAPE_API_URL = "https://script.google.com/macros/s/AKfycbyLaMvYqYkG47-IuuHvEdFdgFJ10zc0nOLekHZXSZc92ETFUwBoP8TAXygKDuYi0WMp/exec";

const AgapeApi = (function () {
  let compteur = 0;

  function appeler(action, params = {}) {
    return new Promise(function (resolve, reject) {
      if (!AGAPE_API_URL || AGAPE_API_URL.includes("COLLE_ICI")) {
        reject(new Error("URL Web App Apps Script manquante dans api.js."));
        return;
      }

      compteur += 1;

      const callbackName = "__agape_jsonp_" + Date.now() + "_" + compteur;

      const query = new URLSearchParams();
      query.set("action", action);
      query.set("callback", callbackName);

      Object.keys(params).forEach(function (key) {
        const value = params[key];

        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      });

      const script = document.createElement("script");
      const separateur = AGAPE_API_URL.includes("?") ? "&" : "?";

      script.src = AGAPE_API_URL + separateur + query.toString();

      const timeout = setTimeout(function () {
        nettoyer();
        reject(new Error("Délai dépassé : impossible de joindre l’API."));
      }, 25000);

      window[callbackName] = function (reponse) {
        nettoyer();

        if (!reponse) {
          reject(new Error("Réponse API vide."));
          return;
        }

        if (reponse.succes === false) {
          reject(new Error(reponse.erreur || "Erreur API inconnue."));
          return;
        }

        resolve(reponse);
      };

      script.onerror = function () {
        nettoyer();
        reject(new Error("Erreur JSONP. Vérifie l’URL Web App Apps Script."));
      };

      function nettoyer() {
        clearTimeout(timeout);

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }

        try {
          delete window[callbackName];
        } catch (e) {
          window[callbackName] = undefined;
        }
      }

      document.body.appendChild(script);
    });
  }

  return {
    ping: function () {
      return appeler("ping");
    },

    getCurrentUser: function (email) {
      return appeler("getCurrentUser", {
        email: email
      });
    },

    getMyItems: function (email) {
      return appeler("getMyItems", {
        email: email
      });
    },

    getAllData: function (email) {
      return appeler("getAllData", {
        email: email
      });
    },

    updateItem: function (payload) {
      return appeler("updateItem", payload);
    },

    sendReminder: function (payload) {
      return appeler("sendReminder", payload);
    }
  };
})();
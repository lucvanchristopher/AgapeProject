/**
 * ==========================================================================
 * app.js
 * Application front Sakafo AGAPE — GitHub Pages
 * ==========================================================================
 */

const STORAGE_EMAIL_KEY = "sakafo_agape_email";

const STATUS_OPTIONS = {
  tache: ["À faire", "En cours", "À confirmer", "Confirmé", "Terminé", "Bloqué", "Annulé"],
  achat: ["À acheter", "Acheté", "Confirmé", "Bloqué", "Annulé"],
  materiel: ["À confirmer", "À appeler", "À contacter", "À récupérer", "Récupéré", "Confirmé", "Bloqué", "Annulé"],
  contact: ["À appeler", "À appeler si besoin", "Appelé", "Répondu", "Pas de réponse", "Confirmé", "Annulé", "À définir"],
  jourj: ["À faire", "En cours", "Terminé", "Bloqué", "Annulé"],
  risque: ["Identifié", "En traitement", "Maîtrisé", "Survenu", "Annulé"],
  equipe: ["À faire", "En cours", "Prêt", "Bloqué", "Annulé"]
};

const TYPE_CONFIG = {
  tache: {
    label: "Tâche",
    idKey: "id_tache",
    titleKey: "titre",
    statusKey: "statut",
    sectionId: "individuel-taches",
    blockId: "bloc-mes-taches"
  },

  achat: {
    label: "Achat",
    idKey: "id_achat",
    titleKey: "article",
    statusKey: "statut",
    sectionId: "individuel-achats",
    blockId: "bloc-mes-achats"
  },

  materiel: {
    label: "Matériel",
    idKey: "id_materiel",
    titleKey: "nom_materiel",
    statusKey: "statut",
    sectionId: "individuel-materiels",
    blockId: "bloc-mes-materiels"
  },

  contact: {
    label: "Contact",
    idKey: "id_contact",
    titleKey: "nom",
    statusKey: "statut_contact",
    sectionId: "individuel-contacts",
    blockId: "bloc-mes-contacts"
  },

  equipe: {
    label: "Équipe",
    idKey: "id_equipe",
    titleKey: "nom_equipe",
    statusKey: "statut",
    sectionId: "individuel-equipes",
    blockId: "bloc-mes-equipes"
  },

  jourj: {
    label: "Jour J",
    idKey: "id_jourj",
    titleKey: "action",
    statusKey: "statut",
    sectionId: "individuel-jourj",
    blockId: "bloc-mon-jourj"
  },

  risque: {
    label: "Risque",
    idKey: "id_risque",
    titleKey: "risque",
    statusKey: "statut",
    sectionId: "individuel-risques",
    blockId: "bloc-mes-risques"
  }
};

const GLOBAL_TABS = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "taches", label: "Tâches" },
  { key: "achats", label: "Achats" },
  { key: "materiels", label: "Matériels" },
  { key: "contacts", label: "Contacts" },
  { key: "equipes", label: "Équipes" },
  { key: "jourJ", label: "Jour J" },
  { key: "risques", label: "Risques" },
  { key: "relances", label: "Relances" },
  { key: "journal", label: "Journal" }
];

let state = {
  email: "",
  user: null,
  myData: null,
  globalData: null,
  currentTab: "dashboard",
  pendingReminder: null
};

document.addEventListener("DOMContentLoaded", initApp);


// ====================== INIT ======================

function initApp() {
  bindEvents();
  renderTabs();

  const savedEmail = localStorage.getItem(STORAGE_EMAIL_KEY);

  if (savedEmail) {
    document.getElementById("champ-email").value = savedEmail;
    login(savedEmail);
  }
}

function bindEvents() {
  document.getElementById("formulaire-connexion").addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("champ-email").value.trim();
    login(email);
  });

  document.getElementById("bouton-deconnexion").addEventListener("click", logout);
  document.getElementById("bouton-voir-tout").addEventListener("click", loadGlobalView);
  document.getElementById("bouton-voir-mes-taches").addEventListener("click", loadMyView);
  document.getElementById("bouton-changer-vue").addEventListener("click", showChoiceView);

  document.getElementById("modale-relance-fond").addEventListener("click", closeReminderModal);
  document.getElementById("modale-relance-annuler").addEventListener("click", closeReminderModal);
  document.getElementById("modale-relance-envoyer").addEventListener("click", confirmSendReminder);
}


// ====================== CONNEXION ======================

async function login(email) {
  clearLoginError();

  if (!email) {
    showLoginError("Entre ton email.");
    return;
  }

  try {
    setLoading(true);

    const response = await AgapeApi.getCurrentUser(email);

    state.email = email;
    state.user = response.utilisateur;

    const remember = document.getElementById("case-se-souvenir").checked;

    if (remember) {
      localStorage.setItem(STORAGE_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(STORAGE_EMAIL_KEY);
    }

    updateHeader();

    if (state.user.mode_acces === "choix") {
      showChoiceView();
    } else {
      await loadMyView();
    }

  } catch (error) {
    showLoginView();
    showLoginError(error.message);
  } finally {
    setLoading(false);
  }
}

function logout() {
  localStorage.removeItem(STORAGE_EMAIL_KEY);

  state = {
    email: "",
    user: null,
    myData: null,
    globalData: null,
    currentTab: "dashboard",
    pendingReminder: null
  };

  updateHeader();
  showLoginView();
}

function updateHeader() {
  const entete = document.getElementById("entete-app");
  const badge = document.getElementById("badge-utilisateur");
  const changerVue = document.getElementById("bouton-changer-vue");

  if (state.user) {
    entete.hidden = false;
    badge.textContent = state.user.nom + " · " + state.user.role;
    changerVue.hidden = state.user.mode_acces !== "choix";
  } else {
    entete.hidden = true;
    badge.textContent = "";
    changerVue.hidden = true;
  }
}


// ====================== VUES ======================

function hideAllViews() {
  document.getElementById("ecran-connexion").hidden = true;
  document.getElementById("ecran-choix").hidden = true;
  document.getElementById("vue-individuelle").hidden = true;
  document.getElementById("vue-globale").hidden = true;
}

function showLoginView() {
  hideAllViews();
  document.getElementById("entete-app").hidden = true;
  document.getElementById("ecran-connexion").hidden = false;
}

function showChoiceView() {
  hideAllViews();

  document.getElementById("choix-bonjour").textContent =
    "Bonjour " + (state.user ? state.user.nom : "");

  document.getElementById("ecran-choix").hidden = false;
}

function showMyView() {
  hideAllViews();
  document.getElementById("vue-individuelle").hidden = false;
}

function showGlobalView() {
  hideAllViews();
  document.getElementById("vue-globale").hidden = false;
}


// ====================== MES RESPONSABILITÉS ======================

async function loadMyView() {
  try {
    setLoading(true);

    const response = await AgapeApi.getMyItems(state.email);

    state.myData = response;

    renderMyView(response);
    showMyView();

  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
}

function renderMyView(data) {
  document.getElementById("individuel-salutation").textContent =
    "Bonjour " + data.utilisateur.nom;

  renderMySummary(data);
  renderPersonalSections(data);
}

function renderMySummary(data) {
  const items = getAllPersonalItems(data);
  const summary = buildSummary(items);

  document.getElementById("individuel-resume").innerHTML = [
    renderResumeCard("Total", summary.total),
    renderResumeCard("À faire", summary.aFaire),
    renderResumeCard("En cours", summary.enCours),
    renderResumeCard("Terminé", summary.termine)
  ].join("");
}

function renderPersonalSections(data) {
  const sections = [
    { type: "tache", items: data.taches || [] },
    { type: "achat", items: data.achats || [] },
    { type: "materiel", items: data.materiels || [] },
    { type: "contact", items: data.contacts || [] },
    { type: "equipe", items: data.equipes || [] },
    { type: "jourj", items: data.jourJ || [] },
    { type: "risque", items: data.risques || [] }
  ];

  let total = 0;

  sections.forEach(function (section) {
    const config = TYPE_CONFIG[section.type];
    const block = document.getElementById(config.blockId);
    const container = document.getElementById(config.sectionId);

    total += section.items.length;

    if (section.items.length === 0) {
      block.hidden = true;
      container.innerHTML = "";
      return;
    }

    block.hidden = false;
    container.innerHTML = section.items.map(function (item) {
      return renderItemCard(section.type, item, false);
    }).join("");
  });

  document.getElementById("individuel-rien-a-faire").hidden = total > 0;

  bindCardActions(document.getElementById("vue-individuelle"));
}

function getAllPersonalItems(data) {
  return []
    .concat(data.taches || [])
    .concat(data.achats || [])
    .concat(data.materiels || [])
    .concat(data.contacts || [])
    .concat(data.equipes || [])
    .concat(data.jourJ || [])
    .concat(data.risques || []);
}


// ====================== VUE GLOBALE ======================

async function loadGlobalView() {
  try {
    setLoading(true);

    const response = await AgapeApi.getAllData(state.email);

    state.globalData = response;

    showGlobalView();
    setActiveTab("dashboard");

  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
}

function renderTabs() {
  const nav = document.getElementById("onglets-globaux");

  nav.innerHTML = GLOBAL_TABS.map(function (tab) {
    return `
      <button type="button" class="onglet" data-tab="${escapeAttr(tab.key)}">
        ${escapeHtml(tab.label)}
      </button>
    `;
  }).join("");

  nav.querySelectorAll(".onglet").forEach(function (button) {
    button.addEventListener("click", function () {
      setActiveTab(button.dataset.tab);
    });
  });
}

function setActiveTab(tabName) {
  state.currentTab = tabName;

  document.querySelectorAll(".onglet").forEach(function (button) {
    button.setAttribute("aria-current", button.dataset.tab === tabName ? "true" : "false");
  });

  renderGlobalTab(tabName);
}

function renderGlobalTab(tabName) {
  const data = state.globalData;

  if (!data) {
    return;
  }

  const container = document.getElementById("contenu-onglet");

  if (tabName === "dashboard") {
    container.innerHTML = renderDashboard(data);
    return;
  }

  const map = {
    taches: { title: "Tâches", type: "tache", items: data.taches || [] },
    achats: { title: "Achats", type: "achat", items: data.achats || [] },
    materiels: { title: "Matériels", type: "materiel", items: data.materiels || [] },
    contacts: { title: "Contacts", type: "contact", items: data.contacts || [] },
    equipes: { title: "Équipes", type: "equipe", items: data.equipes || [] },
    jourJ: { title: "Jour J", type: "jourj", items: data.jourJ || [] },
    risques: { title: "Risques", type: "risque", items: data.risques || [] },
    relances: { title: "Relances", items: data.relances || [], kind: "relances" },
    journal: { title: "Journal", items: data.journal || [], kind: "journal" }
  };

  const config = map[tabName];

  if (!config) {
    container.innerHTML = "";
    return;
  }

  if (config.type) {
    container.innerHTML = renderGlobalCards(config.title, config.type, config.items);
    bindCardActions(container);
    return;
  }

  if (config.kind === "relances") {
    container.innerHTML = renderHistoryList("Relances", config.items, "relance");
    return;
  }

  if (config.kind === "journal") {
    container.innerHTML = renderHistoryList("Journal", config.items, "journal");
    return;
  }
}

function renderDashboard(data) {
  const allItems = []
    .concat(data.taches || [])
    .concat(data.achats || [])
    .concat(data.materiels || [])
    .concat(data.contacts || [])
    .concat(data.equipes || [])
    .concat(data.jourJ || [])
    .concat(data.risques || []);

  const summary = buildSummary(allItems);

  const urgences = getUrgences(data.tableauDeBord || []);

  return `
    <section class="bloc-entete">
      <p class="eyebrow">Vue globale</p>
      <h1 class="titre-section">Tableau de pilotage</h1>
      <p class="individuel-intro">
        Suivi global du projet. Le directeur projet est le Président. Luc intervient comme développeur application.
      </p>
    </section>

    <div class="stats-grille">
      ${renderStatCard("Total", summary.total)}
      ${renderStatCard("À faire", summary.aFaire)}
      ${renderStatCard("En cours", summary.enCours)}
      ${renderStatCard("Bloqué", summary.bloque)}
      ${renderStatCard("Terminé", summary.termine)}
    </div>

    <section class="bloc-liste">
      <h2 class="titre-bloc">Urgences</h2>

      ${
        urgences.length === 0
          ? `<p class="etat-vide">Aucune urgence trouvée.</p>`
          : `
            <div class="urgences-liste">
              ${urgences.map(renderUrgence).join("")}
            </div>
          `
      }
    </section>
  `;
}

function getUrgences(rows) {
  return rows.filter(function (row) {
    const indicateur = String(row.indicateur || "");
    const description = String(row.description || "");

    if (!indicateur || !description) {
      return false;
    }

    if (indicateur === "URGENCE") {
      return false;
    }

    if (
      indicateur.indexOf("Tâches") > -1 ||
      indicateur.indexOf("Achats") > -1 ||
      indicateur.indexOf("Matériels") > -1 ||
      indicateur.indexOf("Contacts") > -1 ||
      indicateur.indexOf("Relances") > -1
    ) {
      return false;
    }

    return true;
  });
}

function renderUrgence(row) {
  return `
    <article class="urgence-item">
      <div>
        <p class="urgence-item__titre">${escapeHtml(row.indicateur)}</p>
        <p class="urgence-item__commentaire">${escapeHtml(row.description)}</p>
      </div>
      ${renderBadge(row.valeur)}
    </article>
  `;
}

function renderGlobalCards(title, type, items) {
  return `
    <section class="bloc-entete">
      <p class="eyebrow">Vue globale</p>
      <h1 class="titre-section">${escapeHtml(title)}</h1>
      <p class="individuel-intro">
        ${items.length} élément(s). La relance envoie un email à la personne responsable de la ligne.
      </p>
    </section>

    <div class="divider-signature" aria-hidden="true"></div>

    <section class="bloc-liste">
      <div class="liste-cartes">
        ${
          items.length === 0
            ? `<p class="etat-vide">Aucune donnée.</p>`
            : items.map(function (item) {
                return renderItemCard(type, item, true);
              }).join("")
        }
      </div>
    </section>
  `;
}


// ====================== CARTES ======================

function renderItemCard(type, item, globalMode) {
  const config = TYPE_CONFIG[type];

  const id = item[config.idKey] || "";
  const title = item[config.titleKey] || id;
  const status = item[config.statusKey] || "";
  const comment = item.commentaire || "";
  const reponse = item.reponse || "";

  const responsableNom = item.responsable_nom || "";
  const responsableEmail = item.responsable_email || "";

  return `
    <article class="carte-element" data-type="${escapeAttr(type)}" data-id="${escapeAttr(id)}">
      <div class="carte-element__haut">
        <div>
          <p class="carte-element__titre">${escapeHtml(title)}</p>
        </div>
        ${renderBadge(status)}
      </div>

      <div class="carte-element__meta">
        <span><strong>Type :</strong> ${escapeHtml(config.label)}</span>
        <span><strong>ID :</strong> ${escapeHtml(id)}</span>
        ${
          responsableNom
            ? `<span><strong>Responsable :</strong> ${escapeHtml(responsableNom)}</span>`
            : ""
        }
        ${
          responsableEmail && globalMode
            ? `<span><strong>Email :</strong> ${escapeHtml(responsableEmail)}</span>`
            : ""
        }
      </div>

      <div class="carte-element__champs">
        <div class="champ">
          <label>Statut</label>
          <select class="champ-statut">
            ${renderStatusOptions(type, status)}
          </select>
        </div>

        ${
          type === "contact"
            ? `
              <div class="champ">
                <label>Réponse</label>
                <textarea class="champ-reponse">${escapeHtml(reponse)}</textarea>
              </div>
            `
            : ""
        }

        <div class="champ champ--pleine-largeur">
          <label>Commentaire</label>
          <textarea class="champ-commentaire">${escapeHtml(comment)}</textarea>
        </div>
      </div>

      <div class="carte-element__actions">
        <button type="button" class="bouton bouton-primaire action-enregistrer">
          Enregistrer
        </button>

        ${
          globalMode && state.user && state.user.peut_relancer === true
            ? `
              <button type="button" class="bouton bouton-accent action-relancer">
                Relancer
              </button>
            `
            : ""
        }
      </div>

      <p class="carte-element__pied">
        ${
          globalMode && responsableEmail
            ? "La relance sera envoyée à : " + escapeHtml(responsableEmail)
            : ""
        }
      </p>
    </article>
  `;
}

function renderStatusOptions(type, currentStatus) {
  const options = STATUS_OPTIONS[type] || [];

  return options.map(function (status) {
    const selected = status === currentStatus ? "selected" : "";

    return `
      <option value="${escapeAttr(status)}" ${selected}>
        ${escapeHtml(status)}
      </option>
    `;
  }).join("");
}

function bindCardActions(root) {
  root.querySelectorAll(".action-enregistrer").forEach(function (button) {
    button.addEventListener("click", async function () {
      const card = button.closest(".carte-element");
      await saveCard(card);
    });
  });

  root.querySelectorAll(".action-relancer").forEach(function (button) {
    button.addEventListener("click", function () {
      const card = button.closest(".carte-element");
      openReminderModal(card);
    });
  });
}

async function saveCard(card) {
  const type = card.dataset.type;
  const id = card.dataset.id;

  const status = card.querySelector(".champ-statut").value;
  const comment = card.querySelector(".champ-commentaire").value;

  const reponseField = card.querySelector(".champ-reponse");
  const reponse = reponseField ? reponseField.value : "";

  try {
    setLoading(true);

    await AgapeApi.updateItem({
      email: state.email,
      typeElement: type,
      idElement: id,
      newStatus: status,
      comment: comment,
      reponse: reponse
    });

    showToast("Mise à jour enregistrée.");

    if (isGlobalVisible()) {
      await refreshGlobal();
    } else {
      await loadMyView();
    }

  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
}


// ====================== MODALE RELANCE ======================

function openReminderModal(card) {
  const type = card.dataset.type;
  const id = card.dataset.id;

  const title = card.querySelector(".carte-element__titre").textContent.trim();
  const meta = card.querySelector(".carte-element__meta").textContent.trim();

  state.pendingReminder = {
    type: type,
    id: id,
    title: title
  };

  document.getElementById("modale-relance-destinataire").textContent =
    "Élément : " + title + " — " + meta;

  document.getElementById("modale-relance-message").value =
    "Bonjour,\n\n" +
    "Petite relance concernant cet élément du projet Sakafo AGAPE :\n\n" +
    "\"" + title + "\"\n\n" +
    "Peux-tu, s'il te plaît, mettre à jour le statut ou ajouter un commentaire dans l'application ?\n\n" +
    "Que Dieu bénisse le service de chacun.\n\n" +
    "Projet Sakafo AGAPE";

  document.getElementById("modale-relance-erreur").hidden = true;
  document.getElementById("modale-relance").hidden = false;
}

function closeReminderModal() {
  state.pendingReminder = null;
  document.getElementById("modale-relance").hidden = true;
}

async function confirmSendReminder() {
  if (!state.pendingReminder) {
    return;
  }

  const message = document.getElementById("modale-relance-message").value.trim();

  if (!message) {
    const erreur = document.getElementById("modale-relance-erreur");
    erreur.textContent = "Le message ne peut pas être vide.";
    erreur.hidden = false;
    return;
  }

  try {
    setLoading(true);

    await AgapeApi.sendReminder({
      email: state.email,
      typeElement: state.pendingReminder.type,
      idElement: state.pendingReminder.id,
      customMessage: message
    });

    closeReminderModal();
    showToast("Relance envoyée par email.");

    await refreshGlobal();

  } catch (error) {
    const erreur = document.getElementById("modale-relance-erreur");
    erreur.textContent = error.message;
    erreur.hidden = false;
  } finally {
    setLoading(false);
  }
}

async function refreshGlobal() {
  const response = await AgapeApi.getAllData(state.email);
  state.globalData = response;
  renderGlobalTab(state.currentTab);
}

function isGlobalVisible() {
  return !document.getElementById("vue-globale").hidden;
}


// ====================== HISTORIQUES ======================

function renderHistoryList(title, items, kind) {
  return `
    <section class="bloc-entete">
      <p class="eyebrow">Historique</p>
      <h1 class="titre-section">${escapeHtml(title)}</h1>
      <p class="individuel-intro">${items.length} ligne(s)</p>
    </section>

    <div class="divider-signature" aria-hidden="true"></div>

    <section class="bloc-liste">
      ${
        items.length === 0
          ? `<p class="etat-vide">Aucune donnée.</p>`
          : items.map(function (item) {
              return kind === "relance"
                ? renderRelanceLine(item)
                : renderJournalLine(item);
            }).join("")
      }
    </section>
  `;
}

function renderRelanceLine(item) {
  return `
    <article class="ligne-historique">
      <div class="ligne-historique__haut">
        <span>${escapeHtml(item.date_relance)}</span>
        <span>${escapeHtml(item.statut_envoi)}</span>
      </div>
      <p class="ligne-historique__texte">
        Relance vers <strong>${escapeHtml(item.destinataire_nom || item.destinataire_email)}</strong>
        pour ${escapeHtml(item.titre_element)}.
      </p>
    </article>
  `;
}

function renderJournalLine(item) {
  return `
    <article class="ligne-historique">
      <div class="ligne-historique__haut">
        <span>${escapeHtml(item.date)}</span>
        <span>${escapeHtml(item.type_action)}</span>
      </div>
      <p class="ligne-historique__texte">
        ${escapeHtml(item.description)}
      </p>
    </article>
  `;
}


// ====================== RÉSUMÉS / STATS ======================

function buildSummary(items) {
  const summary = {
    total: items.length,
    aFaire: 0,
    enCours: 0,
    bloque: 0,
    termine: 0
  };

  items.forEach(function (item) {
    const status = String(item.statut || item.statut_contact || "").trim();

    if ([
      "À faire",
      "À acheter",
      "À appeler",
      "À appeler si besoin",
      "À contacter",
      "À confirmer",
      "À récupérer",
      "Identifié",
      "À définir"
    ].includes(status)) {
      summary.aFaire += 1;
    } else if ([
      "En cours",
      "En traitement"
    ].includes(status)) {
      summary.enCours += 1;
    } else if ([
      "Bloqué",
      "Pas de réponse",
      "Survenu"
    ].includes(status)) {
      summary.bloque += 1;
    } else if ([
      "Terminé",
      "Acheté",
      "Récupéré",
      "Confirmé",
      "Répondu",
      "Maîtrisé",
      "Prêt"
    ].includes(status)) {
      summary.termine += 1;
    }
  });

  return summary;
}

function renderResumeCard(label, value) {
  return `
    <article class="resume-carte">
      <span class="resume-carte__valeur">${escapeHtml(value)}</span>
      <span class="resume-carte__label">${escapeHtml(label)}</span>
    </article>
  `;
}

function renderStatCard(label, value) {
  return `
    <article class="stat-carte">
      <span class="stat-carte__valeur">${escapeHtml(value)}</span>
      <span class="stat-carte__label">${escapeHtml(label)}</span>
    </article>
  `;
}

function renderBadge(status) {
  const value = String(status || "Sans statut");
  let classe = "statut--gris";

  if ([
    "Terminé",
    "Confirmé",
    "Récupéré",
    "Acheté",
    "Répondu",
    "Maîtrisé",
    "Prêt"
  ].includes(value)) {
    classe = "statut--vert";
  } else if ([
    "À faire",
    "À acheter",
    "En cours",
    "En traitement",
    "Identifié"
  ].includes(value)) {
    classe = "statut--jaune";
  } else if ([
    "À confirmer",
    "À appeler",
    "À appeler si besoin",
    "À contacter",
    "À récupérer",
    "À définir"
  ].includes(value)) {
    classe = "statut--orange";
  } else if ([
    "Bloqué",
    "Annulé",
    "Pas de réponse",
    "Survenu"
  ].includes(value)) {
    classe = "statut--rouge";
  }

  return `<span class="badge ${classe}">${escapeHtml(value)}</span>`;
}


// ====================== UI HELPERS ======================

function setLoading(isLoading) {
  document.getElementById("chargement-global").hidden = !isLoading;
}

function showToast(message, isError) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.toggle("toast--erreur", !!isError);
  toast.hidden = false;

  setTimeout(function () {
    toast.hidden = true;
    toast.classList.remove("toast--erreur");
  }, 3500);
}

function showLoginError(message) {
  const element = document.getElementById("erreur-connexion");

  element.textContent = message;
  element.hidden = false;
}

function clearLoginError() {
  const element = document.getElementById("erreur-connexion");

  element.textContent = "";
  element.hidden = true;
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

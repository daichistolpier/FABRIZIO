# FABRIZIO

### Your Microsoft Fabric workspace, under control.

**Fabrizio** is a browser extension that helps you navigate Microsoft Fabric faster by bringing essential tools into a convenient side panel.

Find workspaces and items, access run history, manage your favorites, and simplify repetitive tasks — without constantly switching between pages.

<p align="center">
  <img src="img/logo.png" alt="Fabrizio logo" width="260">
</p>

---

## 🎬 Demo

<p align="center">
  <a href="https://github.com/user-attachments/assets/bfffda73-f57e-48da-bd5a-05f62c9660d8">
    <img src="./DEMO/Demo_short_git.mp4" alt="Watch the Fabrizio demo" width="800">
  </a>
</p>

<p align="center">
  <em>See Fabrizio in action.</em>
</p>

---

## 💡 Why Fabrizio?

Fabrizio started as a small automation tool to speed up repetitive tasks during my company's migration to Microsoft Fabric.

What began as a practical solution evolved into a lightweight productivity assistant, designed to keep frequently used resources and useful utilities within easy reach.

Fabrizio is designed primarily as a **single-tenant assistant**, while supporting multiple tenants when needed.

## ✨ Features

### ⭐ Favorites
- Save frequently used Fabric workspaces and items.
- Access your favorite resources from a centralized list.

### 🔎 Workspace & Item Search
- Quickly find workspaces and Fabric items.
- Navigate your Fabric environment directly from the side panel.

### 📊 Run History
- Inspect available execution history for supported Fabric items.
- Review run details and statuses.
- Navigate directly to job instances.

### 🔌 Connection Information
- Access Microsoft Fabric connection information.
- Simplify troubleshooting and development workflows.

### 🧰 Developer Utilities
- Beautify JSON for improved readability.
- Keep useful development tools close at hand while working in Fabric.

---

## 📦 Installation

Fabrizio is currently distributed as a browser extension project and can be loaded locally in a Chromium-based browser.

1. Clone or download this repository.
2. Open your browser's extensions page.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project directory containing `manifest.json`.
6. Open Microsoft Fabric and launch Fabrizio.

> **Note:** You must be signed in to Microsoft Fabric to use features that require authentication. Access to workspaces and items depends on your account's permissions.

## 🛠️ Technology

Fabrizio is built using:

- **JavaScript** — application logic and API interactions
- **HTML** — extension interface
- **CSS** — styling and layout
- **Chrome Extension Manifest V3** — browser extension architecture
- **Microsoft Fabric APIs** — workspace, item, and execution data

## 🔐 Authentication & Permissions

Fabrizio works within your existing Microsoft Fabric environment and uses the access available to your signed-in account.

- Sign in to Microsoft Fabric before using features that require authentication.
- Your existing Microsoft Fabric permissions determine which resources you can access.
- The extension requests browser permissions to support its functionality.

Before installing, review the source code and `manifest.json` to understand the requested permissions and how data is handled.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Built to make Microsoft Fabric workflows simpler.</strong>
  <br>
  <em>Less searching. Less clicking. More doing.</em>
</p>
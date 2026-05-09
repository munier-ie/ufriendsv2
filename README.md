<p align="center">
  <img src="./mobile/assets/images/logo.png" alt="Ufriends Logo" width="100" height="100" />
</p>

# 🌟 Ufriends 2.0

Welcome to Ufriends 2.0! This project contains both the **Web Application** and the **Mobile Application**.

This guide is designed for **everyone**, even if you have no technical expertise. Just follow the steps below!

---

## 🛠️ Things You Need to Install First

Before you start, you need to install these free tools on your computer:

1. **Git**: To download the code. [Download here](https://git-scm.com/)
2. **Node.js**: To run the web app. [Download here](https://nodejs.org/) (Choose the "LTS" version).
3. **Flutter**: To run the mobile app. [Download here](https://docs.flutter.dev/get-started/install)

---

## 📥 Step 1: Download the Project

1. Open your terminal or command prompt.
2. Run this command to clone (download) the project:
   ```bash
   git clone https://github.com/munier-ie/ufriendsv2.git
   ```
3. Go into the project folder:
   ```bash
   cd ufriendsv2
   ```

---

## 🌐 Step 2: Running the Web Application

The web application has two parts: the **Frontend** (what you see) and the **Backend API** (what processes data).

### Part A: Start the Backend API
1. Open a terminal and make sure you are in the `ufriendsv2` folder.
2. Install the required packages:
   ```bash
   npm install
   ```
3. Create a file named `.env` in the root folder and add your database details (ask your developer for these if unsure).
4. Prepare the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start the backend server:
   ```bash
   npm start
   ```
   *Keep this terminal open!*

### Part B: Start the Frontend
1. Open a **new** terminal window and go to the `ufriendsv2` folder.
2. Start the frontend:
   ```bash
   npm run dev
   ```
3. Open your browser and go to the link shown in the terminal (usually `http://localhost:5173`).

---

## 📱 Step 3: Running the Mobile Application

The mobile app is built with Flutter and is located in the `mobile` folder.

1. Open a **new** terminal window and go to the `mobile` folder:
   ```bash
   cd mobile
   ```
2. Install the mobile app packages:
   ```bash
   flutter pub get
   ```
3. Connect your phone via USB (with Developer Mode enabled) or start an emulator.
4. Run the app:
   ```bash
   flutter run
   ```

---

## 💡 Troubleshooting

* **Node.js errors**: If `npm install` fails, try running `npm install --no-audit`.
* **Flutter errors**: Run `flutter doctor` to check if your Flutter setup is complete.

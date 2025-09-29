# Drug Requisition System

A modern, web-based drug and medical supply requisition system designed for hospitals and their affiliated primary care units (PCUs). This application streamlines the ordering process, provides robust administrative oversight, and automates report generation.

Built with **Vue 3 (Composition API)**, **Pinia**, **Vite**, and **Supabase** for a fast, scalable, and real-time backend experience.

 <!-- To-do: Replace with your actual screenshot URL -->
 <!-- To-do: Replace with your actual screenshot URL -->

## ✨ Features

### For Primary Care Units (PCU Users)
- **Secure Authentication:** Role-based login for PCU staff.
- **Intuitive Dashboard:** View current requisition periods and historical submissions at a glance.
- **Streamlined Ordering Form:** A searchable and categorized list of all available medical supplies.
- **Draft & Submit Workflow:** Save requisition drafts and submit them for approval when ready.
- **Real-time Status Tracking:** View the status of submissions (Draft, Submitted, Approved, Fulfilled).
- **Locked Item Visibility:** Clearly see which items are unavailable (e.g., out of stock) with admin notes, and prevent ordering them.
- **Requisition History:** Access and review details of all past requisitions.

### For Administrators (Hospital Staff)
- **Centralized Dashboard:** Manage all incoming requisitions from multiple PCUs.
- **Approval Workflow:** Review, edit approved quantities, and approve or fulfill requisitions.
- **Comprehensive Item Management:**
    - Add, edit, or update details for all drugs and supplies (name, price, unit).
    - Toggle item availability to prevent ordering (e.g., for out-of-stock items).
    - Add notes to items that will be visible to PCU users.
- **Automated Report Generation:**
    - **Per-PCU Requisition Form:** Generate and print official, formatted requisition documents for each PCU, automatically populated with personnel details.
    - **Summary Report:** Generate and print a master summary report (landscape view) that aggregates all approved items from all PCUs for a specific period—ideal for warehouse picking.
    - **Excel Export:** Export report data to `.xlsx` files.
- **System Settings:** Configure key personnel (e.g., requester, receiver) for each PCU, which are then used to auto-populate official documents.

## 🛠️ Tech Stack

- **Frontend:**
    - [Vue 3](https://vuejs.org/) (Composition API with `<script setup>`)
    - [Vite](https://vitejs.dev/) as the build tool
    - [Vue Router](https://router.vuejs.org/) for client-side routing
    - [Pinia](https://pinia.vuejs.org/) for state management
- **Backend & Database:**
    - [Supabase](https://supabase.io/) - The open-source Firebase alternative.
        - **PostgreSQL Database:** For storing all application data.
        - **Authentication:** Manages user login and sessions.
        - **Realtime APIs:** For potential future real-time updates.
        - **Row Level Security (RLS):** To ensure users can only access their own data.
        - **Database Functions (RPC):** For complex server-side logic.
- **Styling:**
    - Modern CSS with variables for a consistent design system.
    - [Font Awesome](https://fontawesome.com/) for iconography.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- A code editor like [VS Code](https://code.visualstudio.com/)

### Supabase Setup
1.  Create a new project on [Supabase](https://supabase.io/).
2.  In the SQL Editor, run the SQL scripts for creating tables (`items_drugcupsabot`, `requisitions_drugcupsabot`, etc.) and setting up RLS policies.
3.  Navigate to **Project Settings > API**.
4.  Find your **Project URL** and **`anon` public key**.

### Local Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/pharmacist-sabot/drug-cup-online.git
    cd drug-cup-online
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

3.  Create a `.env` file in the root of the project and add your Supabase credentials:
    ```
    VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:5173` (or another port if 5173 is busy).


## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

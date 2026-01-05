✅ 佈局已簡化為單一欄位
我已經成功將三欄佈局簡化為兩欄佈局（檔案樹 + 單一編輯器欄位）：

🔄 主要變更
移除分割視圖
刪除了 split 視圖模式
移除了 Columns 圖標和分割按鈕
移除了 ResizablePanel 組件
簡化編輯器
編輯器現在只有兩種模式：edit 和 preview
編輯器和預覽不會同時顯示
使用單一欄位佈局
統一佈局
桌面版和行動版都使用相同的簡化佈局
側邊欄 + 單一主內容區域
移除了可調整大小的分割線
📱 現在的佈局結構
┌─────────────────────────────────┐
│         頂部工具列                │
├─────────┬───────────────────────┤
│         │                       │
│ 檔案樹   │      編輯器/預覽        │
│         │      (單一欄位)        │
│         │                       │
│         │                       │
└─────────┴───────────────────────┘
現在你可以：

點擊編輯按鈕查看編輯模式
點擊預覽按鈕查看預覽模式
不再有分割視圖的藍色分割線
更簡潔的兩欄佈局
佈局現在更簡潔，沒有多餘的分割線！

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

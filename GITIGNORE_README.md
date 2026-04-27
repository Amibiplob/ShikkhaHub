# ShikkhaHub .gitignore Setup

This project includes three `.gitignore` files tailored for your MERN + Vite stack:

## 📁 File Structure

```
ShikkhaHub/
├── .gitignore              # Root-level (use this one)
├── Backend/
│   └── .gitignore         # Backend-specific
└── Frontend/
    └── .gitignore         # Frontend-specific
```

## 🎯 Recommended Setup

**Option 1: Single Root `.gitignore` (Recommended)**
- Place `.gitignore` in the root of your project (same level as Backend/ and Frontend/)
- This covers both frontend and backend in one file
- Simpler to maintain

**Option 2: Separate `.gitignore` Files**
- Place `Backend.gitignore` inside the `Backend/` folder (rename to `.gitignore`)
- Place `Frontend.gitignore` inside the `Frontend/` folder (rename to `.gitignore`)
- More granular control per directory

## 📝 What's Ignored

### Backend
- `node_modules/` - Dependencies
- `.env` files - Environment variables (API keys, DB credentials)
- Log files
- Database files (SQLite, etc.)
- Uploaded files directory

### Frontend
- `node_modules/` - Dependencies
- `dist/` - Build output
- `bun.lockb` - Bun lock file
- `.env` files - Environment variables
- Editor configs
- Test coverage reports

## 🚀 Quick Start

1. **If using root .gitignore:**
   ```bash
   cp .gitignore /path/to/ShikkhaHub/
   ```

2. **If using separate files:**
   ```bash
   cp Backend.gitignore /path/to/ShikkhaHub/Backend/.gitignore
   cp Frontend.gitignore /path/to/ShikkhaHub/Frontend/.gitignore
   ```

3. **Initialize git (if not done):**
   ```bash
   cd /path/to/ShikkhaHub
   git init
   git add .
   git commit -m "Initial commit"
   ```

## ⚠️ Important Notes

1. **Environment Variables**: Never commit `.env` files. Use `.env.example` files with placeholder values instead.

2. **Lock Files**: The root `.gitignore` ignores `bun.lockb`. If you want to commit it:
   - Remove or comment out `bun.lockb` line
   - It's recommended to commit lock files for consistent dependencies

3. **Already Committed Files**: If you've already committed files that should be ignored:
   ```bash
   # Remove from git but keep locally
   git rm --cached <file>
   
   # For directories
   git rm -r --cached <directory>
   ```

4. **Database Credentials**: Your Backend `.env` should contain:
   - MongoDB connection string
   - JWT secret
   - Port numbers
   - API keys
   
   Never commit these!

## 🔍 Verify Setup

Check what will be committed:
```bash
git status
```

Check what's being ignored:
```bash
git status --ignored
```

## 📦 What You Should Commit

✅ **DO commit:**
- Source code (`.js`, `.jsx`, `.ts`, `.tsx`)
- Configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`)
- `.env.example` (template without real values)
- Documentation (README.md)
- Public assets

❌ **DON'T commit:**
- `node_modules/`
- `.env` files with real credentials
- Build outputs (`dist/`, `build/`)
- Log files
- Editor-specific files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)

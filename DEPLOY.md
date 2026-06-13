# Deploy the dododo engine demo (password-protected) on Streamlit Community Cloud

> **DEMO — sample data only, not for real children's videos.**
>
> This deploys the existing specialist **engine** app (`app.py` + `engine.py` +
> `storage.py`, MediaPipe + faster-whisper) as a private, password-protected online
> demo. Free hosting, native to Streamlit. No coding needed for the steps below.

## What must be in your GitHub repo

These are already prepared in this project — just make sure they are **committed and
pushed**:

- `app.py` (entry point), `engine.py`, `storage.py`, `config.py`
- `requirements.txt` (Python packages) and `packages.txt` (system: ffmpeg, libGL)
- `.streamlit/config.toml` (theme)
- `pose_landmarker.task` and `face_landmarker.task` (the AI models — ~13 MB total)
- `demo_clips/` (where you put consented **adult/synthetic** clips)

**Do NOT commit** `.streamlit/secrets.toml` (your password lives in the cloud Secrets
box, not in the repo).

> First commit tip: because models/clips were previously git-ignored, run
> `git add app.py requirements.txt packages.txt pose_landmarker.task face_landmarker.task demo_clips .gitignore .streamlit`
> then `git commit` and `git push`.

## Step-by-step (non-technical)

1. **Push your repo to GitHub** (must be on GitHub, public or private — both work).
2. Go to **https://share.streamlit.io** and click **Sign in** → **Continue with
   GitHub**. Authorise access to your repository.
3. Click **Create app** → **Deploy a public app from GitHub** (works for private repos
   too once authorised).
4. Fill in:
   - **Repository:** your repo (e.g. `your-name/DoDoDo`)
   - **Branch:** `main`
   - **Main file path:** `app.py`
5. Click **Advanced settings**:
   - **Python version:** choose **3.12**.
   - **Secrets:** paste this one line (use your own strong password):
     ```toml
     demo_password = "choose-a-strong-shared-password"
     ```
6. Click **Deploy**. The first build takes several minutes (it installs MediaPipe,
   ffmpeg, etc.). Wait until the app screen appears.
7. The app opens showing the **"DEMO — sample data only…"** banner and a **password
   box**. Type the password you set in step 5 → you're in.
8. To demo: use the app's **video uploader** and pick a clip from `demo_clips/`
   (adult/consented or synthetic only).

## Share the link

- Your public URL looks like `https://<something>.streamlit.app`. Copy it from the
  top-right **Share** button.
- Send recipients **two things separately**: the URL, and the password. Anyone with
  both can open the demo.
- To change the password later: app menu (⋮) → **Settings** → **Secrets** → edit
  `demo_password` → save (the app reboots).

## Important limits & safety

- ❌ **Never upload real children's videos.** This demo is for synthetic/consented
  **adult** footage only. The on-screen banner states this.
- The **first** video analysis downloads the speech model (faster-whisper "small"),
  which can be slow and memory-heavy on the free tier. If the app runs out of memory,
  edit `WHISPER_MODEL_SIZE` in `config.py` to `"base"` or `"tiny"`, commit, and let it
  redeploy. (This is the only setting you may need to lower; nothing else changes.)
- Uploaded data on Community Cloud is ephemeral and resets on reboot — this is a demo,
  not storage for real data.

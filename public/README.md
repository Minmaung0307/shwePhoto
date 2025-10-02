# Photo Studio **Pro** — Firebase + EmailJS (Mobile-first)

**Upgrades included**
- ✅ Face landmarks auto-fit for accessories (face-api.js; 68 landmarks)
- ✅ In-canvas text tool (drag, edit, style, wheel-resize)
- ✅ Multi-page poster export to **PDF** (jsPDF)
- ✅ Role-based gating (viewer / editor / admin) to unlock PRO features (AI tools)
- ✅ Keeps all features from the starter: filters, frames/sizes, templates, export to Storage, EmailJS

## 0) Quick Start
1. Put your Firebase config in `index.html` script.
2. Enable **Anonymous Auth**, **Firestore**, **Storage**, **Hosting**.
3. (Optional) **Google Login**: enable Google sign-in in Firebase Auth.
4. Deploy Hosting (or open locally); AI features require the function from the starter (`/api/image-edit`).

## 1) Roles
- On login (anonymous or Google), app reads `users/{uid}.role` from Firestore.
- Available roles: `viewer` (default), `editor`, `admin`.
- PRO features (AI BG/FG, Age, Celebrity) are **enabled only** for `editor` / `admin`.
- Example document:
```
/users/abc123 { role: "admin", displayName: "Min", createdAt: serverTimestamp() }
```
**Security Rules (example)**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid; // tighten as needed
    }
    match /exports/{doc} {
      allow create: if request.auth != null;
      allow read: if true;
    }
  }
}
service firebase.storage {
  match /b/{bucket}/o {
    match /exports/{userId}/{fileName} {
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if true;
    }
  }
}
```

## 2) Face Landmarks
- Uses `face-api.js` via CDN and loads models from `.../weights` path.
- First load takes a moment; after image upload, auto-fitting runs and places glasses/hat/earrings/necklace using 68 landmarks.
- If models fail to load, overlay still works manually (drag to adjust).

## 3) In-canvas Text
- Click **Add Text** → draggable, editable textbox appears.
- Style controls: font, size, color, bold, shadow.
- Mouse wheel over a textbox = quick resize.

## 4) Multi-page Poster Export
- Click **Add Current as Page** to queue a page (renders current composition).
- Repeat for multiple sizes/templates.
- Click **Export PDF** to download an A4 multi-page PDF (auto scaled).

## 5) AI (Background/Foreground/Age/Celebrity)
- Reuse the **functions/api** example from the starter (OpenAI Images API: `gpt-image-1`).
- Add Hosting rewrite: `{ "source": "/api/**", "function": "api" }`.
- Set `OPENAI_API_KEY` or functions config.
- PRO-gated: only roles `editor`/`admin` can call.

## 6) EmailJS
- Add your keys in `app.js` IIFE.
- Template vars: `to_email`, `image_url`.

## 7) Notes
- This is client-heavy; for production, consider server validation, watermarking, rate limits.
- Avoid harmful or misleading use cases. Political persuasion content is not supported.
- For celebrity pairing, be tasteful and lawful; label composites clearly.

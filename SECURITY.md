# SECURITY.md

## ?? Educational Purpose Only
This project is intentionally vulnerable to illustrate common web security issues. Never deploy it to a production or Internet-facing environment. If you redistribute the lab, clearly mark it as unsafe by design and ensure it runs only in an isolated training network.

## Vulnerabilities and Fix Guidance

### 1. SQL Injection (`app.js` POST `/login`)
- **Issue:** User input is concatenated directly into the SQL statement.
- **Fix approach:** Use prepared statements with placeholders.
- **Example remediation:**
  ```js
  const stmt = db.prepare('SELECT id, username, role, secret_note FROM users WHERE username = ? AND password = ?');
  stmt.get(username, password, (err, row) => {
    // handle row
  });
  ```

### 2. Broken Access Control / IDOR (`app.js` GET `/orders/:orderId`)
- **Issue:** Any authenticated user can fetch any order record.
- **Fix approach:** Verify ownership (and authorisation) before returning data.
- **Example remediation:**
  ```js
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }
  ```

### 3. Stored XSS (`views/comments_admin.ejs`)
- **Issue:** Admin review template renders user comments with `<%-` (no escaping).
- **Fix approach:** Escape output or use a sanitiser before rendering.
- **Example remediation:**
  ```ejs
  <%= comment.content %>
  ```
  or sanitise server-side with a library such as DOMPurify (server build) or `xss`.

### 4. Insecure File Upload ? RCE (`app.js` POST `/upload` and GET `/uploads/exec`)
- **Issue:** Any file type is stored under the web root and `.js` payloads are executed via `eval`.
- **Fix approach:**
  - Restrict acceptable file extensions and MIME types.
  - Store uploads outside the web root.
  - Never execute uploaded content.
- **Example remediation:**
  ```js
  const safeUpload = multer({
    storage: uploadStorage,
    fileFilter: (req, file, cb) => {
      const allowed = ['.jpg', '.png'];
      return allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Invalid file type'));
    },
  });
  ```
  Remove the `/uploads/exec` endpoint entirely.

### 5. Configuration Disclosure (`app.js` GET `/config`)
- **Issue:** Exposes secrets like `JWT_SECRET` when `?debug=1` is supplied.
- **Fix approach:** Require authentication & authorisation for debug endpoints, and remove secret dumps.
- **Example remediation:**
  ```js
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }
  ```

## Safe Handling Instructions
- Run inside disposable virtual machines, containers, or isolated lab networks.
- Reset state frequently: delete `data.db` and `public/uploads/*` before distributing.
- Provide trainees with `README.md` and this file so they understand the deliberate weaknesses and how to harden them after the lesson.
- Never mix lab data with real user information or reusable credentials.

## Reporting
Because this is a teaching aid, there is no production bug bounty. Suggestions for enhancements can be opened as issues or shared with the training coordinator.

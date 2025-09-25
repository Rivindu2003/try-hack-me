require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'THIS_IS_SECRET_FOR_LAB';
const DB_PATH = process.env.DB_PATH || './data.db';

const db = new sqlite3.Database(path.resolve(__dirname, DB_PATH));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: uploadStorage,
  // VULN: This upload handler accepts any file type and trusts original filenames.
  // const safeUpload = multer({
  //   storage: uploadStorage,
  //   fileFilter: (req, file, cb) => {
  //     const allowed = ['.jpg', '.png'];
  //     return allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Invalid file type'));
  //   },
  // });
});

function getUserFromToken(req) {
  const token = req.cookies.token;
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).send('Please log in first.');
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserFromToken(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).send('Admins only.');
  }
  req.user = user;
  next();
}

app.use((req, res, next) => {
  req.user = getUserFromToken(req);
  next();
});

app.get('/', (req, res) => {
  if (!req.user) {
    return res.render('index', { user: null, secretNote: null });
  }

  // fetch the secret_note for the logged-in user
  db.get('SELECT secret_note FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) {
      console.error(err);
      return res.render('index', { user: req.user, secretNote: null });
    }
    res.render('index', { user: req.user, secretNote: row ? row.secret_note : null });
  });
});


app.get('/login', (req, res) => {
  res.render('login', { error: null, user: req.user });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT id, username, role, secret_note FROM users WHERE username='${username}' AND password='${password}'`;
  // VULN: Unsafely concatenating user input into SQL leads to SQL injection.
  // const safeQuery = 'SELECT id, username, role, secret_note FROM users WHERE username = ? AND password = ?';
  db.get(query, (err, row) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    if (!row) {
      return res.status(401).render('login', { error: 'Invalid credentials', user: req.user });
    }
    const token = jwt.sign({ id: row.id, username: row.username, role: row.role }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/');
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

app.get('/orders/:orderId', requireAuth, (req, res) => {
  const orderId = req.params.orderId;
  const query = 'SELECT * FROM orders WHERE id = ?';
  db.get(query, [orderId], (err, order) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    if (!order) {
      return res.status(404).send('Order not found');
    }
    // VULN: Missing ownership check lets any authenticated user view any order.
    // if (order.user_id !== req.user.id) {
    //   return res.status(403).send('This order does not belong to you.');
    // }
    res.render('orders', { order, user: req.user });
  });
});

app.get('/comments', (req, res) => {
  db.all('SELECT comments.id, comments.content, users.username FROM comments LEFT JOIN users ON comments.user_id = users.id ORDER BY comments.id DESC', (err, comments) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('comments', { comments, user: req.user });
  });
});

app.post('/comments', requireAuth, (req, res) => {
  const content = req.body.content || '';
  const stmt = db.prepare('INSERT INTO comments (user_id, content) VALUES (?, ?)');
  stmt.run(req.user.id, content, (err) => {
    stmt.finalize();
    if (err) {
      return res.status(500).send('Database error');
    }
    res.redirect('/comments');
  });
});

app.get('/admin/messages', requireAdmin, (req, res) => {
  db.all('SELECT comments.id, comments.content, users.username FROM comments LEFT JOIN users ON comments.user_id = users.id ORDER BY comments.id DESC', (err, comments) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    // VULN: Rendering unescaped comment content exposes admin to stored XSS.
    // res.render('comments_admin', { comments: comments.map(c => ({ ...c, content: escapeHtml(c.content) })), user: req.user });
    res.render('comments_admin', { comments, user: req.user });
  });
});

app.get('/config', (req, res) => {
  if (req.query.debug === '1') {
    // VULN: Exposing environment details leaks secrets useful to attackers.
    // return res.status(403).send('Debug mode disabled in production.');
    return res.json({ env: process.env, dbPath: path.resolve(__dirname, DB_PATH) });
  }
  res.status(403).send('Debug disabled.');
});

app.get('/upload', requireAuth, (req, res) => {
  res.render('upload', { user: req.user, message: null, error: null });
});

app.post('/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.render('upload', { user: req.user, message: null, error: err.message });
    }
    if (!req.file) {
      return res.render('upload', { user: req.user, message: null, error: 'No file uploaded' });
    }
    // VULN: No validation or sanitization on uploaded files enables arbitrary code upload.
    // Implement extension whitelisting and store outside web root before processing.
    res.render('upload', { user: req.user, message: `Uploaded ${req.file.originalname} to /public/uploads/`, error: null });
  });
});

app.get('/uploads/exec', requireAuth, (req, res) => {
  const file = req.query.file;
  if (!file) {
    return res.status(400).send('Missing file parameter');
  }
  const targetPath = path.join(__dirname, 'public', 'uploads', file);
  if (!targetPath.startsWith(path.join(__dirname, 'public', 'uploads'))) {
    return res.status(400).send('Invalid path');
  }
  if (!fs.existsSync(targetPath)) {
    return res.status(404).send('File not found');
  }
  if (!file.endsWith('.js')) {
    return res.status(400).send('Only .js files can be executed in this lab demo');
  }
  const payload = fs.readFileSync(targetPath, 'utf8');
  // VULN: Evaluating attacker-controlled files provides remote code execution.
  // Safe alternative: never execute uploaded files. Process data using sandboxed services.
  try {
    const result = eval(payload);
    res.send(`Executed file. Result: ${result}`);
  } catch (err) {
    res.status(500).send(`Execution error: ${err.message}`);
  }
});

app.get('/admin/secret.txt', requireAdmin, (req, res) => {
  const secretPath = path.join(__dirname, 'admin', 'secret.txt');
  fs.readFile(secretPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Could not read admin secret');
    }
    res.type('text/plain').send(data);
  });
});

app.get('/flags', (req, res) => {
  res.render('flags', { user: req.user });
});

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Intentionally vulnerable lab app listening on http://localhost:${PORT}`);
});

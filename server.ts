
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const SERVER_ID = Math.random().toString(36).substring(7);

console.log('SERVER_ID:', SERVER_ID);
console.log('DATA_FILE path:', DATA_FILE);
console.log('UPLOADS_DIR path:', UPLOADS_DIR);

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Initial data structure
let db = {
  files: [],
  folders: [],
  countries: []
};

// Load existing data if available
if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading data.json', e);
  }
}

const saveDB = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    console.log('DB saved successfully to', DATA_FILE);
  } catch (e) {
    console.error('Error saving DB:', e);
  }
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected to socket:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected from socket:', socket.id);
  });
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), serverId: SERVER_ID });
});

// Multer setup for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// API Routes
app.get('/api/data', (req, res) => {
  console.log('GET /api/data requested');
  res.json({ ...db, serverId: SERVER_ID });
});

app.post('/api/files', upload.single('file'), (req, res) => {
  console.log('POST /api/files requested');
  const metadata = JSON.parse(req.body.metadata);
  const fileData = {
    ...metadata,
    id: metadata.id || Date.now().toString(),
    uploadDate: new Date().toLocaleDateString(),
    serverPath: req.file ? `/uploads/${req.file.filename}` : null
  };
  
  db.files.push(fileData);
  saveDB();
  
  io.emit('data_updated', { type: 'file_added', data: fileData });
  res.json(fileData);
});

app.delete('/api/files/:id', (req, res) => {
  const { id } = req.params;
  const fileIndex = db.files.findIndex((f: any) => f.id === id);
  if (fileIndex > -1) {
    const file = db.files[fileIndex];
    if (file.serverPath) {
      const filePath = path.join(__dirname, file.serverPath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.files.splice(fileIndex, 1);
    saveDB();
    io.emit('data_updated', { type: 'file_deleted', id });
  }
  res.json({ success: true });
});

app.post('/api/folders', (req, res) => {
  console.log('POST /api/folders requested:', req.body);
  const folder = req.body;
  db.folders.push(folder);
  saveDB();
  io.emit('data_updated', { type: 'folder_added', data: folder });
  res.json(folder);
});

app.delete('/api/folders/:id', (req, res) => {
  const { id } = req.params;
  db.folders = db.folders.filter((f: any) => f.id !== id);
  saveDB();
  io.emit('data_updated', { type: 'folder_deleted', id });
  res.json({ success: true });
});

app.post('/api/countries', (req, res) => {
  console.log('POST /api/countries requested:', req.body);
  const country = req.body;
  const exists = db.countries.some((c: any) => c.code === country.code);
  if (exists) {
    return res.status(400).json({ error: 'Country already exists' });
  }
  db.countries.push(country);
  saveDB();
  io.emit('data_updated', { type: 'country_added', data: country });
  res.json(country);
});

app.delete('/api/countries/:code', (req, res) => {
  const { code } = req.params;
  db.countries = db.countries.filter((c: any) => c.code !== code);
  saveDB();
  io.emit('data_updated', { type: 'country_deleted', code });
  res.json({ success: true });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

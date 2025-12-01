const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // <--- WAJIB ADA
const multer = require('multer');
const slugify = require('slugify'); 
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// --- BAGIAN PENTING: BUAT FOLDER OTOMATIS ---
const uploadDir = path.join(__dirname, 'uploads');

// Cek apakah folder ada, jika tidak, buat sekarang
if (!fs.existsSync(uploadDir)){
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Folder "uploads" berhasil dibuat!');
    } catch (err) {
        console.error('❌ Gagal membuat folder uploads:', err);
    }
}
// ---------------------------------------------

app.use('/uploads', express.static(uploadDir));

// Konfigurasi Penyimpanan Gambar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Pastikan folder ada sebelum menyimpan
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });
const db = require('./db'); 
const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);

// --- ROUTES BERITA ---

// GET All News
app.get('/api/news', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM news ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Single News
app.get('/api/news/:slug', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM news WHERE slug = ?', [req.params.slug]);
        if (rows.length === 0) return res.status(404).json({ message: 'Article not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE News (Upload Gambar)
app.post('/api/news', upload.single('image'), async (req, res) => {
    try {
        const { title, category, summary, content, author_name, published_date } = req.body;
        
        if(!title || !content) {
            return res.status(400).json({message: "Title and Content are required"});
        }

        // Path gambar yang disimpan ke database
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        
        let slug = slugify(title, { lower: true, strict: true });
        slug += '-' + Date.now();

        const query = `INSERT INTO news (title, slug, category, summary, content, image_url, author_name, published_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.execute(query, [
            title, 
            slug, 
            category, 
            summary, 
            content, 
            image_url, 
            author_name || 'Admin', 
            published_date || new Date()
        ]);

        res.status(201).json({ message: 'News created successfully' });
    } catch (err) {
        console.error("Database Error:", err); // Cek terminal untuk detail error
        res.status(500).json({ message: err.message });
    }
});

// DELETE News
app.delete('/api/news/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM news WHERE id = ?', [req.params.id]);
        res.json({ message: 'News deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
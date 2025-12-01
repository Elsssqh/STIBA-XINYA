const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const slugify = require('slugify');

// Image Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET All News (Public)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM news ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Single News (Public)
router.get('/:slug', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM news WHERE slug = ?', [req.params.slug]);
        if (rows.length === 0) return res.status(404).json({ message: 'Article not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE News (Protected - Admin Only)
router.post('/', auth, upload.single('image'), async (req, res) => {
    const { title, category, summary, content, author_name, published_date } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const slug = slugify(title, { lower: true, strict: true });

    try {
        const query = `INSERT INTO news (title, slug, category, summary, content, image_url, author_name, published_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.execute(query, [title, slug, category, summary, content, image_url, author_name, published_date]);
        res.status(201).json({ message: 'News created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE News (Protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('DELETE FROM news WHERE id = ?', [req.params.id]);
        res.json({ message: 'News deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE News (Protected)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    const { title, category, summary, content, author_name } = req.body;
    // Note: Complex update logic usually checks if image exists, keeping it simple here
    try {
        let query = 'UPDATE news SET title=?, category=?, summary=?, content=?, author_name=? WHERE id=?';
        let params = [title, category, summary, content, author_name, req.params.id];
        
        if(req.file) {
            query = 'UPDATE news SET title=?, category=?, summary=?, content=?, author_name=?, image_url=? WHERE id=?';
            params = [title, category, summary, content, author_name, `/uploads/${req.file.filename}`, req.params.id];
        }

        await db.execute(query, params);
        res.json({ message: 'News updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
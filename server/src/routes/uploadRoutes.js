/**
 * Upload Routes
 * API endpoints for file uploads
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
    imageUpload,
    videoUpload,
    audioUpload,
    documentUpload,
    handleUploadError,
    validateMagicBytes
} = require('../middleware/uploadMiddleware');
const { saveAttachment } = require('../db/attachmentQueries');

/**
 * POST /api/upload/image
 * Upload a single image
 */
router.post('/image', imageUpload.single('image'), handleUploadError, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        const file = req.file;
        const filePath = file.path;

        // Validate magic bytes for security
        if (!validateMagicBytes(filePath, 'image')) {
            // Delete invalid file
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid image file format'
            });
        }

        const fileUrl = `/uploads/images/${file.filename}`;

        // Save to database
        const attachment = saveAttachment({
            type: 'image',
            filename: file.originalname,
            filepath: fileUrl,
            filesize: file.size,
            mimetype: file.mimetype
        });

        console.log(`📷 Image uploaded: ${file.originalname} -> ${file.filename} (ID: ${attachment.id})`);

        res.json({
            success: true,
            file: {
                id: attachment.id,
                url: fileUrl,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            }
        });
    } catch (error) {
        console.error('Image upload error:', error);
        // Cleanup on error
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({
            success: false,
            error: 'Image upload failed'
        });
    }
});

/**
 * POST /api/upload/video
 * Upload a single video
 */
router.post('/video', videoUpload.single('video'), handleUploadError, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No video file provided'
            });
        }

        const file = req.file;
        const filePath = file.path;

        // Validate magic bytes for security
        if (!validateMagicBytes(filePath, 'video')) {
            // Delete invalid file
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid video file format'
            });
        }

        const fileUrl = `/uploads/videos/${file.filename}`;

        // Save to database
        const attachment = saveAttachment({
            type: 'video',
            filename: file.originalname,
            filepath: fileUrl,
            filesize: file.size,
            mimetype: file.mimetype
        });

        console.log(`🎬 Video uploaded: ${file.originalname} -> ${file.filename} (ID: ${attachment.id})`);

        res.json({
            success: true,
            file: {
                id: attachment.id,
                url: fileUrl,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            }
        });
    } catch (error) {
        console.error('Video upload error:', error);
        // Cleanup on error
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({
            success: false,
            error: 'Video upload failed'
        });
    }
});

/**
 * POST /api/upload/audio
 * Upload a single audio file
 */
router.post('/audio', audioUpload.single('audio'), handleUploadError, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided'
            });
        }

        const file = req.file;
        const filePath = file.path;

        // Validate magic bytes for security (webm audio skip as it shares header with video)
        if (!file.mimetype.includes('webm') && !validateMagicBytes(filePath, 'audio')) {
            // Delete invalid file
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid audio file format'
            });
        }

        const fileUrl = `/uploads/audios/${file.filename}`;

        // Save to database
        const attachment = saveAttachment({
            type: 'audio',
            filename: file.originalname,
            filepath: fileUrl,
            filesize: file.size,
            mimetype: file.mimetype
        });

        console.log(`🎵 Audio uploaded: ${file.originalname} -> ${file.filename} (ID: ${attachment.id})`);

        res.json({
            success: true,
            file: {
                id: attachment.id,
                url: fileUrl,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            }
        });
    } catch (error) {
        console.error('Audio upload error:', error);
        // Cleanup on error
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({
            success: false,
            error: 'Audio upload failed'
        });
    }
});

/**
 * POST /api/upload/document
 * Upload a single document
 */
router.post('/document', documentUpload.single('document'), handleUploadError, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No document file provided'
            });
        }

        const file = req.file;
        const fileUrl = `/uploads/documents/${file.filename}`;

        console.log(`📎 Document uploaded: ${file.originalname} -> ${file.filename}`);

        res.json({
            success: true,
            file: {
                url: fileUrl,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            }
        });
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Document upload failed'
        });
    }
});

module.exports = router;

/**
 * Upload Middleware
 * File upload handling with multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadDir, 'images');
const videosDir = path.join(uploadDir, 'videos');
const audiosDir = path.join(uploadDir, 'audios');
const documentsDir = path.join(uploadDir, 'documents');

[uploadDir, imagesDir, videosDir, audiosDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Magic bytes signatures for file type validation
const MAGIC_BYTES = {
    image: {
        'jpg': [0xFF, 0xD8, 0xFF],
        'jpeg': [0xFF, 0xD8, 0xFF],
        'png': [0x89, 0x50, 0x4E, 0x47],
        'gif': [0x47, 0x49, 0x46],
        'webp': [0x52, 0x49, 0x46, 0x46] // RIFF header
    },
    video: {
        'mp4': [0x00, 0x00, 0x00], // ftyp box follows
        'webm': [0x1A, 0x45, 0xDF, 0xA3],
        'mov': [0x00, 0x00, 0x00]
    },
    audio: {
        'mp3': [0xFF, 0xFB], // or ID3
        'wav': [0x52, 0x49, 0x46, 0x46],
        'ogg': [0x4F, 0x67, 0x67, 0x53]
    }
};

/**
 * Validate file magic bytes
 * @param {string} filePath - Path to file
 * @param {string} fileType - Expected file type (image/video/audio)
 * @returns {boolean} - True if valid
 */
function validateMagicBytes(filePath, fileType) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(12);
        fs.readSync(fd, buffer, 0, 12, 0);
        fs.closeSync(fd);

        const signatures = MAGIC_BYTES[fileType];
        if (!signatures) return true; // No validation for documents

        // Check if any signature matches
        for (const [ext, sig] of Object.entries(signatures)) {
            let matches = true;
            for (let i = 0; i < sig.length; i++) {
                if (buffer[i] !== sig[i]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }

        // Special case for ID3 header in MP3
        if (fileType === 'audio' && buffer.toString('utf8', 0, 3) === 'ID3') {
            return true;
        }

        return false;
    } catch (err) {
        console.error('Magic bytes validation error:', err);
        return false;
    }
}

// File type configurations
const FILE_CONFIG = {
    image: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        allowedExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        dir: imagesDir
    },
    video: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedMimes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
        allowedExts: ['.mp4', '.webm', '.mov', '.avi'],
        dir: videosDir
    },
    audio: {
        maxSize: 25 * 1024 * 1024, // 25MB
        allowedMimes: ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav'],
        allowedExts: ['.webm', '.mp3', '.ogg', '.wav'],
        dir: audiosDir
    },
    document: {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedMimes: null, // Accept any MIME type for documents
        allowedExts: null, // Accept any file extension
        dir: documentsDir
    }
};

/**
 * Create multer storage for a specific file type
 */
function createStorage(fileType) {
    const config = FILE_CONFIG[fileType];

    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, config.dir);
        },
        filename: (req, file, cb) => {
            const uniqueId = uuidv4();
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${uniqueId}${ext}`);
        }
    });
}

/**
 * Create file filter for a specific type
 */
function createFileFilter(fileType) {
    const config = FILE_CONFIG[fileType];

    return (req, file, cb) => {
        // If no restrictions (documents), accept any file
        if (!config.allowedMimes || !config.allowedExts) {
            cb(null, true);
            return;
        }

        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype;

        if (config.allowedMimes.includes(mime) && config.allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${config.allowedExts.join(', ')}`), false);
        }
    };
}

/**
 * Create upload middleware for a specific type
 */
function createUploadMiddleware(fileType) {
    const config = FILE_CONFIG[fileType];

    return multer({
        storage: createStorage(fileType),
        limits: {
            fileSize: config.maxSize
        },
        fileFilter: createFileFilter(fileType)
    });
}

// Export configured uploaders
const imageUpload = createUploadMiddleware('image');
const videoUpload = createUploadMiddleware('video');
const audioUpload = createUploadMiddleware('audio');
const documentUpload = createUploadMiddleware('document');

// Error handler middleware
function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large'
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    next();
}

module.exports = {
    imageUpload,
    videoUpload,
    audioUpload,
    documentUpload,
    handleUploadError,
    validateMagicBytes,
    FILE_CONFIG
};

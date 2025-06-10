const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import fs for directory creation

// --- CV Upload Configuration --- 
const cvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/cvs/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `cv-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const cvFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed for CVs!'), false);
    }
};

const cvUpload = multer({
    storage: cvStorage,
    fileFilter: cvFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

exports.uploadCV = cvUpload.single('cv');

// --- Election Image Upload Configuration --- 
const electionImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/election_images/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `election-image-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const electionImageFileFilter = (req, file, cb) => {
    // Allow common image types
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif' || file.mimetype === 'image/webp') {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, GIF, WEBP files are allowed for election images!'), false);
    }
};

const electionImageUpload = multer({
    storage: electionImageStorage,
    fileFilter: electionImageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit per image
});

// Middleware to upload multiple image options (e.g., up to 10 images for 'imageOptions')
// The field name in FormData should be 'imageOptions'
exports.uploadElectionImages = electionImageUpload.array('imageOptions', 10);
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const medicalRecordsDir = path.join(__dirname, '../../uploads/medical-records');
  const profilePicturesDir = path.join(__dirname, '../../uploads/profile-pictures');
  
  if (!fs.existsSync(medicalRecordsDir)) {
    fs.mkdirSync(medicalRecordsDir, { recursive: true });
  }
  
  if (!fs.existsSync(profilePicturesDir)) {
    fs.mkdirSync(profilePicturesDir, { recursive: true });
  }
};

// Call this to ensure directories exist
ensureUploadDirs();

// Storage configuration for medical records
const medicalRecordsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/medical-records');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `medical-record-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Storage configuration for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/profile-pictures');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter for medical records (PDFs only)
const medicalRecordFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for medical records'));
  }
};

// File filter for profile pictures (images only)
const profilePictureFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for profile pictures'));
  }
};

// Multer configurations
export const uploadMedicalRecord = multer({
  storage: medicalRecordsStorage,
  fileFilter: medicalRecordFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  fileFilter: profilePictureFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
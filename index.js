const express = require('express');
const multer = require('multer');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const path = require('path');
const { PythonShell } = require('python-shell');
const cors = require('cors');

const port = 8000;
const app = express();

// Middleware CORS
app.use(cors());

// Ensure 'upload' directory exists
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'upload');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type'), false);
    }
};

// Initialize Multer with storage, file filter, and size limits
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Function to delete all files in a directory except 'stay'
const deleteFilesInDirectory = (directory) => {
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        if (files.length === 0) {
            console.log('No files to delete.');
            return;
        }

        files.forEach(file => {
            // Exempt 'stay' files
            if (file === 'stay' || file === `stay${path.extname(file)}`) {
                console.log(`File exempted from deletion: ${file}`);
                return;
            }

            fs.unlink(path.join(directory, file), (err) => {
                if (err) {
                    console.error(`Error deleting file ${file}:`, err);
                    return;
                }
                console.log(`File deleted: ${file}`);
            });
        });
    });
};

// Function to schedule file deletion after a delay
const scheduleFileDeletion = (directory, delay) => {
    setTimeout(() => {
        deleteFilesInDirectory(directory);
    }, delay);
};

// Routes

app.get("/", (req, res) => res.send("Josephine File Converter API"));

// PDF to Word Conversion
app.post('/pdftoword', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        console.error('No file uploaded.');
        return res.status(400).send('No file uploaded.');
    }

    const originalFileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const parsedPath = path.parse(req.file.path);
    const docxFilePath = path.join(parsedPath.dir, `${parsedPath.name}.docx`);
    const renamedFilePath = path.join('upload', `${originalFileName}_converted_by_JosephineFC.docx`);

    // Execute Python script for conversion
    const pyshell = new PythonShell('convertisseur.py', {
        mode: 'text',
        pythonPath: 'python', // Ensure 'python' is in PATH or provide full path
        scriptPath: __dirname,
        args: [req.file.path, docxFilePath]
    });

    let pythonErrorOccurred = false;

    pyshell.on('message', (message) => {
        console.log('Python script message:', message);
    });

    pyshell.on('stderr', (stderr) => {
        console.error('Python script stderr:', stderr);
    });

    pyshell.on('error', (error) => {
        console.error('Python execution error:', error);
        pythonErrorOccurred = true;
        return res.status(500).send('Error executing Python script.');
    });

    pyshell.end((err, code, signal) => {
        if (err || pythonErrorOccurred) {
            console.error('Final Python execution error:', err);
            return res.status(500).send('Error during conversion.');
        }

        console.log(`Python script finished with code ${code} and signal ${signal}`);

        // Rename the converted file
        fs.rename(docxFilePath, renamedFilePath, (err) => {
            if (err) {
                console.error('Error renaming file:', err);
                return res.status(500).send('Error renaming the file.');
            }

            // Send the converted file as a download
            res.download(renamedFilePath, (err) => {
                if (err) {
                    console.error('Error downloading the DOCX file:', err);
                    return res.status(500).send('Error downloading the DOCX file.');
                }

                // Schedule deletion after 60 seconds
                scheduleFileDeletion('upload', 60000);
            });
        });
    });
});

// Image to Text (OCR) Conversion
app.post('/imgtodoc', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded.');
            return res.status(400).send('No file uploaded.');
        }

        console.log('Received file:', req.file.path);

        const { data: { text } } = await Tesseract.recognize(
            req.file.path,
            'fra+eng', // Combined languages
            {
                logger: info => console.log(info),
            }
        );

        console.log('Extracted text:', text);
        res.json({ text });

        // Schedule deletion after 60 seconds
        scheduleFileDeletion('upload', 60000);
    } catch (err) {
        console.error('Error processing image:', err);
        res.status(500).send('Error processing the image.');
    }
});

// Serve uploaded files statically (optional)
app.use('/upload', express.static(path.join(__dirname, 'upload')));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

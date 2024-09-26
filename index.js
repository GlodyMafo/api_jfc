const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PythonShell } = require('python-shell');
const cors = require('cors');
const port = 5000;

const app = express();

// Middleware CORS
app.use(cors());

// La configuration du stockage des fichiers avec Multer
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'upload');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Initialisation de Multer pour gérer les fichiers
let upload = multer({
    storage: storage
});

// Fonction pour supprimer tous les fichiers dans un répertoire
const deleteFilesInDirectory = (directory) => {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), (err) => {
                if (err) throw err;
                console.log(`Fichier supprimé : ${file}`);
            });
        }
    });
};

// Routes
app.post('/conversion', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Aucun fichier téléchargé.');
    }

    const originalFileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const docxFilePath = req.file.path.replace('.pdf', '.docx');
    const renamedFilePath = path.join('upload', `${originalFileName} converted_by_JosephineFC.docx`);

    // Exécute le script Python pour la conversion
    const pyshell = new PythonShell('convertisseur.py', {
        mode: 'text',
        pythonPath: 'python',
        scriptPath: __dirname,
        args: [req.file.path]
    });

    // Gestion des messages et erreurs de python
    pyshell.on('message', (message) => {
        console.log('Message du script Python :', message);
    });

    pyshell.on('error', (error) => {
        console.error('Erreur d\'exécution Python :', error);
        return res.status(500).send('Erreur lors de l\'exécution du script Python.');
    });

    pyshell.end((err, code, signal) => {
        if (err) {
            console.error('Erreur d\'exécution finale Python :', err);
            return res.status(500).send('Erreur lors de la conversion.');
        }

        console.log('Script Python terminé avec le code :', code, 'et le signal :', signal);

        // Renomme le fichier converti
        fs.rename(docxFilePath, renamedFilePath, (err) => {
            if (err) {
                console.error('Erreur lors du renommage du fichier :', err);
                return res.status(500).send('Erreur lors du renommage du fichier.');
            }

            // Télécharge le fichier DOCX converti avec le nouveau nom
            res.download(renamedFilePath, (err) => {
                if (err) {
                    console.error('Erreur lors du téléchargement du fichier DOCX :', err);
                    return res.status(500).send('Erreur lors du téléchargement du fichier DOCX.');
                }

                // Supprime tous les fichiers après 60 secondes
                
                setTimeout(() => {
                    deleteFilesInDirectory('upload');
                }, 60000); 
            });
        });
    });
});

// Serveur les fichiers statiques dans le répertoire `upload`
app.use('/upload', express.static(path.join(__dirname, 'upload')));

// Lancement du serveur
app.listen(port, () => {
    console.log(`L'application tourne sur le port localhost:${port}`);
});

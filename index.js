// const express = require('express');
// const multer = require('multer');
// const fs = require('fs');
// const Tesseract = require('tesseract.js');
// const path = require('path');
// const { PythonShell } = require('python-shell');
// const cors = require('cors');
// const port = 8000;

// const app = express();

// // Middleware CORS
// app.use(cors());

// // Configuration du stockage des fichiers avec Multer (diskStorage)
// let storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'upload');
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname));
//     }
// });

// // Initialisation de Multer pour gérer les fichiers
// let upload = multer({
//     storage: storage
// });

// // Fonction pour supprimer tous les fichiers dans un répertoire sauf 'stay'
// const deleteFilesInDirectory = (directory) => {
//     fs.readdir(directory, (err, files) => {
//         if (err) {
//             console.error('Erreur lors de la lecture du répertoire :', err);
//             return;
//         }

//         if (files.length === 0) {
//             console.log('Aucun fichier à supprimer.');
//             return;
//         }

//         for (const file of files) {
//             // Vérifier si le fichier est 'stay'
//             if (file === 'stay' || file === 'stay' + path.extname(file)) {
//                 console.log(`Fichier exempté de suppression : ${file}`);
//                 continue; // Passer au fichier suivant
//             }

//             fs.unlink(path.join(directory, file), (err) => {
//                 if (err) {
//                     console.error(`Erreur lors de la suppression du fichier ${file} :`, err);
//                     return;
//                 }
//                 console.log(`Fichier supprimé : ${file}`);
//             });
//         }
//     });
// };

// // Fonction pour planifier la suppression des fichiers
// const scheduleFileDeletion = (directory, delay) => {
//     setTimeout(() => {
//         deleteFilesInDirectory(directory);
//     }, delay);
// };

// // Routes

// app.get("/", (req, res) => res.send("Josephine file converter api"));

// app.post('/pdftoword', upload.single('pdf'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('Aucun fichier téléchargé.');
//     }

//     const originalFileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
//     const docxFilePath = req.file.path.replace('.pdf', '.docx');
//     const renamedFilePath = path.join('upload', `${originalFileName} converted_by_JosephineFC.docx`);

//     // Exécute le script Python pour la conversion
//     const pyshell = new PythonShell('convertisseur.py', {
//         mode: 'text',
//         pythonPath: 'python',
//         scriptPath: __dirname,
//         args: [req.file.path]
//     });

//     // Gestion des messages et erreurs de python
//     pyshell.on('message', (message) => {
//         console.log('Message du script Python :', message);
//     });

//     pyshell.on('error', (error) => {
//         console.error('Erreur d\'exécution Python :', error);
//         return res.status(500).send('Erreur lors de l\'exécution du script Python.');
//     });

//     pyshell.end((err, code, signal) => {
//         if (err) {
//             console.error('Erreur d\'exécution finale Python :', err);
//             return res.status(500).send('Erreur lors de la conversion.');
//         }

//         console.log('Script Python terminé avec le code :', code, 'et le signal :', signal);

//         fs.rename(docxFilePath, renamedFilePath, (err) => {
//             if (err) {
//                 console.error('Erreur lors du renommage du fichier :', err);
//                 return res.status(500).send('Erreur lors du renommage du fichier.');
//             }

//             res.download(renamedFilePath, (err) => {
//                 if (err) {
//                     console.error('Erreur lors du téléchargement du fichier DOCX :', err);
//                     return res.status(500).send('Erreur lors du téléchargement du fichier DOCX.');
//                 }

//                 scheduleFileDeletion('upload', 60000); // Planifie la suppression après 60 secondes
//             });
//         });
//     });
// });

// // imageToPdf

// app.post('/imgtodoc', upload.single('image'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('Aucun fichier téléchargé.');
//     }

//     Tesseract.recognize(
//         req.file.path, 
//         'fra', 'En',
//         {
//             logger: info => console.log(info), 
//         }
//     ).then(({ data: { text } }) => {
//         res.json({ text });

//         scheduleFileDeletion('upload', 60000); // Planifie la suppression après 60 secondes
//     }).catch(err => {
//         console.error(err);
//         res.status(500).send('Erreur lors du traitement de l\'image.');
//     });
// });

// app.use('/upload', express.static(path.join(__dirname, 'upload')));

// app.listen(port, () => {
//     console.log(`L'application tourne sur le port localhost:${port}`);
// });


const express = require('express');
const multer = require('multer');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const path = require('path');
const cors = require('cors');
const corsConfig = {
    origin: "*",
    credential : true,
    methods : ["GET","POST","PUT","DELETE"]
}
app.options("",cors(corsConfig))
const port = 8000;

const app = express();

// Middleware CORS
app.use(cors());


// Assurez-vous que le répertoire 'upload' existe
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage des fichiers avec Multer (diskStorage)
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

// Fonction pour supprimer tous les fichiers dans un répertoire sauf 'stay'
const deleteFilesInDirectory = (directory) => {
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error('Erreur lors de la lecture du répertoire :', err);
            return;
        }

        if (files.length === 0) {
            console.log('Aucun fichier à supprimer.');
            return;
        }

        for (const file of files) {
            // Vérifier si le fichier est 'stay'
            if (file === 'stay' || file === 'stay' + path.extname(file)) {
                console.log(`Fichier exempté de suppression : ${file}`);
                continue; // Passer au fichier suivant
            }

            fs.unlink(path.join(directory, file), (err) => {
                if (err) {
                    console.error(`Erreur lors de la suppression du fichier ${file} :`, err);
                    return;
                }
                console.log(`Fichier supprimé : ${file}`);
            });
        }
    });
};

// Fonction pour planifier la suppression des fichiers
const scheduleFileDeletion = (directory, delay) => {
    setTimeout(() => {
        deleteFilesInDirectory(directory);
    }, delay);
};

// Routes

app.get("/", (req, res) => res.send("Josephine file converter api"));

app.post('/pdftoword', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        console.error('Aucun fichier téléchargé.');
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

        fs.rename(docxFilePath, renamedFilePath, (err) => {
            if (err) {
                console.error('Erreur lors du renommage du fichier :', err);
                return res.status(500).send('Erreur lors du renommage du fichier.');
            }

            res.download(renamedFilePath, (err) => {
                if (err) {
                    console.error('Erreur lors du téléchargement du fichier DOCX :', err);
                    return res.status(500).send('Erreur lors du téléchargement du fichier DOCX.');
                }

                scheduleFileDeletion('upload', 60000); // Planifie la suppression après 60 secondes
            });
        });
    });
});

// imageToDoc

app.post('/imgtodoc', upload.single('image'), (req, res) => {
    if (!req.file) {
        console.error('Aucun fichier téléchargé.');
        return res.status(400).send('Aucun fichier téléchargé.');
    }

    console.log('Fichier reçu :', req.file.path);

    Tesseract.recognize(
        req.file.path, 
        'fra+eng', // Langues combinées correctement
        {
            logger: info => console.log(info), 
        }
    ).then(({ data: { text } }) => {
        console.log('Texte extrait :', text);
        res.json({ text });

        scheduleFileDeletion('upload', 60000); // Planifie la suppression après 60 secondes
    }).catch(err => {
        console.error('Erreur lors du traitement de l\'image :', err);
        res.status(500).send('Erreur lors du traitement de l\'image.');
    });
});

app.use('/upload', express.static(path.join(__dirname, 'upload')));

app.listen(port, () => {
    console.log(`L'application tourne sur le port localhost:${port}`);
});


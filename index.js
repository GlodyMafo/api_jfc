// const express = require('express');
// const cors = require('cors');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const axios = require('axios');
// const FormData = require('form-data');
// const Tesseract = require('tesseract.js');

// const app = express();
// const port = 8000; // Définir le port de l'application
// app.use(cors());

// // S'assurer que le dossier upload existe
// const uploadDir = 'upload';
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir);
// }

// // Configuration de multer
// let storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, uploadDir); // Utiliser la variable uploadDir
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname));
//     }
// });

// let upload = multer({ storage: storage });

// // Route pour la conversion PDF vers Word
// app.post('/pdftoword', upload.single('pdf'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('Aucun fichier téléchargé.');
//     }
    
//     console.log(`Fichier PDF téléchargé : ${req.file.path}`); // Log du chemin du fichier

//     try {
//         const formData = new FormData();
//         formData.append('file', fs.createReadStream(req.file.path));

//         const response = await axios.post('http://localhost:8001/convert', formData, {
//             headers: {
//                 ...formData.getHeaders(),
//             },
//         });

//         const docxFileName = response.data.docx_file.split('/').pop(); // Récupérer uniquement le nom du fichier
//         const docxFilePath = path.join(__dirname, './Fast_API_JC', docxFileName); // Assurez-vous que le chemin est correct

//         res.download(docxFilePath, (err) => {
//             if (err) {
//                 console.error('Erreur lors du téléchargement du fichier DOCX :', err);
//                 return res.status(500).send('Erreur lors du téléchargement du fichier DOCX.');
//             }
//         });
//     } catch (error) {
//         console.error('Erreur lors de l\'appel à l\'API FastAPI :', error);
//         res.status(500).send('Erreur lors de la conversion du fichier PDF en DOCX.');
//     }
// });

// // Route pour la conversion d'image en texte
// app.post('/imgtodoc', upload.single('image'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('Aucun fichier téléchargé.');
//     }

//     console.log(`Image téléchargée : ${req.file.path}`); // Log du chemin de l'image

//     Tesseract.recognize(
//         req.file.path, 
//         'fra', 'En',
//         {
//             logger: info => console.log(info), 
//         }
//     ).then(({ data: { text } }) => {
//         res.json({ text });
//     }).catch(err => {
//         console.error(err);
//         res.status(500).send('Erreur lors du traitement de l\'image.');
//     });
// });

// // Servir les fichiers statiques dans le répertoire 'upload'
// app.use('/upload', express.static(path.join(__dirname, uploadDir)));

// // Lancer le serveur
// app.listen(port, () => {
//     console.log(`L'application tourne sur le port localhost:${port}`);
// });


const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = 8000;
app.use(cors());


const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

let upload = multer({ storage: storage });

// Deletion function exept stay file
const deleteFilesExceptStay = () => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            // console.error('Erreur lors de la lecture du dossier :', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(uploadDir, file);

            // Saving Only "stay.png"
            if (file !== 'stay.png' && fs.lstatSync(filePath).isFile()) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        // console.error(`Erreur lors de la suppression du fichier ${file}:`, err);
                    } else {
                        // console.log(`Fichier supprimé : ${file}`);
                    }
                });
            }
        });
    });
};

// Route pour la conversion PDF vers Word
app.post('/pdftoword', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Aucun fichier téléchargé.');
    }

    // console.log(`Fichier PDF téléchargé : ${req.file.path}`); 

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));

        // Converting file with my python server
        const response = await axios.post('http://localhost:8001/convert', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            responseType: 'json', 
        });

        // Récupérer l'URL du fichier DOCX depuis la réponse
        const docxFileUrl = response.data.docx_file;
        // console.log('Fichier DOCX disponible à :', docxFileUrl);

        // Récupérer le fichier DOCX généré depuis FastAPI
        const docxResponse = await axios.get(`http://localhost:8001${docxFileUrl}`, {
            responseType: 'stream', // Pour traiter la réponse comme un flux binaire
        });

        // Définir les en-têtes pour le téléchargement du fichier
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(docxFileUrl)}"`);

        // Piping du fichier DOCX vers le client
        docxResponse.data.pipe(res).on('error', (err) => {
            // console.error('Erreur lors de l\'envoi du fichier DOCX :', err);

            res.status(500).send('Erreur lors de l\'envoi du fichier DOCX.');
        });
    } catch (error) {
        // console.error('Erreur lors de l\'appel à l\'API FastAPI :', error);
        res.status(500).send('Erreur lors de la conversion du fichier PDF en DOCX.');
    }

    // Supprimer les fichiers dans 'uploads' sauf 'stay.png' après 40 secondes
    setTimeout(() => {
        deleteFilesExceptStay();
    }, 40000); // 40 secondes 
});

// Lancer le serveur
app.listen(port, () => {
    // console.log(`L'application tourne sur le port localhost:${port}`);
});

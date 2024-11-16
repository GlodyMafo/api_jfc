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

       
        const docxFileUrl = response.data.docx_file;
        // console.log('Fichier DOCX disponible à :', docxFileUrl);

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

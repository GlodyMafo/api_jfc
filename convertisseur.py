from pdf2docx import Converter
import sys

def convert_pdf_to_docx(pdf_file, docx_file):
    
    # Initialisation du convertisseur
    cv = Converter(pdf_file)
    cv.convert(docx_file, start=0, end=None)  # Convertit tout le fichier
    cv.close()

if __name__ == "__main__":
    pdf_file = sys.argv[1]  # Le fichier PDF est passé en argument
    docx_file = pdf_file.replace(".pdf", ".docx")  # Génère le nom du fichier .docx
    convert_pdf_to_docx(pdf_file, docx_file)
    print("Conversion réussie : ", docx_file)

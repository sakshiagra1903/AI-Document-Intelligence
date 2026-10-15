# Document Intelligence Module

This module directly implements the supplied project specification: document upload, image preprocessing, OCR, AI/NLP analysis, document classification, key information extraction, storage/display, verification and final searchable output.

## Pipeline

Upload → preprocessing → OCR/text extraction → NLP/ML classification → key-field extraction → vector indexing → database → verification → RAG/search.

### OCR
Tesseract is installed in the backend image. Digital PDFs use native text extraction; pages with little/no text are rendered and sent through Tesseract. PNG/JPG/TIFF/BMP/WEBP uploads are also supported.

### Preprocessing
Images are converted to grayscale, upscaled when small, contrast-normalized and median-filtered before OCR.

### Classification
A small TF-IDF + logistic-regression baseline classifies invoice, contract, medical record, financial statement, application form and general documents. This is a practical baseline, not a claim of reproducing a research paper.

### Extraction
Common Name, Date, Amount and ID fields are extracted into structured JSON. The dashboard exposes confidence, OCR usage, chunks and verification status.

### Verification
Reviewers can mark documents verified or rejected and store notes.

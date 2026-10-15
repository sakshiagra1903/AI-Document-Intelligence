import os, csv, json, re
from io import BytesIO
from PIL import Image, ImageOps, ImageFilter


def preprocess_image(image: Image.Image) -> Image.Image:
    """Lightweight preprocessing: grayscale, contrast, upscale, denoise."""
    image = image.convert("L")
    if image.width < 1600:
        scale = 1600 / max(image.width, 1)
        image = image.resize((int(image.width*scale), int(image.height*scale)))
    image = ImageOps.autocontrast(image)
    image = image.filter(ImageFilter.MedianFilter(size=3))
    return image


def ocr_image(image: Image.Image) -> str:
    try:
        import pytesseract
        return pytesseract.image_to_string(preprocess_image(image)).strip()
    except Exception:
        return ""


def extract_text(filename, data):
    """Return [(page, text)] and whether OCR was used."""
    ext=os.path.splitext(filename)[1].lower()
    if ext=='.pdf':
        try:
            from pypdf import PdfReader
            r=PdfReader(BytesIO(data))
            pages=[]; ocr_used=False
            for i,p in enumerate(r.pages):
                text=(p.extract_text() or '').strip()
                # Scanned/near-empty pages are rendered and OCR'd when Tesseract is available.
                if len(text) < 40:
                    try:
                        import fitz
                        doc=fitz.open(stream=data,filetype='pdf'); pix=doc[i].get_pixmap(matrix=fitz.Matrix(1.7,1.7), alpha=False)
                        img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
                        ocr=ocr_image(img)
                        if ocr:
                            text=ocr; ocr_used=True
                    except Exception:
                        pass
                pages.append((i+1,text))
            return pages, ocr_used
        except Exception:
            return [], False
    if ext in {'.png','.jpg','.jpeg','.tiff','.bmp','.webp'}:
        try:
            img=Image.open(BytesIO(data)); text=ocr_image(img)
            return [(1,text)], bool(text)
        except Exception:
            return [(1,'')], False
    if ext=='.docx':
        from docx import Document
        d=Document(BytesIO(data)); return [(1,'\n'.join(p.text for p in d.paragraphs))], False
    if ext=='.json': return [(1,json.dumps(json.loads(data.decode()),ensure_ascii=False,indent=2))], False
    if ext=='.csv': return [(1,'\n'.join(','.join(row) for row in csv.reader(data.decode(errors='ignore').splitlines())))], False
    return [(1,data.decode(errors='ignore'))], False


def chunks(pages,size=900,overlap=120):
    out=[]
    for page,text in pages:
        text=' '.join(text.split())
        start=0
        while start<len(text):
            end=min(len(text),start+size); piece=text[start:end]
            if len(piece.strip())>=40: out.append((page,piece))
            if end==len(text): break
            start=max(end-overlap,start+1)
    return out


def classify_document(text: str):
    """Small reproducible ML baseline using TF-IDF + logistic regression, with keyword fallback."""
    labels=['invoice','contract','medical_record','financial_statement','application_form','general']
    samples=[
      'invoice bill amount subtotal tax invoice number vendor customer payment due',
      'agreement contract terms parties signature clause liability effective date',
      'patient medical record diagnosis medication doctor hospital blood test clinical',
      'balance sheet income statement assets liabilities revenue expenses financial',
      'application form name address phone email identification date of birth',
      'company document policy information notes overview general document'
    ]
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        vec=TfidfVectorizer(ngram_range=(1,2),stop_words='english')
        X=vec.fit_transform(samples); model=LogisticRegression(max_iter=500).fit(X,labels)
        Xq=vec.transform([text[:12000]])
        pred=model.predict(Xq)[0]; conf=float(max(model.predict_proba(Xq)[0]))
        return pred, round(conf,3), 'tfidf-logistic-regression'
    except Exception:
        low=text.lower()
        scores={l:sum(k in low for k in ks) for l,ks in {
          'invoice':['invoice','subtotal','tax','amount due','vendor'],
          'contract':['agreement','contract','clause','party','signature'],
          'medical_record':['patient','diagnosis','medication','hospital','doctor'],
          'financial_statement':['balance sheet','assets','liabilities','revenue','expenses'],
          'application_form':['name','address','phone','email','date of birth'],
          'general':[]}.items()}
        label=max(scores,key=scores.get); total=sum(scores.values()); return label, round(scores[label]/max(total,1),3), 'keyword-fallback'


def extract_key_fields(text: str):
    """Domain-neutral structured field extraction for common business documents."""
    def first(patterns):
        for p in patterns:
            m=re.search(p,text,re.I|re.M)
            if m: return m.group(1).strip()
        return None
    data={
      'name': first([r'\b(?:name|customer name|patient name|applicant)\s*[:#-]\s*([A-Za-z][A-Za-z .\'\-]{1,100})', r'\b(?:Mr\.?|Ms\.?|Mrs\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})']),
      'date': first([r'\b(?:date|invoice date|issue date|effective date|dob)\s*[:#-]\s*(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})', r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b']),
      'amount': first([r'\b(?:total|amount due|grand total|net amount|balance)\s*[:#-]?\s*(?:₹|Rs\.?|INR|\$|USD|EUR)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)', r'(?:₹|Rs\.?|INR|\$|USD|EUR)\s*([0-9][0-9,]*(?:\.\d{1,2})?)']),
      'id': first([r'\b(?:invoice no\.?|invoice number|patient id|customer id|application id|id)\s*[:#-]\s*([A-Z0-9][A-Z0-9\-/]{2,40})'])
    }
    return {k:v for k,v in data.items() if v}

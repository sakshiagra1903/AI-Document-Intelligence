from app.services.ingestion.service import chunks, classify_document, extract_key_fields

def test_classification_and_fields():
    text='Invoice Number: INV-204 Date: 12/09/2026 Customer Name: Rahul Sharma Total: INR 12,500'
    label, confidence, method = classify_document(text + ' subtotal tax amount due vendor')
    assert label in {'invoice','general'}
    assert 0 <= confidence <= 1
    fields=extract_key_fields(text)
    assert fields.get('id') == 'INV-204'
    assert fields.get('amount') == '12,500'

def test_chunking_preserves_pages():
    out=chunks([(4,'A'*1000)],size=500,overlap=50)
    assert out and all(page==4 for page,_ in out)

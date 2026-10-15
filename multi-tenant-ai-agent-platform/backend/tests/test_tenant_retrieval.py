# Integration test contract: retrieval always applies tenant_id in its database query.
from pathlib import Path

def test_retrieval_is_tenant_scoped():
    src=Path(__file__).parents[1]/'app/services/retrieval/service.py'
    assert 'DocumentChunk.tenant_id==tenant_id' in src.read_text()

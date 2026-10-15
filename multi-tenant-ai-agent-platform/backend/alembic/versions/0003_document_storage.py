"""Add durable original-file storage key for document re-indexing."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '0003_document_storage'
down_revision = '0002_booking_engine'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column['name'] for column in inspect(bind).get_columns('documents')}
    # Also upgrades databases created by an earlier version of the project.
    additions = [
        ('classification', sa.String(length=80), True),
        ('classification_confidence', sa.Float(), False),
        ('extracted_data', sa.JSON(), False),
        ('ocr_used', sa.Boolean(), False),
        ('verification_status', sa.String(length=30), False),
        ('verification_notes', sa.Text(), True),
        ('storage_key', sa.String(length=255), True),
    ]
    for name, type_, nullable in additions:
        if name not in columns:
            if name == 'classification_confidence':
                op.add_column('documents', sa.Column(name, type_, nullable=False, server_default='0'))
            elif name == 'extracted_data':
                op.add_column('documents', sa.Column(name, type_, nullable=False, server_default='{}'))
            elif name == 'ocr_used':
                op.add_column('documents', sa.Column(name, type_, nullable=False, server_default=sa.false()))
            elif name == 'verification_status':
                op.add_column('documents', sa.Column(name, type_, nullable=False, server_default='pending'))
            else:
                op.add_column('documents', sa.Column(name, type_, nullable=nullable))


def downgrade():
    # Non-destructive by design: these fields contain user document workflow data.
    pass

"""initial schema"""
from alembic import op
from app.db.session import Base
from app.models import *
revision='0001'
down_revision=None
branch_labels=None
depends_on=None

def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    Base.metadata.create_all(op.get_bind())

def downgrade():
    Base.metadata.drop_all(op.get_bind())

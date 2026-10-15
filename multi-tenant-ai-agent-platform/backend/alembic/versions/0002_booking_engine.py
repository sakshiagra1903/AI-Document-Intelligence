"""add conversational booking and transaction engine"""
from alembic import op
from app.db.session import Base
from app.models import *
revision='0002_booking_engine'
down_revision='0001'
branch_labels=None
depends_on=None

def upgrade():
    Base.metadata.create_all(op.get_bind())

def downgrade():
    # Booking tables are intentionally left intact during normal downgrade to avoid destructive data loss.
    pass

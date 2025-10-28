"""Add doc_slot field to documents table

Revision ID: add_doc_slot_field
Revises: 3be36e6b146e
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_doc_slot_field'
down_revision = '3be36e6b146e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add doc_slot column to documents table
    op.add_column('documents', sa.Column('doc_slot', sa.String(length=10), nullable=True, server_default='D1'))


def downgrade() -> None:
    # Remove doc_slot column from documents table
    op.drop_column('documents', 'doc_slot')

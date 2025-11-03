"""add_is_verified_column_to_user

Revision ID: 8facd9994a97
Revises: add_missing_schema
Create Date: 2025-10-29 22:25:58.111201

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8facd9994a97'
down_revision: Union[str, Sequence[str], None] = 'add_missing_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_verified column to user table if it doesn't exist
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user' AND column_name = 'is_verified'
            ) THEN
                ALTER TABLE "user" ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove is_verified column from user table
    op.drop_column('user', 'is_verified')

"""Add missing schema fields and tables

Revision ID: add_missing_schema
Revises: add_doc_slot_field
Create Date: 2025-01-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_missing_schema'
down_revision = 'add_doc_slot_field'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to documents table
    op.add_column('documents', sa.Column('document_type', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('documents', sa.Column('subtask_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('documents', sa.Column('status', sa.String(length=50), nullable=True, server_default='pending'))
    op.add_column('documents', sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('documents', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('admin_comments', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('version_number', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('documents', sa.Column('is_latest_version', sa.Boolean(), nullable=True, server_default='true'))
    op.add_column('documents', sa.Column('parent_document_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('documents', sa.Column('version_notes', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('version_status', sa.String(length=50), nullable=True, server_default='active'))
    op.add_column('documents', sa.Column('review_locked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('review_locked_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('documents', sa.Column('version_change_reason', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('file_data', postgresql.BYTEA(), nullable=True))
    op.add_column('documents', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    
    # Add foreign key constraints for new document columns
    op.create_foreign_key('fk_documents_task', 'documents', 'tasks', ['task_id'], ['task_id'], ondelete='CASCADE')
    op.create_foreign_key('fk_documents_parent', 'documents', 'documents', ['parent_document_id'], ['document_id'], ondelete='SET NULL')
    op.create_foreign_key('fk_documents_approved_by', 'documents', 'user', ['approved_by'], ['user_id'])
    op.create_foreign_key('fk_documents_review_locked_by', 'documents', 'user', ['review_locked_by'], ['user_id'])
    
    # Add missing column to tasks table
    op.add_column('tasks', sa.Column('completion_notes', sa.Text(), nullable=True))
    
    # Create subtasks table
    op.create_table('subtasks',
        sa.Column('subtask_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=True, server_default='0'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.task_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to'], ['user.user_id']),
        sa.ForeignKeyConstraint(['created_by'], ['user.user_id']),
        sa.PrimaryKeyConstraint('subtask_id')
    )
    
    # Add foreign key for subtask_id in documents
    op.create_foreign_key('fk_documents_subtask', 'documents', 'subtasks', ['subtask_id'], ['subtask_id'], ondelete='CASCADE')
    
    # Create document_assignments table
    op.create_table('document_assignments',
        sa.Column('assignment_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('land_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reviewer_role', sa.String(length=50), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assignment_status', sa.String(length=50), nullable=True, server_default='assigned'),
        sa.Column('assignment_notes', sa.Text(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True, server_default='medium'),
        sa.Column('is_locked', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('lock_reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.document_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['land_id'], ['lands.land_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to'], ['user.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['user.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.task_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('assignment_id')
    )
    
    # Create message_threads table (must be before messages due to foreign key)
    op.create_table('message_threads',
        sa.Column('thread_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.task_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['user.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('thread_id')
    )
    
    # Create messages table (not in initial migration, must be after message_threads)
    op.create_table('messages',
        sa.Column('message_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('land_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('thread_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(length=50), nullable=True, server_default='text'),
        sa.Column('is_read', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_urgent', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('parent_message_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['land_id'], ['lands.land_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.task_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['thread_id'], ['message_threads.thread_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['user.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['user.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_message_id'], ['messages.message_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('message_id')
    )
    
    # Create message_reactions table
    op.create_table('message_reactions',
        sa.Column('reaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reaction_type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['message_id'], ['messages.message_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('reaction_id'),
        sa.UniqueConstraint('message_id', 'user_id', 'reaction_type', name='uq_message_reaction')
    )
    
    # Create notifications table
    op.create_table('notifications',
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('data', postgresql.JSONB(), nullable=True),
        sa.Column('read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('notification_id')
    )
    
    # Create indexes for better performance
    op.create_index('idx_documents_version', 'documents', ['land_id', 'document_type', 'version_number'])
    op.create_index('idx_documents_latest', 'documents', ['land_id', 'document_type', 'is_latest_version'])
    op.create_index('idx_documents_status', 'documents', ['status', 'version_status'])
    op.create_index('idx_subtasks_task', 'subtasks', ['task_id'])
    op.create_index('idx_messages_recipient', 'messages', ['recipient_id', 'is_read'])
    op.create_index('idx_messages_sender', 'messages', ['sender_id'])
    op.create_index('idx_notifications_user_read', 'notifications', ['user_id', 'read'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_notifications_user_read', 'notifications')
    op.drop_index('idx_messages_sender', 'messages')
    op.drop_index('idx_messages_recipient', 'messages')
    op.drop_index('idx_subtasks_task', 'subtasks')
    op.drop_index('idx_documents_status', 'documents')
    op.drop_index('idx_documents_latest', 'documents')
    op.drop_index('idx_documents_version', 'documents')
    
    # Drop tables
    op.drop_table('notifications')
    op.drop_table('message_reactions')
    op.drop_table('message_threads')
    op.drop_table('document_assignments')
    op.drop_table('subtasks')
    
    # Drop foreign keys from documents
    op.drop_constraint('fk_documents_subtask', 'documents', type_='foreignkey')
    op.drop_constraint('fk_documents_review_locked_by', 'documents', type_='foreignkey')
    op.drop_constraint('fk_documents_approved_by', 'documents', type_='foreignkey')
    op.drop_constraint('fk_documents_parent', 'documents', type_='foreignkey')
    op.drop_constraint('fk_documents_task', 'documents', type_='foreignkey')
    
    # Drop columns from documents
    op.drop_column('documents', 'created_at')
    op.drop_column('documents', 'file_data')
    op.drop_column('documents', 'version_change_reason')
    op.drop_column('documents', 'review_locked_by')
    op.drop_column('documents', 'review_locked_at')
    op.drop_column('documents', 'version_status')
    op.drop_column('documents', 'version_notes')
    op.drop_column('documents', 'parent_document_id')
    op.drop_column('documents', 'is_latest_version')
    op.drop_column('documents', 'version_number')
    op.drop_column('documents', 'admin_comments')
    op.drop_column('documents', 'rejection_reason')
    op.drop_column('documents', 'approved_at')
    op.drop_column('documents', 'approved_by')
    op.drop_column('documents', 'status')
    op.drop_column('documents', 'subtask_id')
    op.drop_column('documents', 'task_id')
    op.drop_column('documents', 'document_type')
    
    # Drop column from tasks
    op.drop_column('tasks', 'completion_notes')


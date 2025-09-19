# app/models/user_model.py
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import relationship

class User(SQLModel, table=True):
    __tablename__ = "employees"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: Optional[str] = Field(max_length=100)
    email: Optional[str] = Field(max_length=100)
    password_hash: Optional[str]
    role: Optional[str] = Field(max_length=100)
    o_status :Optional[bool]=Field(default=False)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    reset_otp: Optional[str] = Field(default=None, max_length=6)
    company_email:Optional[str] = Field(max_length=100)
   

    
   
    
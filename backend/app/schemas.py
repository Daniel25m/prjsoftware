from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["adopter", "donor"]


class UserLogin(BaseModel):
    email: str
    password: str


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str
    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class PetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    species: Literal["Cão", "Gato", "Outro"]
    breed: str = Field(min_length=2, max_length=100)
    size: Literal["small", "medium", "large"]
    age_years: int = Field(ge=0, le=30)
    city: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=10, max_length=2000)
    image_url: str = Field(min_length=8, max_length=500)


class PetRead(BaseModel):
    id: int
    name: str
    species: str
    breed: str
    size: str
    age_years: int
    city: str
    description: str
    image_url: str
    status: str
    donor_id: int
    donor_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AdoptionCreate(BaseModel):
    message: str = Field(min_length=10, max_length=2000)


class AdoptionDecision(BaseModel):
    decision: Literal["approved", "rejected"]


class AdoptionRead(BaseModel):
    id: int
    message: str
    status: str
    created_at: datetime
    pet: PetRead
    adopter: UserRead
    model_config = ConfigDict(from_attributes=True)

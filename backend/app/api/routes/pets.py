from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.dependencies import get_current_user, require_role
from app.models import Pet, User
from app.schemas import PetCreate, PetRead

router = APIRouter(prefix="/pets", tags=["Adoção"])


@router.get("", response_model=list[PetRead])
def list_pets(
    species: str | None = None,
    size: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Pet).options(joinedload(Pet.donor)).where(Pet.status == "available")
    if species and species != "Todos":
        query = query.where(Pet.species == species)
    if size and size != "Todos":
        query = query.where(Pet.size == size)
    if city:
        query = query.where(Pet.city.ilike(f"%{city.strip()}%"))
    return db.scalars(query.order_by(Pet.created_at.desc())).all()


@router.get("/mine", response_model=list[PetRead])
def list_my_pets(user: User = Depends(require_role("donor")), db: Session = Depends(get_db)):
    query = select(Pet).options(joinedload(Pet.donor)).where(Pet.donor_id == user.id).order_by(Pet.created_at.desc())
    return db.scalars(query).all()


@router.post("", response_model=PetRead, status_code=status.HTTP_201_CREATED)
def create_pet(
    payload: PetCreate,
    user: User = Depends(require_role("donor")),
    db: Session = Depends(get_db),
):
    pet = Pet(**payload.model_dump(), donor_id=user.id)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}", response_model=PetRead)
def get_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.scalar(select(Pet).options(joinedload(Pet.donor)).where(Pet.id == pet_id))
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet não encontrado.")
    return pet

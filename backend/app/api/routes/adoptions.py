from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.dependencies import require_role
from app.models import Adoption, Pet, User
from app.schemas import AdoptionCreate, AdoptionDecision, AdoptionRead

router = APIRouter(tags=["Solicitações de adoção"])


@router.post("/pets/{pet_id}/adoptions", response_model=AdoptionRead, status_code=status.HTTP_201_CREATED)
def request_adoption(
    pet_id: int,
    payload: AdoptionCreate,
    user: User = Depends(require_role("adopter")),
    db: Session = Depends(get_db),
):
    pet = db.scalar(select(Pet).where(Pet.id == pet_id).with_for_update())
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet não encontrado.")
    if pet.donor_id == user.id:
        raise HTTPException(status_code=400, detail="Você não pode solicitar a adoção do seu próprio anúncio.")
    if pet.status != "available":
        raise HTTPException(status_code=409, detail="Este pet não está mais disponível.")
    existing = db.scalar(select(Adoption).where(Adoption.pet_id == pet.id, Adoption.adopter_id == user.id))
    if existing:
        raise HTTPException(status_code=409, detail="Você já enviou uma solicitação para este pet.")
    adoption = Adoption(pet=pet, adopter=user, message=payload.message.strip())
    pet.status = "adoption_pending"
    db.add(adoption)
    db.commit()
    db.refresh(adoption)
    return adoption


@router.get("/adoptions/mine", response_model=list[AdoptionRead])
def list_my_adoptions(user: User = Depends(require_role("adopter")), db: Session = Depends(get_db)):
    query = (
        select(Adoption)
        .options(joinedload(Adoption.pet).joinedload(Pet.donor), joinedload(Adoption.adopter))
        .where(Adoption.adopter_id == user.id)
        .order_by(Adoption.created_at.desc())
    )
    return db.scalars(query).all()


@router.get("/adoptions/incoming", response_model=list[AdoptionRead])
def list_incoming_adoptions(user: User = Depends(require_role("donor")), db: Session = Depends(get_db)):
    query = (
        select(Adoption)
        .join(Pet)
        .options(joinedload(Adoption.pet).joinedload(Pet.donor), joinedload(Adoption.adopter))
        .where(Pet.donor_id == user.id)
        .order_by(Adoption.created_at.desc())
    )
    return db.scalars(query).all()


@router.patch("/adoptions/{adoption_id}/decision", response_model=AdoptionRead)
def decide_adoption(
    adoption_id: int,
    payload: AdoptionDecision,
    user: User = Depends(require_role("donor")),
    db: Session = Depends(get_db),
):
    adoption = db.scalar(
        select(Adoption)
        .options(joinedload(Adoption.pet).joinedload(Pet.donor), joinedload(Adoption.adopter))
        .where(Adoption.id == adoption_id)
        .with_for_update()
    )
    if adoption is None:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    if adoption.pet.donor_id != user.id:
        raise HTTPException(status_code=403, detail="Este anúncio pertence a outro doador.")
    if adoption.status != "pending":
        raise HTTPException(status_code=409, detail="Esta solicitação já foi respondida.")
    adoption.status = payload.decision
    adoption.pet.status = "adopted" if payload.decision == "approved" else "available"
    db.commit()
    db.refresh(adoption)
    return adoption

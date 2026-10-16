from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Pet, User
from app.security import hash_password

DEMO_EMAIL = "protetor@petlume.local"
DEMO_PASSWORD = "adote123"


def seed_demo_data() -> None:
    if not settings.seed_demo_data:
        return
    with SessionLocal() as db:
        donor = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if donor is None:
            donor = User(
                name="Casa Amora",
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                role="donor",
            )
            db.add(donor)
            db.flush()
            db.add_all(
                [
                    Pet(
                        name="Pingo", species="Cão", breed="Vira-lata caramelo", size="medium", age_years=2,
                        city="São Paulo", description="Carinhoso, curioso e apaixonado por passeios. Está vacinado e pronto para conhecer uma nova família.",
                        image_url="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=85", donor_id=donor.id,
                    ),
                    Pet(
                        name="Amora", species="Gato", breed="SRD", size="small", age_years=1,
                        city="São Paulo", description="Companheira tranquila que adora uma janela ensolarada. Castrada e com vacinação em dia.",
                        image_url="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=85", donor_id=donor.id,
                    ),
                    Pet(
                        name="Bento", species="Cão", breed="Beagle", size="medium", age_years=4,
                        city="Santo André", description="Um amigo alegre e sociável, acostumado a conviver com pessoas e outros animais.",
                        image_url="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=900&q=85", donor_id=donor.id,
                    ),
                ]
            )
            db.commit()
            print(f"Dados de demonstração: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed_demo_data()

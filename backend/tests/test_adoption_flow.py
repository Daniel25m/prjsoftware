import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    monkeypatch.setattr(main, "engine", engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        with test_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def register(client, name, email, role):
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "adote12345", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def test_donor_adopter_and_adoption_lifecycle(client):
    donor = register(client, "Doadora", "doadora@example.com", "donor")
    client.headers["Authorization"] = f"Bearer {donor['access_token']}"
    pet_response = client.post(
        "/api/pets",
        json={
            "name": "Nina",
            "species": "Cão",
            "breed": "SRD",
            "size": "medium",
            "age_years": 2,
            "city": "São Paulo",
            "description": "Carinhosa e pronta para encontrar uma família.",
            "image_url": "https://example.com/nina.jpg",
        },
    )
    assert pet_response.status_code == 201
    pet_id = pet_response.json()["id"]

    adopter = register(client, "Adotante", "adotante@example.com", "adopter")
    client.headers["Authorization"] = f"Bearer {adopter['access_token']}"
    request_response = client.post(
        f"/api/pets/{pet_id}/adoptions",
        json={"message": "Tenho espaço e tempo para cuidar muito bem da Nina."},
    )
    assert request_response.status_code == 201
    assert request_response.json()["status"] == "pending"
    assert client.get("/api/pets").json() == []

    client.headers["Authorization"] = f"Bearer {donor['access_token']}"
    incoming = client.get("/api/adoptions/incoming")
    assert incoming.status_code == 200
    adoption_id = incoming.json()[0]["id"]
    decision = client.patch(
        f"/api/adoptions/{adoption_id}/decision",
        json={"decision": "approved"},
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "approved"

    client.headers["Authorization"] = f"Bearer {adopter['access_token']}"
    my_adoptions = client.get("/api/adoptions/mine")
    assert my_adoptions.status_code == 200
    assert my_adoptions.json()[0]["status"] == "approved"


def test_adopter_cannot_publish_pet(client):
    adopter = register(client, "Adotante", "adotante@example.com", "adopter")
    client.headers["Authorization"] = f"Bearer {adopter['access_token']}"
    response = client.post("/api/pets", json={})
    assert response.status_code == 403
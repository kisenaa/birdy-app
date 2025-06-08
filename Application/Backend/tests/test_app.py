import sys
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app import create_app

@pytest.fixture
def client(monkeypatch):
    # Patch items that create_app expects
    monkeypatch.setitem(sys.modules, "app.Tortoise", object())
    monkeypatch.setitem(sys.modules, "app.connections", object())
    monkeypatch.setitem(sys.modules, "app.TORTOISE_ORM", {})
    monkeypatch.setitem(sys.modules, "app.auth", object())
    monkeypatch.setitem(sys.modules, "app.account", object())

    app = create_app()
    with TestClient(app) as c:
        yield c

def test_create_app_returns_fastapi_instance():
    app = create_app()
    assert isinstance(app, FastAPI)
    assert app.title == "Bird API"
    assert app.description == "Birdy Backend for Birdy App"
    assert app.version == "1.0.0"

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"Hello": "World"}

def test_routers_included():
    app = create_app()
    route_paths = {route.path for route in app.routes} # type: ignore
    # Root should always be there
    assert "/" in route_paths

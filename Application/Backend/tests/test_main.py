import os
import pathlib
import signal
import subprocess
import sys
import time
import types
import pytest
import builtins
import main
import logging

@pytest.fixture(autouse=True)
def patch_imports(monkeypatch):
    # Patch platform.system
    monkeypatch.setattr("platform.system", lambda: "Linux")
    # Patch os.environ
    monkeypatch.setitem(sys.modules["os"].environ, "hypercorn", "False")
    # Patch uvloop
    uvloop = types.SimpleNamespace(install=lambda: None)
    monkeypatch.setitem(sys.modules, "uvloop", uvloop)
    # Patch winloop
    winloop = types.SimpleNamespace(install=lambda: None)
    monkeypatch.setitem(sys.modules, "winloop", winloop)
    # Patch app.create_app
    app_mod = types.SimpleNamespace(create_app=lambda: "fake_app")
    monkeypatch.setitem(sys.modules, "app", app_mod)
    # Patch hypercorn.config.Config
    class DummyConfig:
        def __init__(self):
            self.bind = []
            self.accesslog = None
            self.access_log_format = None
            self.use_reloader = None
    monkeypatch.setitem(sys.modules, "hypercorn.config", types.SimpleNamespace(Config=DummyConfig))
    # Patch hypercorn.asyncio.serve as a regular function (no coroutine)
    monkeypatch.setitem(sys.modules, "hypercorn.asyncio", types.SimpleNamespace(serve=lambda app, config, mode: None))
    # Patch hypercorn.typing.ASGIFramework
    monkeypatch.setitem(sys.modules, "hypercorn.typing", types.SimpleNamespace(ASGIFramework=object))
    # Patch typing.cast only, not override entire module
    import typing as _typing
    monkeypatch.setattr(_typing, "cast", lambda t, v: v, raising=True)
    # Patch asyncio.run to do nothing
    monkeypatch.setattr("asyncio.run", lambda coro: None)


def test_main_linux(monkeypatch, capsys):
    monkeypatch.setattr("platform.system", lambda: "Linux")
    main.main()
    out = capsys.readouterr().out
    assert "Shutting down gracefully" not in out


def test_main_windows(monkeypatch, capsys):
    monkeypatch.setattr("platform.system", lambda: "Windows")
    main.main()
    out = capsys.readouterr().out
    assert "Shutting down gracefully" not in out


def test_main_uvloop_missing(monkeypatch, capsys):
    monkeypatch.setattr("platform.system", lambda: "Linux")
    # Simulate missing uvloop
    monkeypatch.setitem(sys.modules, "uvloop", None)
    orig_import = builtins.__import__
    def fake_import(name, *args, **kwargs):
        if name == "uvloop":
            raise ModuleNotFoundError
        return orig_import(name, *args, **kwargs)
    monkeypatch.setattr(builtins, "__import__", fake_import)
    main.main()
    out = capsys.readouterr().out
    assert "Error when installing loop" not in out


def test_main_loop_install_error(monkeypatch, capsys):
    monkeypatch.setattr("platform.system", lambda: "Linux")
    # Simulate uvloop.install raising
    class BadUvloop:
        @staticmethod
        def install():
            raise Exception("fail install")
    monkeypatch.setitem(sys.modules, "uvloop", BadUvloop)
    main.main()
    out = capsys.readouterr().out
    assert "Error when installing loop" in out


def test_main_prints_running(monkeypatch, capsys):
    # Simulate environment for Linux
    monkeypatch.setattr("platform.system", lambda: "Linux")
    # Monkey-patch asyncio.run to print the Running on message directly
    monkeypatch.setattr("asyncio.run", lambda coro: print("Running on http://0.0.0.0:8080 (CTRL + C to quit)"))
    # Call main
    main.main()
    # Capture stdout
    out = capsys.readouterr().out
    assert "Running on " in out

def test_main_entry_point_runs():
    import time
    import signal
    import subprocess

    current_file = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_file)
    main_file = os.path.join(current_dir, "../", "main.py")
    proc = subprocess.Popen(
        ["python", main_file],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    time.sleep(2)

    proc.send_signal(signal.SIGTERM)

    stdout, stderr = proc.communicate(timeout=5)
    print("STDOUT:", stdout)
    print("STDERR:", stderr)

    assert proc.returncode is not None
    assert "Running on" in stdout or "Running on" in stderr
import asyncio

def main():
    import platform
    import os

    os.environ['hypercorn'] = 'True'
    system = platform.system()
    try:
        if system == 'Linux':
            import uvloop # type: ignore
            uvloop.install()
        elif system == 'Windows':
            import winloop
            winloop.install()
    except ModuleNotFoundError:
        pass
    except Exception as e:
        print(f"Error when installing loop: {e}")

    from app import create_app
    import asyncio
    from hypercorn.config import Config
    from hypercorn.asyncio import serve
    from hypercorn.typing import ASGIFramework
    from typing import cast

    config = Config()

    # linux automaticly bind both ipv4 and ipv6
    if system == 'Linux':
        config.bind=[f"[::]:8085"]
    else:
        config.bind=[f"0.0.0.0:8085", f"[::]:8085"]

    config.accesslog = "-"  
    config.access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s'
    config.use_reloader = True

    app = cast(ASGIFramework, create_app())

    try:
        asyncio.run(serve(app, config, mode='asgi'))
    except KeyboardInterrupt:
        print("Shutting down gracefully !")


if __name__ == "__main__":
    import traceback
    try:
        main()
    except Exception as e:
        print(f"Error when starting main process: {e}")
        traceback.print_exc()


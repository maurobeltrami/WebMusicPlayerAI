#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Custom logic to use a random port for runserver if not specified
    if 'runserver' in sys.argv:
        # Check if a port or address:port is already provided
        # args usually look like ['manage.py', 'runserver', 'optional_addr_port']
        # We want to avoid overriding if the user explicitly provided something.
        # Simple heuristic: if the last arg is 'runserver' or starts with '-', they probably didn't specific a port.
        # But runserver can accept options like --noreload.
        # Let's check if any arg looks like a port or address:port. 
        # Actually easier: just append the port if the number of args is such that a port is missing.
        # Standard runserver args: manage.py runserver [addrport]
        
        has_addrport = False
        for arg in sys.argv[2:]:
            if not arg.startswith('-'):
                has_addrport = True
                break
        
        if not has_addrport:
            import random
            port = random.randint(8001, 9000)
            print(f"Starting server on random port: {port}")
            sys.argv.append(str(port))

    execute_from_command_line(sys.argv)
    
if __name__ == '__main__':
    main()

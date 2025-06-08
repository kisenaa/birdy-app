import os
from dotenv import load_dotenv
load_dotenv() 

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES = 120  # 2 Hours
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days
ALGORITHM = "HS256"
JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']   # should be kept secret
JWT_REFRESH_SECRET_KEY = os.environ['JWT_REFRESH_SECRET_KEY']    # should be kept secret

# Database Postgre SQL
DB_USERNAME = os.environ['DB_USERNAME']
DB_PASSWORD = os.environ['DB_PASSWORD']
DB_IP   = os.environ['DB_IP']
DB_PORT = os.environ['DB_PORT']
DB_NAME = os.environ['DB_NAME']

# Init DB First Time or Migrations : 
'''
    RUN from root directory: 
    comment out all models in database/models.py
    aerich init -t config.TORTOISE_ORM
    aerich init-db 
    restore all models in database/models.py
'''
# Run migrations if there any change or after init db
# aerich migrate --name {description}
# python .\database\patch_migration.py .\migrations\models\
# aerich upgrade

TORTOISE_ORM = {
    "connections": {
        "default": f"postgres://{DB_USERNAME}:{DB_PASSWORD}@{DB_IP}:{DB_PORT}/{DB_NAME}"
    },
    "apps": {
    "models": {
        "models": ["database.db_schema", "aerich.models"],
        "default_connection": "default",
    },
},
}
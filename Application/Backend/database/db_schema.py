from tortoise import fields, models

class FixedCharField(fields.CharField):
    def __init__(self, max_length: int, **kwargs):
        super().__init__(max_length=max_length, **kwargs)

    def get_db_field_type(self) -> str:
        return f"CHAR({self.max_length})"
    
    def get_db_field_types(self) -> dict[str, str]:
        return {
            "": f"CHAR({self.max_length})",           # default
            "sqlite": f"TEXT",                        # override for SQLite
            "postgres": f"CHAR({self.max_length})",   # override for Postgres
        }

class User(models.Model):
    userId = FixedCharField(max_length=26, primary_key=True)
    username = fields.CharField(max_length=64, null=True, unique=True)
    email = fields.CharField(max_length=255, unique=True)
    hashed_password = FixedCharField(max_length=97)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta: # type: ignore
        table = "users"

    @classmethod
    async def create_user(
        cls,
        userId: str,
        email: str,
        hashed_password: str
    ) -> "User":
        return await cls.create(
            userId=userId,
            email=email,
            hashed_password=hashed_password
        )

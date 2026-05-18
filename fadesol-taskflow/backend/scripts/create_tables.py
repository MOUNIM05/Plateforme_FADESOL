from app.database import Base, engine
from app.models import User


def main():
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")


if __name__ == "__main__":
    main()